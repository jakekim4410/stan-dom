import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GNEWS_API_KEY || !YOUTUBE_API_KEY || !GEMINI_API_KEY) {
  console.error('❌ Missing environment variables in .env.local. Please check:');
  console.error({
    SUPABASE_URL: !!SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
    GNEWS_API_KEY: !!GNEWS_API_KEY,
    YOUTUBE_API_KEY: !!YOUTUBE_API_KEY,
    GEMINI_API_KEY: !!GEMINI_API_KEY
  });
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const force = process.argv.includes('--force');

async function run() {
  console.log('📰 Starting manual hot issues update...');
  if (force) {
    console.log('⚠️ Running with --force flag (bypassing today\'s count checks)');
  }

  // KST 오늘 날짜 구하기
  const nowMs = Date.now();
  const kstNow = new Date(nowMs + 9 * 60 * 60 * 1000);
  const todayKST = kstNow.toISOString().split('T')[0];
  console.log(`📅 Target Date (KST): ${todayKST}`);

  // 1. 이미 오늘 기사가 생성되었는지 확인 (force가 아닐 때만)
  if (!force) {
    const { data: existingData, error: checkError } = await supabase
      .from('hot_issues')
      .select('id')
      .eq('date', todayKST);

    if (checkError) {
      console.error('❌ Error checking existing issues:', checkError);
      process.exit(1);
    }

    if (existingData && existingData.length >= 4) {
      console.log(`[CRON] Issues for ${todayKST} already generated (${existingData.length} found). Skipping.`);
      console.log('💡 Use node scripts/manual-update-hot-issues.mjs --force to run anyway.');
      return;
    }
  }

  // 2. 전체 아티스트 정보 가져오기
  console.log('🔍 Fetching artist names...');
  const { data: artistsData, error: artistError } = await supabase.from('artists').select('name');
  if (artistError) {
    console.error('❌ Error fetching artists:', artistError);
    process.exit(1);
  }

  const artistNames = (artistsData || []).map(a => {
    try {
      const parsed = typeof a.name === 'string' ? JSON.parse(a.name) : a.name;
      return parsed.EN;
    } catch (e) {
      return a.name;
    }
  }).filter(n => n);

  console.log(`✅ Loaded ${artistNames.length} artists.`);

  // 3. GNews API 연동 - 순수 K-POP 뉴스 수집
  const queries = [];
  let currentChunk = [];
  const baseQuery = ` AND (kpop OR "k-pop")`;
  
  for (const name of artistNames) {
    currentChunk.push(`"${name}"`);
    const q = `(${currentChunk.join(' OR ')})${baseQuery}`;
    if (q.length > 190) {
      currentChunk.pop();
      queries.push(`(${currentChunk.join(' OR ')})${baseQuery}`);
      currentChunk = [`"${name}"`];
    }
  }
  if (currentChunk.length > 0) {
    queries.push(`(${currentChunk.join(' OR ')})${baseQuery}`);
  }

  // Shuffle queries
  const shuffledQueries = queries.sort(() => Math.random() - 0.5);

  let allArticles = [];
  console.log(`📡 Fetching news from GNews. Total queries generated: ${shuffledQueries.length}`);
  
  for (const q of shuffledQueries.slice(0, 5)) {
    if (allArticles.length >= 15) {
      console.log('⏹️ Found enough articles (>= 15), stopping early.');
      break;
    }
    
    const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&sortby=publishedAt&max=10&apikey=${GNEWS_API_KEY}`;
    try {
      console.log(`   Fetching: ${q}`);
      const res = await fetch(gnewsUrl);
      if (!res.ok) {
        const errorData = await res.json();
        console.error(`❌ GNews API HTTP ${res.status}:`, errorData);
        continue;
      }
      const data = await res.json();
      if (data.articles) {
        allArticles.push(...data.articles);
      }
    } catch (e) {
      console.error(`❌ Fetch for query failed:`, e.message);
    }
    await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit safety delay
  }

  console.log(`✅ Total articles collected: ${allArticles.length}`);

  if (allArticles.length === 0) {
    console.log('⚠️ No articles fetched from GNews. Stopping.');
    return;
  }

  // JS 기반 검열
  const badWords = ["politics", "modi", "president", "minister", "noodles", "food", "cuisine", "recipe"];
  const uniquePool = [];
  const urls = new Set();
  
  for (const a of allArticles) {
    const textToCheck = (a.title + " " + (a.description || "")).toLowerCase();
    const hasBadWord = badWords.some(w => textToCheck.includes(w));
    if (!urls.has(a.url) && !hasBadWord) {
      uniquePool.push(a);
      urls.add(a.url);
    }
  }

  // 4. 중복 방지 로직 (최근 뉴스 제목과 비교)
  console.log('🔍 Filtering duplicates against database past issues...');
  const { data: pastIssues } = await supabase
    .from('hot_issues')
    .select('headline')
    .order('published_at', { ascending: false })
    .limit(20);

  const pastTitles = (pastIssues || []).map(pi => {
    if (typeof pi.headline === 'string') return pi.headline;
    return pi.headline?.EN;
  }).filter(t => t);

  const isDuplicate = (newTitle, existingTitles) => {
    const normalize = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
    const words1 = normalize(newTitle).filter(w => w.length > 3);
    for (const t of existingTitles) {
      const words2 = normalize(t).filter(w => w.length > 3);
      const intersection = words1.filter(w => words2.includes(w));
      if (intersection.length >= Math.min(words1.length, words2.length) * 0.4) return true;
    }
    return false;
  };

  const articlesToProcess = [];
  for (const art of uniquePool) {
    if (articlesToProcess.length >= 2) break;
    if (!isDuplicate(art.title, pastTitles)) {
      articlesToProcess.push(art);
      pastTitles.push(art.title);
    }
  }

  if (articlesToProcess.length === 0) {
    console.log('⚠️ No new articles to process after duplicate filtering.');
    return;
  }

  console.log(`📝 Articles to process: ${articlesToProcess.length}`);

  // 5. Expand articles with Gemini & search YouTube
  const expandWithGemini = async (title, sourceName, maxRetries = 2) => {
    const prompt = `You are an expert K-Pop music journalist. Write a comprehensive, high-quality, and professional news article based on this headline: "${title}".
The article MUST be substantial (at least 6 long, detailed paragraphs) and provide deep insights, industry analysis, and potential global impact. 
MANDATORY: For EVERY language (EN, KO, ES), provide natural and professional content in that specific language.
At the very end of the "body" for EVERY language, add a new line: "Source: ${sourceName}" (translated to the respective language).
ALSO: Provide a highly relevant, official K-Pop YouTube video search query (e.g. "BLACKPINK Jisoo Flower MV", "BTS Dynamite MV") that perfectly matches the main K-Pop artist or song mentioned in the headline, under the key "youtubeQuery". Keep it concise (3-5 words) and optimized for searching the official music video or stage performance.

Return JSON ONLY: { "category": { "EN":"", "KO":"", "ES":"" }, "headline": { "EN":"", "KO":"", "ES":"" }, "lead": { "EN":"", "KO":"", "ES":"" }, "body": { "EN":"", "KO":"", "ES":"" }, "youtubeQuery": "" }`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
          })
        });
        
        const data = await response.json();
        if (data.error) {
          console.warn(`⚠️ Gemini error (attempt ${attempt}/${maxRetries}): ${data.error.message}`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response from Gemini');
        return JSON.parse(text.trim());
      } catch (e) {
        if (attempt === maxRetries) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  };

  const searchYouTube = async (query, artistName) => {
    const fallbacks = [
      'gdZLi9oWNZg', // BTS - Dynamite
      'd9IxdwEFk1c', // BLACKPINK - How You Like That
      'fE2h3lGlOsk', // Stray Kids - God's Menu
      'Zp804HSY03A', // (G)I-DLE - Fate
      'k6a7Zon-p64', // IVE - I AM
    ];

    const getRandomFallback = () => fallbacks[Math.floor(Math.random() * fallbacks.length)];

    const attemptSearch = async (q) => {
      try {
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
        const res = await fetch(ytUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) return data.items[0].id.videoId;
        } else {
          const err = await res.json();
          console.warn(`⚠️ YT search failed for "${q}":`, err.error?.message);
        }
      } catch (e) {
        console.error('❌ YT search error:', e.message);
      }
      return null;
    };

    let vid = await attemptSearch(query);
    if (vid) return vid;

    const shortQuery = query.split(' ').slice(0, 5).join(' ') + ' K-POP';
    vid = await attemptSearch(shortQuery);
    if (vid) return vid;

    if (artistName) {
      vid = await attemptSearch(`${artistName} Official MV`);
      if (vid) return vid;
    }

    return getRandomFallback();
  };

  const uniqueTs = Date.now();
  const insertPromises = articlesToProcess.map(async (raw, i) => {
    const isSlot1 = (i === 0);
    try {
      console.log(`🤖 Expanding with Gemini: "${raw.title}"`);
      
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const expanded = await expandWithGemini(raw.title, raw.source?.name || 'News');
      const artist = artistNames.find(n => raw.title.toLowerCase().includes(n.toLowerCase()));
      const searchQuery = expanded.youtubeQuery || artist || raw.title;
      
      console.log(`🎥 Searching YouTube for query: "${searchQuery}"`);
      const videoId = await searchYouTube(searchQuery, artist || '');

      return {
        id: `live_${uniqueTs}_${i + 1}`,
        published_at: `${todayKST}T${isSlot1 ? '00:00:00' : '09:00:00'}Z`,
        slot: isSlot1 ? 'KST 09:00' : 'KST 18:00',
        date: todayKST,
        category: expanded.category,
        headline: expanded.headline,
        lead: expanded.lead,
        body: expanded.body,
        video_id: videoId,
        accent: isSlot1 ? '#9333EA' : '#E11D48', 
        tags: ['News', 'KPOP', raw.source?.name?.substring(0,6).replace(/\s+/g, '') || 'Hot'],
        is_active: true
      };
    } catch (err) {
      console.error(`❌ Failed processing article "${raw.title}":`, err.message);
      return null;
    }
  });

  const results = await Promise.all(insertPromises);
  const inserts = results.filter(r => r !== null);

  if (inserts.length === 0) {
    console.error('❌ All articles failed to expand.');
    process.exit(1);
  }

  console.log(`💾 Saving ${inserts.length} articles to Supabase...`);
  const { error: upsertError } = await supabase
    .from('hot_issues')
    .upsert(inserts, { onConflict: 'id' });

  if (upsertError) {
    console.error('❌ Upsert failed:', upsertError);
    process.exit(1);
  }

  console.log(`✨ Successfully manual-updated ${inserts.length} Hot Issues!`);
}

run();
