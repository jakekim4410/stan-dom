import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // 1. 현재 DB 컬럼 확인 (첫 번째 row)
  console.log('=== 현재 DB 컬럼 구조 ===');
  const { data, error } = await supabase.from('kpop_charts').select('*').limit(1).single();
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('현재 컬럼:', Object.keys(data));
    console.log('샘플 데이터:', data);
  }

  // 2. title_ko 컬럼이 있는지 확인
  const hasKoColumn = data && 'title_ko' in data;
  console.log('\ntitle_ko 컬럼 존재:', hasKoColumn);
  const hasArtistKo = data && 'artist_ko' in data;
  console.log('artist_ko 컬럼 존재:', hasArtistKo);

  // 3. Melon 차트 파싱 테스트
  console.log('\n=== Melon 차트 파싱 테스트 ===');
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://www.melon.com/',
  };

  const res = await fetch('https://www.melon.com/chart/index.htm', { headers });
  const html = await res.text();
  
  // 멜론 HTML에서 곡 데이터 파싱 - 정밀 패턴
  // 실제 멜론 차트 HTML 구조 분석
  const songBlocks = html.match(/class="wrap_song_info"[\s\S]*?class="ellipsis rank01"[\s\S]*?class="ellipsis rank02"[\s\S]*?<\/div>/g) || [];
  console.log('wrap_song_info 블록 수:', songBlocks.length);
  
  // 방법 2: 링크 기반 파싱
  // song title from: <a ... title="SONG_TITLE">
  // artist from: <div class="ellipsis rank02">...<a ...>ARTIST</a>
  
  // 멜론 데이터 추출 - 다른 접근
  const rows = html.split('class="wrap_song_info"').slice(1);
  console.log('행 수:', rows.length);
  
  if (rows.length > 0) {
    const sample = rows[0];
    console.log('\n첫 번째 행 원문 (300자):');
    console.log(sample.substring(0, 300));
    
    // 제목 추출 시도
    const titleMatch = sample.match(/class="ellipsis rank01"[^>]*>[\s\S]*?<a[^>]*title="([^"]+)"/);
    const artistMatch = sample.match(/class="ellipsis rank02"[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
    console.log('\n제목 매치:', titleMatch?.[1]);
    console.log('아티스트 매치:', artistMatch?.[1]);
  }
  
  // 방법 3: 곡 ID 기반으로 모든 song 데이터 추출
  const songIds = [...html.matchAll(/\/song\/detail\.htm\?songId=(\d+)/g)].map(m => m[1]);
  const uniqueSongIds = [...new Set(songIds)];
  console.log('\n멜론 곡 ID 수 (중복 제거):', uniqueSongIds.length);
  console.log('처음 5개 ID:', uniqueSongIds.slice(0, 5));
}

run().catch(console.error);
