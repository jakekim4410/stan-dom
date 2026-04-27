import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Vercel Hobby tier maximum
export const dynamic = 'force-dynamic';

// Vercel Cron은 GET 요청만 지원합니다.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // 1. 보안 인가 (cron secret 검증)
    if (secret !== process.env.CRON_SECRET) {
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
      return NextResponse.json({ error: 'GNEWS API configuration missing' }, { status: 500 });
    }

    // 아티스트 102명을 15명씩 묶어서 검색 (API 호출 최적화)
    const chunks = [];
    for (let i = 0; i < artistNames.length; i += 15) {
      chunks.push(artistNames.slice(i, i + 15));
    }

    let allArticles: any[] = [];
    // 데일리 크론은 무리를 주지 않기 위해 상위 5개 청크(약 75명)만 우선 검색
    const fetchPromises = chunks.slice(0, 5).map(async (chunk) => {
      const q = `(${chunk.map(name => `"${name}"`).join(' OR ')}) AND (kpop OR "k-pop")`;
      const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&sortby=publishedAt&max=10&apikey=${GNEWS_API_KEY}`;
      try {
        const res = await fetch(gnewsUrl);
        const data = await res.json();
        if (data.articles) return data.articles;
      } catch (e) {
        console.error(`[CRON] Fetch for query ${q} failed:`, e);
      }
      return [];
    });

    const results = await Promise.all(fetchPromises);
    allArticles = results.flat();

    // JS 기반 검열 (정치, 요리, 경제 제외)
    const badWords = ["president", "first lady", "minister", "modi", "politics", "noodles", "food", "cuisine", "ramen"];
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

    // 5. 중복 방지 로직 (지난 2일간의 뉴스 제목과 비교)
    const { data: pastIssues } = await supabase.from('hot_issues').select('headline').limit(10);
    const pastTitles = (pastIssues || []).map(pi => pi.headline?.EN).filter(t => t);

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
      console.log('[CRON] No new pure K-pop articles found after deduplication');
      return NextResponse.json({ message: 'No new articles today' }, { status: 200 });
    }

    // 6. Gemini & YouTube API 준비
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    const expandWithGemini = async (title: string, sourceName: string) => {
      if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
      const prompt = `
You are an expert K-Pop music journalist. Write a professional 3-paragraph news article based on this headline.
IMPORTANT: You MUST focus entirely on the K-Pop industry and K-Pop artists. If the headline is about a Western artist, try to find a K-Pop connection or focus on the K-Pop impact.
MANDATORY: At the very end of the "body" for EVERY language (EN, KO, ES), you must add a new line: "Source: ${sourceName}" (translated to the respective language).
Return JSON ONLY: { "category": { "EN":"", "KO":"", "ES":"" }, "headline": { "EN":"", "KO":"", "ES":"" }, "lead": { "EN":"", "KO":"", "ES":"" }, "body": { "EN":"", "KO":"", "ES":"" } }
Headline: ${title}
Source: ${sourceName}
      `;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
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
    };

    const searchYouTube = async (query: string, artistName: string): Promise<string> => {
      if (!YOUTUBE_API_KEY) return '';
      const attemptSearch = async (q: string) => {
        try {
          const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
          const ytRes = await fetch(ytUrl);
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (ytData.items && ytData.items.length > 0) return ytData.items[0].id.videoId;
          }
        } catch (e) {
          console.error('[CRON] YT search error:', e);
        }
        return null;
      };

      // Try 1: First 5 words of title + K-POP
      const shortQuery = query.split(' ').slice(0, 5).join(' ');
      let vid = await attemptSearch(`${shortQuery} K-POP`);
      if (vid) return vid;

      // Try 2: Artist Fallback (Official MV)
      if (artistName) {
        vid = await attemptSearch(`${artistName} Official MV`);
        if (vid) return vid;
      }
      const fallbacks = [
        'ArmDp-zijuc', // NewJeans - Super Shy
        'Zp804HSY03A', // (G)I-DLE - Fate
        'gdZLi9oWNZg', // BTS - Dynamite
        'd9IxdwEFk1c', // BLACKPINK - How You Like That
        'wkZpBWkhbck', // LE SSERAFIM - SMART
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    };


    // 7. 데이터 생성 및 Upsert (개별 에러 핸들링으로 안정성 강화)
    const uniqueTs = Date.now();
    const inserts: any[] = [];

    for (let i = 0; i < articlesToProcess.length; i++) {
      const raw = articlesToProcess[i];
      const isSlot1 = (i === 0);
      try {
        console.log(`[CRON] Expanding: ${raw.title}`);
        const expanded = await expandWithGemini(raw.title, raw.source?.name || 'News');
        
        const artist = artistNames.find(n => raw.title.toLowerCase().includes(n.toLowerCase()));
        const videoId = await searchYouTube(raw.title, artist || '');

        inserts.push({
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
        });
      } catch (articleError: any) {
        console.error(`[CRON] Failed to process article "${raw.title}":`, articleError.message);
        // 개별 기사 실패 시 나머지 계속 처리
      }
    }

    if (inserts.length === 0) {
      console.error('[CRON] All articles failed to process');
      return NextResponse.json({ error: 'All articles failed to process' }, { status: 500 });
    }

    const { error: upsertError } = await supabase
      .from('hot_issues')
      .upsert(inserts, { onConflict: 'id' });

    if (upsertError) {
      console.error('[CRON] Upsert failed:', upsertError);
      return NextResponse.json({ error: 'Database upsert failed' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully generated ${inserts.length} AI articles for all artists with deduplication` 
    });

  } catch (error: any) {
    console.error('[CRON] Unhandled error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
