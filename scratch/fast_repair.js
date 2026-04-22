require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function expandWithGemini(title, sourceName) {
  const prompt = `
You are an expert K-Pop music journalist. Write a professional 3-paragraph news article based on this headline.
IMPORTANT: You MUST focus entirely on the K-Pop industry and K-Pop artists. If the headline is about a Western artist, try to find a K-Pop connection or focus on the K-Pop impact.
MANDATORY: At the very end of the "body" for EVERY language (EN, KO, ES), you must add a new line: "Source: ${sourceName}" (translated to the respective language. ex: "출처: ${sourceName}").
Return JSON ONLY: { "category": { "EN":"", "KO":"", "ES":"" }, "headline": { "EN":"", "KO":"", "ES":"" }, "lead": { "EN":"", "KO":"", "ES":"" }, "body": { "EN":"", "KO":"", "ES":"" } }
Headline: ${title}
Source: ${sourceName}
  `;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(`Gemini Error: ${data.error.message}`);
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

async function repair() {
  const { data, error } = await supabase.from('hot_issues').select('*').order('created_at', { ascending: false }).limit(10);
  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  const shortArticles = data.filter(d => d.body && d.body.KO && d.body.KO.length < 300);
  console.log(`Found ${shortArticles.length} short articles to repair.`);

  for (let i = 0; i < shortArticles.length; i++) {
    const art = shortArticles[i];
    console.log(`\n[${i+1}/${shortArticles.length}] Repairing: ${art.headline?.EN || art.id}`);
    
    // Extract source name if exists
    let sourceName = 'News';
    if (art.tags && art.tags.length > 2) {
       sourceName = art.tags[2];
    } else {
       // fallback extraction from body
       const bodyKo = art.body?.KO || '';
       if (bodyKo.includes('출처:')) sourceName = bodyKo.split('출처:')[1].trim();
    }

    try {
      const expanded = await expandWithGemini(art.headline?.EN || 'K-Pop News', sourceName);
      
      const { error: updateError } = await supabase
        .from('hot_issues')
        .update({
          category: expanded.category,
          headline: expanded.headline,
          lead: expanded.lead,
          body: expanded.body
        })
        .eq('id', art.id);

      if (updateError) {
        console.error(`Failed to update ${art.id} in Supabase:`, updateError);
      } else {
        console.log(`✅ Success: ${art.id} (New KO body length: ${expanded.body.KO.length})`);
      }
      
      await delay(2000); // Only a 2s delay thanks to the new key!
    } catch (e) {
      console.error(`❌ Failed Gemini expansion for ${art.id}:`, e.message);
    }
  }
}

repair();
