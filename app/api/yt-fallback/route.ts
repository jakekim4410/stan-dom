import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/yt-fallback?title=MAGNETIC&artist=ILLIT
 *
 * Searches YouTube Data API v3 for an embeddable video of the given track.
 * Tries in order:
 *   1. "{artist} {title} official audio"
 *   2. "{artist} {title} lyrics"
 *   3. "{artist} {title} topic"
 *
 * Returns the first embeddable video ID found, or null.
 */

const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YT_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const API_KEY = process.env.YOUTUBE_API_KEY!;

async function getEmbeddableId(query: string): Promise<string | null> {
  // 1. Search for videos
  const searchRes = await fetch(
    `${YT_SEARCH_URL}?part=id&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${API_KEY}&videoEmbeddable=true`,
    { next: { revalidate: 3600 } } // 1시간 캐시
  );
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const ids: string[] = (searchData.items || []).map((item: any) => item.id?.videoId).filter(Boolean);
  if (ids.length === 0) return null;

  // 2. Check embeddable status (status.embeddable)
  const detailRes = await fetch(
    `${YT_VIDEOS_URL}?part=status&id=${ids.join(',')}&key=${API_KEY}`,
    { next: { revalidate: 3600 } }
  );
  if (!detailRes.ok) return ids[0]; // fallback
  const detailData = await detailRes.json();
  const embeddable = (detailData.items || []).find((v: any) => v.status?.embeddable === true);
  return embeddable?.id ?? ids[0]; // embeddable 찾으면 반환, 아니면 첫 번째
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';

  if (!title) {
    return NextResponse.json({ id: null }, { status: 400 });
  }

  const queries = [
    `${artist} ${title} official audio`,
    `${artist} ${title} lyrics`,
    `${artist} ${title}`,
  ];

  for (const q of queries) {
    const id = await getEmbeddableId(q);
    if (id) {
      return NextResponse.json({ id, query: q });
    }
  }

  return NextResponse.json({ id: null });
}
