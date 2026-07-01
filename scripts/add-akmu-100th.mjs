import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function run() {
  const song = { title: '어른 (Grown Up)', artist: 'AKMU', query: 'AKMU 어른 Grown Up official music video' };

  console.log(`🔎 "${song.title}" 검색 중...`);

  // YouTube 검색
  const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(song.query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`);
  const ytData = await ytRes.json();
  const youtubeId = ytData.items?.[0]?.id?.videoId || '';
  console.log('  YouTube ID:', youtubeId);

  // iTunes 앨범아트
  const itRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent('AKMU 어른')}&media=music&limit=1`);
  const itData = await itRes.json();
  const albumArt = itData.results?.[0]?.artworkUrl100?.replace('100x100bb', '600x600bb') || null;
  console.log('  Album Art:', albumArt ? '✅ 찾음' : '❌ 없음');

  // 삽입
  const { error } = await supabase.from('kpop_charts').insert({
    rank: 100,
    title: song.title,
    artist: song.artist,
    album_art: albumArt,
    youtube_id: youtubeId,
    spotify_id: 'akmu_어른',
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error('Insert error:', error.message);
    process.exit(1);
  }

  console.log('\n✅ 100위 어른 (Grown Up) 추가 완료!');

  const { count } = await supabase.from('kpop_charts').select('*', { count: 'exact', head: true });
  console.log(`📊 현재 차트 총 ${count}곡`);
}

run();
