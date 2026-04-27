import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Vercel Hobby tier maximum
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // 1. 보안 인가
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. iTunes RSS Top K-Pop Songs (US, Genre 51 = K-Pop) 가져오기
    const itunesRes = await fetch('https://itunes.apple.com/us/rss/topsongs/limit=100/genre=51/json');
    if (!itunesRes.ok) throw new Error('iTunes API failed');
    
    const itunesData = await itunesRes.json();
    const tracks = itunesData.feed?.entry || [];

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    const chartData = [];

    // 3. 각 트랙별 유튜브 매핑 및 데이터 준비
    for (let i = 0; i < tracks.length; i++) {
      const entry = tracks[i];
      const trackTitle = entry['im:name']?.label;
      const artistName = entry['im:artist']?.label;
      const albumArtRaw = entry['im:image']?.[2]?.label || entry['im:image']?.[0]?.label;
      const albumArt = albumArtRaw ? albumArtRaw.replace('170x170bb', '600x600bb') : null;
      
      // iTunes 고유 ID
      const itunesId = entry.id?.attributes?.['im:id'] || `itunes_${i}`;

      // 유튜브 비디오 ID 검색 (간단한 검색 쿼리 사용)
      const searchQuery = `${artistName} ${trackTitle} official audio`;
      let youtubeId = '';
      try {
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
        );
        const ytData = await ytRes.json();
        youtubeId = ytData.items?.[0]?.id?.videoId || '';
      } catch (e) {
        console.warn(`YT Fetch failed for ${trackTitle}`, e);
      }

      chartData.push({
        rank: i + 1,
        title: trackTitle,
        artist: artistName,
        album_art: albumArt,
        youtube_id: youtubeId,
        spotify_id: itunesId, // 컬럼명 재활용
        updated_at: new Date().toISOString()
      });

      // API 할당량 보호를 위해 짧은 지연
      await new Promise(res => setTimeout(res, 50));
    }

    // 4. 안전 검사: 데이터가 없으면 기존 데이터를 지우지 않고 중단
    if (chartData.length === 0) {
      console.error('[CRON] No tracks to update. Aborting to protect existing data.');
      return NextResponse.json({ error: 'No tracks found from iTunes' }, { status: 500 });
    }

    // 5. Supabase 기존 데이터 전체 삭제 후 새로운 순위 삽입 (단순 교체)
    // - onConflict 문제 방지 및 깔끔한 갱신을 위해 전부 지우고 새로 넣습니다
    await supabase.from('kpop_charts').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    const { error: insertError } = await supabase
      .from('kpop_charts')
      .insert(chartData);

    if (insertError) {
      console.error('[CRON] Database insert failed:', insertError);
      return NextResponse.json({ error: 'Database update failed', details: insertError }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: chartData.length,
      message: 'Successfully updated K-Pop chart from iTunes & YouTube'
    });

  } catch (error: any) {
    console.error('[CRON] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

