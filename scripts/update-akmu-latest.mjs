import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// 2026년 AKMU 개화 앨범 - 실제 멜론 차트 인기곡
const AKMU_LATEST = [
  {
    title: '기쁨, 슬픔, 아름다운 마음',
    artist: 'AKMU',
    query: 'AKMU 기쁨 슬픔 아름다운 마음 개화 official',
    itunesQuery: 'AKMU 기쁨 슬픔 아름다운 마음',
  },
  {
    title: '소문의 낙원',
    artist: 'AKMU',
    query: 'AKMU 소문의낙원 Paradise of Rumors official',
    itunesQuery: 'AKMU 소문의 낙원',
  },
  {
    title: '봄 색깔',
    artist: 'AKMU',
    query: 'AKMU 봄 색깔 개화 FLOWERING official',
    itunesQuery: 'AKMU 봄 색깔',
  },
  {
    title: '텐트 (Tent)',
    artist: 'AKMU',
    query: 'AKMU Tent 텐트 개화 FLOWERING official',
    itunesQuery: 'AKMU Tent',
  },
  {
    title: '어린 부부',
    artist: 'AKMU',
    query: 'AKMU 어린 부부 개화 FLOWERING official',
    itunesQuery: 'AKMU 어린 부부',
  },
];

async function searchYouTube(query) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const item = data.items?.[0];
  return {
    id: item?.id?.videoId || '',
    thumbnail: item?.snippet?.thumbnails?.high?.url || null,
  };
}

async function searchITunes(query) {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=3&country=kr`);
  const data = await res.json();
  // AKMU 관련 결과 필터
  const track = data.results?.find(r =>
    r.artistName?.includes('AKMU') || r.artistName?.includes('악동뮤지션')
  ) || data.results?.[0];
  return track?.artworkUrl100?.replace('100x100bb', '600x600bb') || null;
}

async function run() {
  console.log('🎵 AKMU 최신곡 (개화 앨범) 업데이트 시작...\n');

  // 1. 기존 AKMU 곡 전부 삭제 (spotify_id가 akmu_로 시작하는 것)
  console.log('🗑️  기존 AKMU 곡 삭제 중...');
  const { data: akmuRows, error: fetchErr } = await supabase
    .from('kpop_charts')
    .select('id, title, rank, spotify_id')
    .like('spotify_id', 'akmu_%');

  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }

  console.log(`  → ${akmuRows.length}개 발견:`, akmuRows.map(r => `${r.rank}위 ${r.title}`).join(', '));

  if (akmuRows.length > 0) {
    const ids = akmuRows.map(r => r.id);
    const { error: delErr } = await supabase.from('kpop_charts').delete().in('id', ids);
    if (delErr) { console.error('Delete error:', delErr.message); process.exit(1); }
    console.log('  ✅ 삭제 완료\n');
  }

  // 2. 현재 최대 rank 파악
  const { data: ranked } = await supabase
    .from('kpop_charts')
    .select('rank')
    .order('rank', { ascending: false })
    .limit(1);
  let nextRank = (ranked?.[0]?.rank || 95) + 1;
  console.log(`  → 다음 rank 시작: ${nextRank}\n`);

  // 3. 개화 앨범 최신곡 YouTube + iTunes 조회
  const toInsert = [];

  for (const song of AKMU_LATEST) {
    console.log(`🔎 "${song.title}" 검색 중...`);

    const yt = await searchYouTube(song.query);
    console.log(`  YouTube ID: ${yt.id || '(없음)'}`);

    let albumArt = await searchITunes(song.itunesQuery);
    // iTunes에서 못 찾으면 YouTube 썸네일로 fallback
    if (!albumArt && yt.thumbnail) {
      albumArt = yt.thumbnail;
      console.log(`  Album Art: ⚠️  iTunes 실패 → YouTube 썸네일 사용`);
    } else {
      console.log(`  Album Art: ${albumArt ? '✅ iTunes' : '❌ 없음'}`);
    }

    toInsert.push({
      rank: nextRank++,
      title: song.title,
      artist: song.artist,
      album_art: albumArt,
      youtube_id: yt.id,
      spotify_id: `akmu_2026_${song.title.replace(/[\s,()]/g, '_')}`,
      updated_at: new Date().toISOString(),
    });

    await new Promise(r => setTimeout(r, 200));
    console.log('');
  }

  // 4. 삽입
  console.log('💾 Supabase 삽입 중...');
  const { error: insertErr } = await supabase.from('kpop_charts').insert(toInsert);
  if (insertErr) { console.error('Insert error:', insertErr.message); process.exit(1); }

  console.log('\n✨ 완료! 추가된 AKMU 개화 앨범 곡:');
  toInsert.forEach(s => {
    console.log(`  ${s.rank}위 ${s.title} | YT: ${s.youtube_id || '없음'} | Art: ${s.album_art ? '✅' : '❌'}`);
  });

  const { count } = await supabase.from('kpop_charts').select('*', { count: 'exact', head: true });
  console.log(`\n📊 현재 차트 총 ${count}곡`);
}

run();
