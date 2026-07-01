import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ytSearch from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('🔍 YouTube ID 누락 곡 복구 시작 (yt-search 활용)...');

  // youtube_id가 비어있는 곡 찾기
  const { data: missing, error } = await supabase
    .from('kpop_charts')
    .select('id, title, artist, spotify_id, rank')
    .or('youtube_id.eq.,youtube_id.is.null')
    .order('rank', { ascending: true });

  if (error) {
    console.error('DB Error:', error.message);
    process.exit(1);
  }

  console.log(`✅ ${missing.length}개의 곡이 YouTube ID가 없습니다.`);

  for (let i = 0; i < missing.length; i++) {
    const song = missing[i];
    
    // 영어 메타데이터 파싱
    let titleEn = song.title;
    let artistEn = song.artist;
    try {
      const meta = JSON.parse(song.spotify_id || '{}');
      if (meta.en_t) titleEn = meta.en_t;
      if (meta.en_a) artistEn = meta.en_a;
    } catch {}

    const query = `${artistEn} ${titleEn} official audio`;
    console.log(`  [${song.rank}위] 검색 중: ${query}`);

    try {
      const result = await ytSearch(query);
      const video = result.videos?.[0]; // 첫 번째 비디오 가져오기
      if (video) {
        console.log(`    ➔ 찾음! ID: ${video.videoId} (${video.title})`);
        
        // DB 업데이트
        await supabase
          .from('kpop_charts')
          .update({ youtube_id: video.videoId })
          .eq('id', song.id);
      } else {
        console.log(`    ➔ ❌ 검색 결과 없음`);
      }
    } catch (e) {
      console.log(`    ➔ ❌ 검색 오류: ${e.message}`);
    }

    // 약간의 딜레이
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('✨ 모든 복구 작업 완료!');
}

run();
