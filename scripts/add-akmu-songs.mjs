import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !YOUTUBE_API_KEY) {
  console.error('Missing environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// AKMU 인기곡 4선
const AKMU_SONGS = [
  { title: '낙하 (NAKKA)', artist: 'AKMU', query: 'AKMU 낙하 NAKKA feat IU official' },
  { title: '어떻게 이별까지 사랑하겠어, 널 사랑하는 거지', artist: 'AKMU', query: 'AKMU 어떻게 이별까지 사랑하겠어 official' },
  { title: 'Happening', artist: 'AKMU', query: 'AKMU Happening official audio' },
  { title: 'Hero', artist: 'AKMU', query: 'AKMU Hero official music video' },
];

async function searchYouTube(query) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items?.[0]?.id?.videoId || '';
}

async function searchITunes(artist, title) {
  const query = encodeURIComponent(`${artist} ${title}`);
  const res = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&limit=1`);
  const data = await res.json();
  const track = data.results?.[0];
  if (track) {
    return track.artworkUrl100?.replace('100x100bb', '600x600bb') || null;
  }
  return null;
}

async function run() {
  console.log('🎵 AKMU 노래 추가 시작...');

  // 1. 기존 스테디셀러(fallback) 곡 삭제
  console.log('🗑️  기존 스테디셀러 곡 삭제 중...');
  const { data: fallbackRows, error: fetchErr } = await supabase
    .from('kpop_charts')
    .select('id, title, rank, spotify_id')
    .like('spotify_id', 'fallback_%');

  if (fetchErr) {
    console.error('Fetch error:', fetchErr.message);
    process.exit(1);
  }

  console.log(`  → ${fallbackRows.length}개 스테디셀러 발견:`, fallbackRows.map(r => `${r.rank}위 ${r.title}`).join(', '));

  if (fallbackRows.length > 0) {
    const ids = fallbackRows.map(r => r.id);
    const { error: delErr } = await supabase.from('kpop_charts').delete().in('id', ids);
    if (delErr) {
      console.error('Delete error:', delErr.message);
      process.exit(1);
    }
    console.log('  ✅ 삭제 완료');
  }

  // 2. 현재 최고 rank 파악
  const { data: ranked } = await supabase
    .from('kpop_charts')
    .select('rank')
    .order('rank', { ascending: false })
    .limit(1);
  let nextRank = (ranked?.[0]?.rank || 95) + 1;
  console.log(`  → 다음 rank 시작: ${nextRank}`);

  // 3. AKMU 4곡 YouTube + iTunes 앨범아트 조회 후 삽입
  const toInsert = [];

  for (const song of AKMU_SONGS) {
    console.log(`\n🔎 "${song.title}" 검색 중...`);

    const youtubeId = await searchYouTube(song.query);
    console.log(`  YouTube ID: ${youtubeId || '(없음)'}`);

    const albumArt = await searchITunes(song.artist, song.title);
    console.log(`  Album Art: ${albumArt ? '✅ 찾음' : '❌ 없음'}`);

    toInsert.push({
      rank: nextRank++,
      title: song.title,
      artist: song.artist,
      album_art: albumArt,
      youtube_id: youtubeId,
      spotify_id: `akmu_${song.title.replace(/\s/g, '_')}`,
      updated_at: new Date().toISOString(),
    });

    // API 과부하 방지
    await new Promise(r => setTimeout(r, 200));
  }

  // 4. 삽입
  console.log('\n💾 Supabase에 AKMU 곡 삽입 중...');
  const { error: insertErr } = await supabase.from('kpop_charts').insert(toInsert);
  if (insertErr) {
    console.error('Insert error:', insertErr.message);
    process.exit(1);
  }

  console.log('\n✨ 완료! 삽입된 AKMU 곡:');
  toInsert.forEach(s => {
    console.log(`  ${s.rank}위 ${s.title} | YT: ${s.youtube_id || '없음'}`);
  });

  // 5. 현재 총 곡수 확인
  const { count } = await supabase
    .from('kpop_charts')
    .select('*', { count: 'exact', head: true });
  console.log(`\n📊 현재 차트 총 ${count}곡`);
}

run();
