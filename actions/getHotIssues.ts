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
 * - Filters only is_active = true and published_at <= now
 * - Orders newest-first
 * - Computes isNew (true if published within last 48h)
 * - Maps snake_case DB fields to camelCase for JSX compatibility
 */
export async function getHotIssues(): Promise<HotIssue[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const nowMs = Date.now();

    const { data, error } = await supabase
      .from('hot_issues')
      .select('id, published_at, slot, date, category, headline, lead, body, video_id, accent, tags, is_active')
      .eq('is_active', true)
      .lte('published_at', now)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('[getHotIssues] Supabase error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      ...row,
      videoId: row.video_id,
      publishedAt: row.published_at,
      isNew: nowMs - new Date(row.published_at).getTime() < 48 * 60 * 60 * 1000,
    }));
  } catch (err) {
    console.error('[getHotIssues] Unexpected error:', err);
    return [];
  }
}
