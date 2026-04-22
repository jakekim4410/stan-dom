import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/yt-test?secret=...&q=MAGNETIC+ILLIT
 * YouTube API 연결 및 검색 결과 디버그
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q') || 'ILLIT Magnetic official audio';
  const YT_KEY = process.env.YOUTUBE_API_KEY;

  if (!YT_KEY) {
    return NextResponse.json({ error: 'No YouTube API key' }, { status: 500 });
  }

  // 1. 검색
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&type=video&maxResults=5&q=${encodeURIComponent(q)}&key=${YT_KEY}&videoEmbeddable=true`;
  const sRes = await fetch(searchUrl, { cache: 'no-store' });
  const sData = await sRes.json();

  if (!sRes.ok) {
    return NextResponse.json({ error: 'Search API error', details: sData }, { status: 500 });
  }

  const items = sData.items || [];
  if (!items.length) {
    return NextResponse.json({ message: 'No results', query: q, sData });
  }

  const ids = items.map((i: any) => i.id?.videoId).filter(Boolean);

  // 2. 상태 확인
  const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${ids.join(',')}&key=${YT_KEY}`;
  const vRes = await fetch(vUrl, { cache: 'no-store' });
  const vData = await vRes.json();

  return NextResponse.json({
    query: q,
    searchResults: items.map((i: any) => ({
      videoId: i.id?.videoId,
      title: i.snippet?.title,
      channel: i.snippet?.channelTitle,
    })),
    statusCheck: (vData.items || []).map((v: any) => ({
      id: v.id,
      title: v.snippet?.title,
      embeddable: v.status?.embeddable,
      privacyStatus: v.status?.privacyStatus,
    })),
  });
}
