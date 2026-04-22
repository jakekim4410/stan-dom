require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const isDuplicate = (newTitle, existingTitles) => {
  const normalize = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
  const words1 = normalize(newTitle).filter(w => w.length > 3);
  for (const t of existingTitles) {
    const words2 = normalize(t).filter(w => w.length > 3);
    const intersection = words1.filter(w => words2.includes(w));
    if (intersection.length >= Math.min(words1.length, words2.length) * 0.4) return true;
  }
  return false;
};

async function expandWithGemini(title, sourceName) {
  const prompt = `
You are an expert K-Pop music journalist. Write a professional 3-paragraph news article based on this headline.
IMPORTANT: You MUST focus entirely on the K-Pop industry and K-Pop artists.
MANDATORY: At the very end of the "body" for EVERY language (EN, KO, ES), you must add a new line: "Source: ${sourceName}" (translated to the respective language. ex KO: "출처: ${sourceName}").
Return JSON ONLY: { "category": { "EN":"", "KO":"", "ES":"" }, "headline": { "EN":"", "KO":"", "ES":"" }, "lead": { "EN":"", "KO":"", "ES":"" }, "body": { "EN":"", "KO":"", "ES":"" } }
Headline: ${title}
Source: ${sourceName}
  `;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

async function searchYouTube(query) {
  try {
    const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " K-POP official")}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const ytRes = await fetch(ytUrl);
    if (ytRes.ok) {
      const ytData = await ytRes.json();
      if (ytData.items && ytData.items.length > 0) return ytData.items[0].id.videoId;
    }
  } catch (e) {}
  return 'o97AnitLw74';
}

async function run() {
  console.log('Fetching top artists...');
  const { data: artistsData } = await supabase.from('artists').select('name');
  const artistNames = (artistsData || []).map(a => {
    try { const p = typeof a.name === 'string' ? JSON.parse(a.name) : a.name; return p.EN; } catch(e) { return a.name; }
  }).filter(n => n).sort(() => 0.5 - Math.random()).slice(0, 30); // get random 30 artists to search

  console.log('Fetching GNews to find 10 UNIQUE topic articles...');
  let uniquePool = [];
  let distinctTitles = [];
  
  const chunks = [];
  for (let i = 0; i < artistNames.length; i += 10) chunks.push(artistNames.slice(i, i + 10));

  for (const chunk of chunks) {
    if (uniquePool.length >= 10) break;
    const q = `(${chunk.map(name => `"${name}"`).join(' OR ')}) AND (kpop OR "k-pop")`;
    try {
      const res = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&sortby=publishedAt&max=10&apikey=${GNEWS_API_KEY}`);
      const data = await res.json();
      if (data.articles) {
        for (const art of data.articles) {
          if (!isDuplicate(art.title, distinctTitles)) {
            uniquePool.push(art);
            distinctTitles.push(art.title);
            if (uniquePool.length >= 10) break;
          }
        }
      }
    } catch(e) { console.log('GNews fetch error'); }
  }

  console.log(`Found ${uniquePool.length} distinct articles. Processing...`);

  // We need the existing top 10 IDs from Supabase to overwrite them.
  const { data: existingData } = await supabase.from('hot_issues').select('id').order('created_at', { ascending: false }).limit(10);
  
  for (let i = 0; i < Math.min(uniquePool.length, existingData.length); i++) {
    const raw = uniquePool[i];
    const targetId = existingData[i].id;
    console.log(`\n[${i+1}] Processing: ${raw.title}`);
    
    try {
      const expanded = await expandWithGemini(raw.title, raw.source?.name || 'News');
      const videoId = await searchYouTube(raw.title);
      
      await supabase.from('hot_issues').update({
        headline: expanded.headline,
        lead: expanded.lead,
        body: expanded.body,
        category: expanded.category,
        video_id: videoId,
        tags: ['News', 'KPOP', (raw.source?.name || 'Hot').substring(0,6).replace(/\s+/g, '')]
      }).eq('id', targetId);
      
      console.log(`✅ Success updated ID: ${targetId}`);
      await delay(2000);
    } catch(e) {
      console.error(`❌ Failed:`, e.message);
    }
  }
}

run();
