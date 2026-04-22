import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 뉴스 기사의 youtube_id를 기사 제목에 맞게 다시 검색해서 업데이트
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  const results: Record<string, string> = {};
  const errors: string[] = [];

  // 최근 기사 6개 가져오기
  const { data: articles, error: dbErr } = await supabase
    .from('hot_issues')
    .select('id, headline')
    .order('published_at', { ascending: false })
    .limit(6);

  if (dbErr || !articles) {
    return NextResponse.json({ error: 'DB fetch failed', detail: dbErr }, { status: 500 });
  }

  for (const a of articles) {
    try {
      // headline은 {EN, KO, ES} JSON 객체 - EN 제목 사용
      const titleEN = typeof a.headline === 'object' ? a.headline?.EN : a.headline;
      const query = encodeURIComponent(`${titleEN} K-POP MV`);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url);

      if (!res.ok) {
        const txt = await res.text();
        errors.push(`YT API Error for "${titleEN}": ${res.status} ${txt.slice(0, 100)}`);
        continue;
      }

      const data = await res.json();

      if (data.error) {
        errors.push(`YT quota/error for "${titleEN}": ${JSON.stringify(data.error).slice(0, 150)}`);
        continue;
      }

      if (!data.items || data.items.length === 0) {
        errors.push(`No results for "${titleEN}"`);
        continue;
      }

      // 공식 MV나 쇼케이스 영상 우선 선택 (official, mv, live 포함된 영상)
      const preferred = data.items.find((item: any) => {
        const t = (item.snippet.title || '').toLowerCase();
        return t.includes('official') || t.includes('mv') || t.includes('m/v');
      });
      const vid = (preferred || data.items[0]).id.videoId;

      await supabase.from('hot_issues').update({ video_id: vid }).eq('id', a.id);
      results[titleEN] = vid;
    } catch (e: any) {
      errors.push(`Exception: ${e.message}`);
    }
  }

  return NextResponse.json({ updated: results, errors });
}
