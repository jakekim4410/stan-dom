import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// iTunes Search API로 앨범아트를 kpop_charts에 업데이트 (인증 불필요, 완전 무료)
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: dbTracks, error: dbErr } = await supabase
    .from('kpop_charts')
    .select('id, title, artist, album_art');

  if (dbErr || !dbTracks) {
    return NextResponse.json({ error: 'DB fetch failed', detail: dbErr });
  }

  const updated: string[] = [];
  const errors: string[] = [];

  for (const track of dbTracks) {
    try {
      // iTunes Search API - 무료, 인증 불필요
      const q = encodeURIComponent(`${track.title} ${track.artist}`);
      const url = `https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=3&country=KR`;
      const res = await fetch(url);

      if (!res.ok) {
        errors.push(`iTunes HTTP ${res.status} for ${track.title}`);
        continue;
      }

      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        errors.push(`No iTunes results for: ${track.title} - ${track.artist}`);
        continue;
      }

      // 아티스트 이름이 포함된 결과 우선 선택
      const best = data.results.find((r: any) =>
        r.artistName?.toLowerCase().includes(track.artist.toLowerCase()) ||
        track.artist.toLowerCase().includes(r.artistName?.toLowerCase())
      ) || data.results[0];

      // iTunes 이미지: 기본 100x100 → 600x600으로 업그레이드
      const imgUrl = best.artworkUrl100?.replace('100x100bb', '600x600bb');

      if (imgUrl) {
        await supabase.from('kpop_charts').update({ album_art: imgUrl }).eq('id', track.id);
        updated.push(`${track.title} (${track.artist})`);
      } else {
        errors.push(`No image in iTunes result for ${track.title}`);
      }

      // iTunes API rate limit 방지
      await new Promise(r => setTimeout(r, 100));

    } catch (e: any) {
      errors.push(`Error for ${track.title}: ${e.message}`);
    }
  }

  return NextResponse.json({ updated, errors, total: dbTracks.length });
}
