import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/yt-fallback?title=MAGNETIC&artist=ILLIT
 *
 * 캐싱 전략 (YouTube API 할당량 절약):
 *   1. Supabase kpop_charts에서 title+artist 매칭 → 저장된 fallback_youtube_id 반환 (0 API 호출)
 *   2. 없으면 YouTube Data API v3로 검색
 *   3. 찾으면 → DB에 fallback_youtube_id 저장 (다음 요청부터 DB hit)
 *   4. Vercel CDN에 24시간 응답 캐싱 (같은 URL 재요청 시 0 API 호출)
 */

const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YT_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const API_KEY = process.env.YOUTUBE_API_KEY!;

// 24시간 CDN 캐시 헤더
const CACHE_HIT_HEADERS  = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600', 'X-Cache': 'HIT' };
const CACHE_MISS_HEADERS = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600', 'X-Cache': 'MISS' };
const NO_CACHE_HEADERS   = { 'Cache-Control': 'public, s-maxage=300',  'X-Cache': 'MISS' }; // 실패 시 5분만

async function getEmbeddableId(query: string): Promise<string | null> {
  // 1. 검색 (개별 fetch 캐시 24시간)
  const searchRes = await fetch(
    `${YT_SEARCH_URL}?part=id&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${API_KEY}&videoEmbeddable=true`,
    { next: { revalidate: 86400 } }
  );
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const ids: string[] = (searchData.items || []).map((item: any) => item.id?.videoId).filter(Boolean);
  if (ids.length === 0) return null;

  // 2. embeddable 여부 확인
  const detailRes = await fetch(
    `${YT_VIDEOS_URL}?part=status&id=${ids.join(',')}&key=${API_KEY}`,
    { next: { revalidate: 86400 } }
  );
  if (!detailRes.ok) return ids[0];
  const detailData = await detailRes.json();
  const embeddable = (detailData.items || []).find((v: any) => v.status?.embeddable === true);
  return embeddable?.id ?? ids[0];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title  = searchParams.get('title')  || '';
  const artist = searchParams.get('artist') || '';

  if (!title) {
    return NextResponse.json({ id: null }, { status: 400 });
  }

  // ─── Supabase 클라이언트 (anon key — public read/write 허용 전제) ───────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ─── 1단계: DB 캐시 확인 ─────────────────────────────────────────────────────
  // kpop_charts 테이블에서 title+artist 일치하는 행의 fallback_youtube_id 조회
  const { data: cached } = await supabase
    .from('kpop_charts')
    .select('fallback_youtube_id, youtube_id')
    .ilike('title',  title)
    .ilike('artist', `%${artist}%`)
    .limit(1)
    .single();

  if (cached?.fallback_youtube_id) {
    // DB에 캐시된 fallback ID가 있으면 즉시 반환 (YouTube API 0 호출)
    console.info(`[yt-fallback] DB cache HIT for "${title}" → ${cached.fallback_youtube_id}`);
    return NextResponse.json(
      { id: cached.fallback_youtube_id, source: 'db-cache' },
      { headers: CACHE_HIT_HEADERS }
    );
  }

  // ─── 2단계: YouTube Data API 검색 ────────────────────────────────────────────
  const queries = [
    `${artist} ${title} official audio`,
    `${artist} ${title} lyrics`,
    `${artist} ${title}`,
  ];

  let foundId: string | null = null;
  let foundQuery = '';

  for (const q of queries) {
    const id = await getEmbeddableId(q);
    if (id) {
      foundId    = id;
      foundQuery = q;
      break;
    }
  }

  if (!foundId) {
    console.warn(`[yt-fallback] No embeddable video found for "${title}"`);
    return NextResponse.json({ id: null }, { headers: NO_CACHE_HEADERS });
  }

  // ─── 3단계: DB에 fallback ID 저장 (비동기 — 응답 속도에 영향 없음) ───────────
  // fallback_youtube_id 컬럼이 없으면 그냥 무시됨 (에러 로깅만)
  supabase
    .from('kpop_charts')
    .update({ fallback_youtube_id: foundId })
    .ilike('title',  title)
    .ilike('artist', `%${artist}%`)
    .then(({ error }) => {
      if (error) {
        // 컬럼이 없는 경우엔 조용히 넘어감 (마이그레이션 전까지)
        console.info(`[yt-fallback] DB update skipped (column may not exist yet): ${error.message}`);
      } else {
        console.info(`[yt-fallback] DB cached fallback for "${title}": ${foundId}`);
      }
    });

  console.info(`[yt-fallback] YouTube API hit for "${title}" → ${foundId} (query: ${foundQuery})`);
  return NextResponse.json(
    { id: foundId, query: foundQuery, source: 'youtube-api' },
    { headers: CACHE_MISS_HEADERS }
  );
}
