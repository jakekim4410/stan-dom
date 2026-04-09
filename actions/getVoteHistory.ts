'use server';

import { supabase } from '@/utils/supabase';
import { headers } from 'next/headers';

/**
 * Fetches the IDs of artists the current user (or IP) has voted for in the last 24 hours.
 * Used to initialize the frontend "RECHARGING" state.
 */
export async function getVoteHistory() {
  try {
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const { data: { user } } = await supabase.auth.getUser();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const query = supabase
      .from('votes')
      .select('artist_id')
      .gt('created_at', twentyFourHoursAgo);

    if (user) {
      query.or(`user_id.eq.${user.id},ip_address.eq.${ip}`);
    } else {
      query.eq('ip_address', ip);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Return unique artist IDs
    const artistIds = Array.from(new Set((data || []).map(v => v.artist_id)));
    return { success: true, artistIds };
  } catch (error: any) {
    console.error('Fetch vote history error:', error);
    return { success: false, artistIds: [] };
  }
}
