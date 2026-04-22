/**
 * fix_youtube_ids.ts
 * 
 * kpop_charts 테이블의 youtube_id를 임베딩 가능한 영상으로 업데이트합니다.
 * YouTube Data API v3를 사용하여 "official audio" / "topic" 버전을 검색합니다.
 * 
 * 실행: npx ts-node -e "require('./scripts/fix_youtube_ids.ts')"
 * 또는 그냥 이 스크립트의 fetch 코드를 복사해 /api/fix-charts 라우트로 실행
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const YT_KEY       = process.env.YOUTUBE_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const YT_SEARCH = 'https://www.googleapis.com/youtube/v3/search';
const YT_VIDEOS = 'https://www.googleapis.com/youtube/v3/videos';

async function findEmbeddableId(title: string, artist: string): Promise<string | null> {
  const queries = [
    `${artist} ${title} official audio`,
    `${artist} ${title} audio`,
    `${artist} ${title} lyrics`,
    `${artist} - ${title}`,
  ];

  for (const q of queries) {
    const res = await fetch(
      `${YT_SEARCH}?part=id&type=video&maxResults=8&q=${encodeURIComponent(q)}&key=${YT_KEY}&videoEmbeddable=true`
    );
    if (!res.ok) continue;
    const data = await res.json();
    const ids: string[] = (data.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
    if (ids.length === 0) continue;

    // 임베딩 가능 여부 확인
    const vRes = await fetch(
      `${YT_VIDEOS}?part=status,snippet&id=${ids.join(',')}&key=${YT_KEY}`
    );
    if (!vRes.ok) { return ids[0]; }
    const vData = await vRes.json();
    
    for (const v of vData.items || []) {
      if (v.status?.embeddable) {
        console.log(`  ✅ Found: "${v.snippet?.title}" (query: ${q})`);
        return v.id;
      }
    }
  }
  return null;
}

async function main() {
  console.log('🎵 Fetching kpop_charts from Supabase...');
  const { data: tracks, error } = await supabase
    .from('kpop_charts')
    .select('id, rank, title, artist, youtube_id')
    .order('rank', { ascending: true });

  if (error || !tracks) {
    console.error('Failed to fetch tracks:', error);
    process.exit(1);
  }

  console.log(`Found ${tracks.length} tracks. Starting YouTube ID update...\n`);

  for (const track of tracks) {
    console.log(`[${String(track.rank).padStart(2, '0')}] ${track.title} - ${track.artist}`);
    console.log(`     Current ID: ${track.youtube_id}`);

    // 현재 ID 임베딩 가능 여부 먼저 체크
    try {
      const checkRes = await fetch(
        `${YT_VIDEOS}?part=status&id=${track.youtube_id}&key=${YT_KEY}`
      );
      const checkData = await checkRes.json();
      const currentEmbeddable = checkData.items?.[0]?.status?.embeddable;

      if (currentEmbeddable === true) {
        console.log(`     ✅ Already embeddable — skipping\n`);
        continue;
      }
    } catch (e) { /* 체크 실패시 계속 진행 */ }

    // 새 ID 찾기
    const newId = await findEmbeddableId(track.title, track.artist);
    if (!newId) {
      console.log(`     ❌ No embeddable video found\n`);
      continue;
    }

    if (newId === track.youtube_id) {
      console.log(`     ✅ Same ID — skipping\n`);
      continue;
    }

    // DB 업데이트
    const { error: updateErr } = await supabase
      .from('kpop_charts')
      .update({ youtube_id: newId })
      .eq('id', track.id);

    if (updateErr) {
      console.log(`     ❌ Update failed: ${updateErr.message}\n`);
    } else {
      console.log(`     🔄 Updated: ${track.youtube_id} → ${newId}\n`);
    }

    // YouTube API rate limit 방지 (1초 대기)
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
