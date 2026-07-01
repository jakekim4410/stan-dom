import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ytSearch from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// HTML entity decoder
function decodeHtml(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Melon 차트 HTML에서 100곡 파싱
async function fetchMelonChart() {
  console.log('📡 멜론 차트 가져오는 중...');
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    'Referer': 'https://www.melon.com/',
    'Cache-Control': 'no-cache',
  };

  const res = await fetch('https://www.melon.com/chart/index.htm', { headers });
  if (!res.ok) throw new Error(`Melon fetch failed: ${res.status}`);
  const html = await res.text();

  const songs = [];
  const seenIds = new Set();

  // wrap_song_info 단위로 분리 (각 곡마다 하나씩 나타남)
  const blocks = html.split('class="wrap_song_info"').slice(1);

  for (const block of blocks) {
    // 곡 ID 추출
    const idMatch = block.match(/melon\.play\.playSong\('[^']*',(\d+)/);
    if (!idMatch) continue;
    const songId = idMatch[1];

    // 중복 제거 (desktop + mobile 레이아웃 중복)
    if (seenIds.has(songId)) continue;
    seenIds.add(songId);

    // 제목 추출: title 속성에서 마지막 " 재생" 제거
    const titleAttrMatch = block.match(/title="([^"]+)\s재생"/);
    if (!titleAttrMatch) {
      // fallback: text content
      const textMatch = block.match(/class="ellipsis rank01"[^>]*>[\s\S]*?>\s*([^<\n]+?)\s*<\/a>/);
      if (!textMatch) continue;
    }
    const titleKo = titleAttrMatch
      ? decodeHtml(titleAttrMatch[1])
      : '';

    if (!titleKo) continue;

    // 아티스트 추출: rank02 내 첫 번째 <a> 태그 텍스트
    const artistMatch = block.match(/class="ellipsis rank02"[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
    const artistKo = artistMatch
      ? decodeHtml(artistMatch[1])
      : '아티스트 미상';

    songs.push({ rank: songs.length + 1, songId, titleKo, artistKo });

    if (songs.length >= 100) break;
  }

  console.log(`✅ 멜론 차트에서 ${songs.length}곡 파싱 완료`);
  return songs;
}

// iTunes US 검색 → 영문 제목/아티스트/앨범아트
async function searchITunesEn(titleKo, artistKo) {
  try {
    const query = encodeURIComponent(`${artistKo} ${titleKo}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=music&limit=3&country=us`
    );
    const data = await res.json();
    const track = data.results?.[0];
    if (!track) return null;
    return {
      titleEn: track.trackName || null,
      artistEn: track.artistName || null,
      albumArt: track.artworkUrl100?.replace('100x100bb', '600x600bb') || null,
    };
  } catch {
    return null;
  }
}

// YouTube 검색 (yt-search 활용: 완전 무료, 할당량 제한 없음)
async function searchYouTube(query) {
  try {
    const result = await ytSearch(query);
    const video = result.videos?.[0];
    return video ? video.videoId : '';
  } catch {
    return '';
  }
}

async function main() {
  console.log('🎵 멜론 TOP 100 이중언어 업데이트 시작...\n');

  // 1. 멜론 차트 파싱
  const melonSongs = await fetchMelonChart();
  if (melonSongs.length === 0) {
    console.error('❌ 멜론 파싱 실패. 중단합니다.');
    process.exit(1);
  }

  // 2. 기존 YouTube ID 맵 로드 (재사용으로 API 절약)
  console.log('\n🔍 기존 YouTube ID 로드...');
  const { data: existingChart } = await supabase
    .from('kpop_charts')
    .select('title, artist, youtube_id');
  const ytMap = new Map();
  if (existingChart) {
    existingChart.forEach(row => {
      if (row.youtube_id?.trim()) {
        const key = `${row.title.toLowerCase().trim()}_${row.artist.toLowerCase().trim()}`;
        ytMap.set(key, row.youtube_id);
      }
    });
  }
  console.log(`  ✅ ${ytMap.size}개 기존 YouTube ID 로드됨`);

  // 3. 각 곡 처리
  console.log('\n🔄 각 곡 영문화 + YouTube 처리...');
  const chartData = [];

  for (let i = 0; i < melonSongs.length; i++) {
    const { rank, titleKo, artistKo } = melonSongs[i];

    // iTunes 영문 정보 검색
    const itunes = await searchITunesEn(titleKo, artistKo);
    const titleEn = itunes?.titleEn || titleKo; // 못 찾으면 한글 그대로
    const artistEn = itunes?.artistEn || artistKo;
    const albumArt = itunes?.albumArt || null;

    // YouTube ID: 기존 DB에서 먼저 찾기 (한글/영문 모두 시도)
    const keyKo = `${titleKo.toLowerCase().trim()}_${artistKo.toLowerCase().trim()}`;
    const keyEn = `${titleEn.toLowerCase().trim()}_${artistEn.toLowerCase().trim()}`;
    let youtubeId = ytMap.get(keyKo) || ytMap.get(keyEn) || '';

    if (!youtubeId) {
      // YouTube 검색 (영문 우선, 영문이 한글과 같으면 한글로 검색)
      const searchQ = titleEn !== titleKo
        ? `${artistEn} ${titleEn} official`
        : `${artistKo} ${titleKo} 공식`;
      console.log(`  🔎 [${rank}위] YouTube 검색: ${searchQ}`);
      youtubeId = await searchYouTube(searchQ);
      await new Promise(r => setTimeout(r, 100));
    }

    // spotify_id 필드에 영문 정보 JSON으로 저장 (스키마 변경 없이 이중언어 지원)
    // Melon songId를 포함해 UNIQUE 제약 위반 방지
    const { songId } = melonSongs[i];
    const bilingualMeta = JSON.stringify({
      en_t: titleEn !== titleKo ? titleEn : undefined,
      en_a: artistEn !== artistKo ? artistEn : undefined,
      _mid: songId, // Melon song ID → 고유값 보장
    });

    chartData.push({
      rank,
      title: titleKo,         // 기본값: 한글 (KO 사용자용)
      artist: artistKo,       // 기본값: 한글 아티스트 (KO 사용자용)
      album_art: albumArt,
      youtube_id: youtubeId,
      spotify_id: bilingualMeta,  // 영문 정보 JSON 저장
      updated_at: new Date().toISOString(),
    });

    if ((i + 1) % 20 === 0) {
      console.log(`  ⏳ 진행: ${i + 1}/${melonSongs.length}`);
    }
  }

  // 4. DB 업데이트
  console.log('\n💾 Supabase 업데이트 중...');

  const { error: deleteError } = await supabase
    .from('kpop_charts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

  const { error: insertError } = await supabase
    .from('kpop_charts')
    .insert(chartData);

  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

  console.log(`\n✨ 완료! ${chartData.length}곡 업데이트됨 (출처: 멜론 TOP 100)`);
  console.log('\n🎵 상위 10곡:');
  chartData.slice(0, 10).forEach(s => {
    let meta = {};
    try { meta = JSON.parse(s.spotify_id); } catch {}
    console.log(`  ${String(s.rank).padStart(2)} 위  ${s.title}${meta.en_t ? ` / ${meta.en_t}` : ''}  —  ${s.artist}${meta.en_a ? ` / ${meta.en_a}` : ''}`);
  });
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
