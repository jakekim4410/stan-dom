'use server';

import { createClient } from '@/utils/supabase/server';

export type HotIssue = {
  id: string;
  published_at: string;
  publishedAt: string;  // alias for JSX compatibility
  slot: string;
  date: string;
  category: { EN: string; KO: string; ES: string };
  headline: { EN: string; KO: string; ES: string };
  lead: { EN: string; KO: string; ES: string };
  body: { EN: string; KO: string; ES: string };
  video_id: string;
  videoId: string;      // alias for JSX compatibility
  accent: string;
  tags: string[];
  isNew: boolean;       // computed field
  is_active?: boolean;
};

/**
 * Fetches published hot_issues from Supabase.
 * - Filters only is_active = true
 * - Shows articles where published_at <= now, OR whose date (KST) matches today.
 *   This ensures both daily slots (_01 KST 09:00 and _02 KST 18:00) appear
 *   on the same day regardless of when the user visits.
 * - Orders newest-first
 * - Computes isNew (true if published within last 48h)
 * - Maps snake_case DB fields to camelCase for JSX compatibility
 */
export async function getHotIssues(): Promise<HotIssue[]> {
  try {
    const supabase = await createClient();
    const nowMs = Date.now();

    // KST today date string (YYYY-MM-DD) — KST = UTC+9
    const kstNow = new Date(nowMs + 9 * 60 * 60 * 1000);
    const todayKST = kstNow.toISOString().slice(0, 10); // e.g. "2026-04-21"

    // End-of-today KST = start of tomorrow KST in UTC
    // We include today's articles regardless of time: date = today
    // AND also include all past articles (date < today)
    const { data, error } = await supabase
      .from('hot_issues')
      .select('id, published_at, slot, date, category, headline, lead, body, video_id, accent, tags, is_active')
      .eq('is_active', true)
      .lte('date', todayKST)                // include today + all past dates
      .order('published_at', { ascending: false });

    if (error) {
      console.error('[getHotIssues] Supabase error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      ...row,
      videoId: row.video_id ?? '',
      publishedAt: row.published_at,
      isNew: nowMs - new Date(row.published_at).getTime() < 48 * 60 * 60 * 1000,
    }));
  } catch (err) {
    console.error('[getHotIssues] Unexpected error:', err);
    return [];
  }
}
