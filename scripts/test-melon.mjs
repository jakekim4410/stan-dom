import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testMelon() {
  console.log('🧪 Melon 차트 접근 테스트...\n');
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    'Referer': 'https://www.melon.com/',
  };

  // Test 1: Melon chart HTML
  try {
    console.log('Test 1: Melon 차트 HTML...');
    const res = await fetch('https://www.melon.com/chart/index.htm', { headers });
    console.log('  Status:', res.status);
    const text = await res.text();
    
    // Extract song data
    const rankMatches = [...text.matchAll(/class="rank_wrap">[\s\S]*?<span class="rank">([\d]+)<\/span>/g)];
    const titleMatches = [...text.matchAll(/class="ellipsis rank01">[\s\S]*?title="([^"]+)"/g)];
    const artistMatches = [...text.matchAll(/class="ellipsis rank02">[\s\S]*?<span>([^<]+)<\/span>/g)];
    
    console.log('  랭크 파싱:', rankMatches.length);
    console.log('  타이틀 파싱:', titleMatches.length);
    console.log('  아티스트 파싱:', artistMatches.length);
    
    if (titleMatches.length > 0) {
      console.log('  샘플:', titleMatches.slice(0, 3).map(m => m[1]));
    }
    
    // Save first 5000 chars for inspection
    console.log('\n  HTML 샘플 (처음 2000자):');
    console.log(text.substring(0, 2000));
    
  } catch (e) {
    console.log('  ❌ Error:', e.message);
  }

  // Test 2: Melon Chart API endpoint
  try {
    console.log('\nTest 2: Melon 차트 JSON API...');
    const res2 = await fetch('https://www.melon.com/chart/day/index.htm?classCd=ALL&startIndex=1&pageSize=10&menuid=200&sort=SONGCNT', { headers });
    console.log('  Status:', res2.status);
    const ct = res2.headers.get('content-type');
    console.log('  Content-Type:', ct);
    const text2 = await res2.text();
    console.log('  Response (처음 500자):', text2.substring(0, 500));
  } catch (e) {
    console.log('  ❌ Error:', e.message);
  }
  
  // Test 3: iTunes KR chart
  try {
    console.log('\nTest 3: iTunes KR K-Pop chart...');
    const res3 = await fetch('https://itunes.apple.com/kr/rss/topsongs/limit=10/genre=51/json');
    console.log('  Status:', res3.status);
    const data3 = await res3.json();
    const tracks3 = data3.feed?.entry || [];
    console.log('  트랙 수:', tracks3.length);
    if (tracks3.length > 0) {
      console.log('  샘플:');
      tracks3.slice(0, 5).forEach((t, i) => {
        console.log(`    ${i+1}. ${t['im:artist']?.label} - ${t['im:name']?.label}`);
      });
    }
  } catch (e) {
    console.log('  ❌ Error:', e.message);
  }
}

testMelon();
