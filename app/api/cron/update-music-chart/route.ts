import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // 2. Spotify Access Token 가져오기
    const spotifyToken = await getSpotifyToken();
    
    // 3. Spotify K-Pop ON! 플레이리스트 가져오기 (Top 50)
    // Playlist ID: 37i9dQZF1DX4JAvhLs9Zqr
    const playlistRes = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX4JAvhLs9Zqr/tracks?limit=50', {
      headers: { 'Authorization': `Bearer ${spotifyToken}` }
    });
    const playlistData = await playlistRes.json();
    const tracks = playlistData.items || [];

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    const chartData = [];

    // 4. 각 트랙별 유튜브 매핑 및 데이터 준비
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i].track;
      if (!track) continue;

      const artistName = track.artists[0].name;
      const trackTitle = track.name;
      const spotifyId = track.id;
      const albumArt = track.album.images[0]?.url;
      const previewUrl = track.preview_url;

      // 유튜브 비디오 ID 검색 (간단한 검색 쿼리 사용)
      const searchQuery = `${artistName} ${trackTitle} official audio`;
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
      );
      const ytData = await ytRes.json();
      const youtubeId = ytData.items?.[0]?.id?.videoId || '';

      chartData.push({
        rank: i + 1,
        title: trackTitle,
        artist: artistName,
        album_art: albumArt,
        youtube_id: youtubeId,
        spotify_id: spotifyId,
        preview_url: previewUrl,
        updated_at: new Date().toISOString()
      });

      // API 할당량 보호를 위해 짧은 지연 (선택 사항)
      // await new Promise(res => setTimeout(res, 100));
    }

    // 5. Supabase에 테이블 데이터 업데이트 (Upsert)
    // 주의: kpop_charts 테이블이 미리 생성되어 있어야 합니다.
    const { error: upsertError } = await supabase
      .from('kpop_charts')
      .upsert(chartData, { onConflict: 'spotify_id' });

    if (upsertError) {
      console.error('[CRON] Database upsert failed:', upsertError);
      return NextResponse.json({ error: 'Database update failed', details: upsertError }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: chartData.length,
      message: 'Successfully updated K-Pop chart from Spotify & YouTube'
    });

  } catch (error: any) {
    console.error('[CRON] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getSpotifyToken() {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  return data.access_token;
}
