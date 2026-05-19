import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Vercel Hobby tier maximum
export const dynamic = 'force-dynamic';

// Vercel Cron은 GET 요청만 지원합니다.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const authHeader = request.headers.get('authorization');

    const isValidSecret = secret === process.env.CRON_SECRET;
    const isValidAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // 1. 보안 인가 (cron secret 검증)
    if (!isValidSecret && !isValidAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[CRON] Supabase configuration missing');
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // KST 오늘 날짜 구하기
    const nowMs = Date.now();
    const kstNow = new Date(nowMs + 9 * 60 * 60 * 1000);
    const todayKST = kstNow.toISOString().split('T')[0];
    const todayIdPrefix = todayKST.replace(/-/g, '');

    // 2. 이미 오늘 기사가 생성되었는지 확인
    const { data: existingData, error: checkError } = await supabase
      .from('hot_issues')
      .select('id')
      .eq('date', todayKST);

    if (checkError) {
      console.error('[CRON] Error checking existing issues:', checkError);
      return NextResponse.json({ error: 'Database check failed' }, { status: 500 });
    }

    if (existingData && existingData.length >= 4) {
      console.log(`[CRON] Issues for ${todayKST} already generated (${existingData.length} found). Skipping.`);
      return NextResponse.json({ message: 'Already generated for today' }, { status: 200 });
    }

    // 3. 전체 아티스트 정보 가져오기 (Global Artist Search 요청 반영)
    const { data: artistsData } = await supabase.from('artists').select('name');
    const artistNames = (artistsData || []).map(a => {
      try {
        const parsed = typeof a.name === 'string' ? JSON.parse(a.name) : a.name;
        return parsed.EN;
      } catch (e) {
        return a.name;
      }
    }).filter(n => n);

    // 4. GNews API 연동 - 순수 K-POP 뉴스 수집 (멀티 쿼리 + 필터링)
    const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
    if (!GNEWS_API_KEY) {
      console.error('[CRON] GNEWS_API_KEY missing');
      return NextResponse.json({ error: 'GNEWS API configuration missing' }, { status: 500 });
    }

    // 동적 청크: GNews 쿼리 길이(최대 200자)를 넘지 않도록 묶음
    const queries: string[] = [];
    let currentChunk: string[] = [];
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

    // Shuffle queries to ensure we check different artists every run
    const shuffledQueries = queries.sort(() => Math.random() - 0.5);

    let allArticles: any[] = [];
    // 데일리 크론: GNews API Rate Limit(1초당 1요청) 방지를 위해 순차 실행 및 대기
    // 최대 5개의 쿼리만 수행하거나, 충분한 기사가 모이면 중단하여 시간 절약
    console.log(`[CRON] Starting news fetch. Total queries: ${shuffledQueries.length}`);
    for (const q of shuffledQueries.slice(0, 5)) {
      if (allArticles.length >= 15) {
        console.log('[CRON] Found enough articles, stopping fetch early.');
        break;
      }
      
      const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&sortby=publishedAt&max=10&apikey=${GNEWS_API_KEY}`;
      try {
        const res = await fetch(gnewsUrl);
        if (!res.ok) {
          const errorData = await res.json();
          console.error(`[CRON] GNews API HTTP ${res.status}:`, errorData);
          continue;
        }
        const data = await res.json();
        if (data.articles) {
          allArticles.push(...data.articles);
        }
      } catch (e) {
        console.error(`[CRON] Fetch for query ${q} failed:`, e);
      }
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    console.log(`[CRON] Total articles collected: ${allArticles.length}`);

    // JS 기반 검열 (정치, 요리, 경제 제외)
    const badWords = ["politics", "modi", "president", "minister", "noodles", "food", "cuisine", "recipe"];
    const uniquePool: any[] = [];
    const urls = new Set();
    
    for (const a of allArticles) {
      const textToCheck = (a.title + " " + (a.description || "")).toLowerCase();
      const hasBadWord = badWords.some(w => textToCheck.includes(w));
      if (!urls.has(a.url) && !hasBadWord) {
        uniquePool.push(a);
        urls.add(a.url);
      }
    }

    // 5. 중복 방지 로직 (최근 뉴스 제목과 비교)
    const { data: pastIssues } = await supabase
      .from('hot_issues')
      .select('headline')
      .order('published_at', { ascending: false })
      .limit(20);
    const pastTitles = (pastIssues || []).map(pi => {
      if (typeof pi.headline === 'string') return pi.headline;
      return pi.headline?.EN;
    }).filter(t => t);

    const isDuplicate = (newTitle: string, existingTitles: string[]) => {
      const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
      const words1 = normalize(newTitle).filter(w => w.length > 3);
      for (const t of existingTitles) {
        const words2 = normalize(t).filter(w => w.length > 3);
        const intersection = words1.filter(w => words2.includes(w));
        // Overlap of 40% words consider as duplicate topic
        if (intersection.length >= Math.min(words1.length, words2.length) * 0.4) return true;
      }
      return false;
    };

    const articlesToProcess = [];
    for (const art of uniquePool) {
      if (articlesToProcess.length >= 2) break;
      if (!isDuplicate(art.title, pastTitles)) {
        articlesToProcess.push(art);
        // Temporarily add to pastTitles to avoid picking another duplicate in the same run
        pastTitles.push(art.title);
      }
    }

    if (articlesToProcess.length === 0) {
      console.log('[CRON] No new articles to process after filtering.');
      return NextResponse.json({ message: 'No new articles today' }, { status: 200 });
    }

    console.log(`[CRON] Articles to process: ${articlesToProcess.length}`);

    // 6. Gemini & YouTube API 준비
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    const expandWithGemini = async (title: string, sourceName: string, maxRetries = 2) => {
      if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
      
      const prompt = `You are an expert K-Pop music journalist. Write a comprehensive, high-quality, and professional news article based on this headline: "${title}".
The article MUST be substantial (at least 6 long, detailed paragraphs) and provide deep insights, industry analysis, and potential global impact. 
MANDATORY: For EVERY language (EN, KO, ES), provide natural and professional content in that specific language.
At the very end of the "body" for EVERY language, add a new line: "Source: ${sourceName}" (translated to the respective language).

Return JSON ONLY: { "category": { "EN":"", "KO":"", "ES":"" }, "headline": { "EN":"", "KO":"", "ES":"" }, "lead": { "EN":"", "KO":"", "ES":"" }, "body": { "EN":"", "KO":"", "ES":"" } }`;

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
            console.warn(`[CRON] Gemini error (${attempt}): ${data.error.message}`);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error('Empty response');
          return JSON.parse(text);
        } catch (e: any) {
          if (attempt === maxRetries) throw e;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    };

    const searchYouTube = async (query: string, artistName: string): Promise<string> => {
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      if (!YOUTUBE_API_KEY) return '';

      // Fallback pool if everything fails
      const fallbacks = [
        'gdZLi9oWNZg', // BTS - Dynamite
        'd9IxdwEFk1c', // BLACKPINK - How You Like That
        'fE2h3lGlOsk', // Stray Kids - God's Menu
        'Zp804HSY03A', // (G)I-DLE - Fate
        'k6a7Zon-p64', // IVE - I AM
      ];

      const getRandomFallback = () => fallbacks[Math.floor(Math.random() * fallbacks.length)];

      const attemptSearch = async (q: string) => {
        try {
          const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
          const res = await fetch(ytUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) return data.items[0].id.videoId;
          } else {
            const err = await res.json();
            console.warn(`[CRON] YT search failed for "${q}":`, err.error?.message);
          }
        } catch (e) {
          console.error('[CRON] YT search error:', e);
        }
        return null;
      };

      // Try 1: Keywords from title (First 5 words) + K-POP
      const shortQuery = query.split(' ').slice(0, 5).join(' ') + ' K-POP';
      let vid = await attemptSearch(shortQuery);
      if (vid) return vid;

      // Try 2: Artist Name + Official MV
      if (artistName) {
        vid = await attemptSearch(`${artistName} Official MV`);
        if (vid) return vid;
      }

      // Try 3: Random popular K-pop fallback
      return getRandomFallback();
    };


    // 7. 데이터 생성 및 Upsert (개별 에러 핸들링으로 안정성 강화)
    const uniqueTs = Date.now();
    
    // Vercel 60s Timeout 방지를 위해 병렬 처리 (Promise.all)
    const insertPromises = articlesToProcess.map(async (raw, i) => {
      const isSlot1 = (i === 0);
      try {
        console.log(`[CRON] Expanding: ${raw.title}`);
        
        // 약간의 지연을 주어 Gemini Rate Limit 에러 최소화
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        const expanded = await expandWithGemini(raw.title, raw.source?.name || 'News');
        
        const artist = artistNames.find(n => raw.title.toLowerCase().includes(n.toLowerCase()));
        const videoId = await searchYouTube(raw.title, artist || '');

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
      } catch (err: any) {
        console.error(`[CRON] Failed article: ${err.message}`);
        return null;
      }
    });

    const results = await Promise.all(insertPromises);
    const inserts = results.filter((r): r is any => r !== null);

    if (inserts.length === 0) {
      console.error('[CRON] Expansion failed');
      return NextResponse.json({ error: 'Expansion failed' }, { status: 500 });
    }

    const { error: upsertError } = await supabase
      .from('hot_issues')
      .upsert(inserts, { onConflict: 'id' });

    if (upsertError) {
      console.error('[CRON] Upsert failed:', upsertError);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    console.log(`[CRON] Successfully generated ${inserts.length} articles.`);
    return NextResponse.json({ success: true, count: inserts.length });

  } catch (error: any) {
    console.error('[CRON] Unhandled error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
