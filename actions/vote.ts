'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const QUOTA_GUEST = process.env.NODE_ENV === 'development' ? 1000 : 3;
const QUOTA_MEMBER = process.env.NODE_ENV === 'development' ? 1000 : 10;

export async function voteForArtist(artistId: string, countryCode: string = 'UN') {
  console.log(`[Vote Action] DEBUG: Function entered for artist ${artistId}`);
  try {
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const limit = user ? QUOTA_MEMBER : QUOTA_GUEST;
    const identifierType = user ? 'user_id' : 'ip_address';
    const identifierValue = user ? user.id : ip;

    console.log(`[Vote Action] Context: IP=${ip}, User=${user?.id || 'anon'}, Quota=${limit}`);

    // KST 09:00 daily reset: KST = UTC+9, so KST 09:00 = UTC 00:00
    // Find the most recent UTC midnight (= KST 09:00) as the reset boundary
    const nowUtc = new Date();
    const todayResetUtc = new Date(Date.UTC(
      nowUtc.getUTCFullYear(),
      nowUtc.getUTCMonth(),
      nowUtc.getUTCDate(),
      0, 0, 0, 0
    ));
    // If current UTC time is before midnight (i.e. KST time is 00:00-08:59),
    // use the PREVIOUS day's midnight as the reset point
    const resetBoundary = nowUtc < todayResetUtc
      ? new Date(todayResetUtc.getTime() - 24 * 60 * 60 * 1000)
      : todayResetUtc;

    const { data: existingVotes, error: scanError } = await supabase
      .from('votes')
      .select('created_at')
      .eq(identifierType, identifierValue)
      .gt('created_at', resetBoundary.toISOString())
      .order('created_at', { ascending: false });

    if (scanError) {
      console.error(`[Vote Action] Scan Error:`, scanError);
      throw scanError;
    }

    if (existingVotes && existingVotes.length >= limit) {
      console.log(`[Vote Action] Quota exceeded. Used: ${existingVotes.length}/${limit}`);
      // Next reset = next UTC midnight (= next KST 09:00)
      const nextResetUtc = new Date(resetBoundary.getTime() + 24 * 60 * 60 * 1000);
      return { 
        success: false, 
        error: 'COOLDOWN_ACTIVE', 
        nextVoteAt: nextResetUtc.toISOString(),
        limit
      };
    }

    // 2. Insert vote
    console.log(`[Vote Action] Inserting new vote record...`);
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        user_id: user?.id || null,
        artist_id: artistId,
        country_code: countryCode.toUpperCase(),
        ip_address: ip
      });

    if (voteError) {
      console.error(`[Vote Action] Insert Error:`, voteError);
      throw voteError;
    }

    // 3. Increment total_votes
    console.log(`[Vote Action] Fetching current vote count for artist ${artistId}...`);
    const { data: artistData, error: fetchError } = await supabase
      .from('artists')
      .select('total_votes')
      .eq('id', artistId)
      .single();

    if (fetchError || !artistData) {
      console.error(`[Vote Action] Fetch Artist Data Error:`, fetchError);
      throw new Error(fetchError?.message || 'Artist not found');
    }

    console.log(`[Vote Action] Updating artist ${artistId} votes to ${ (artistData.total_votes || 0) + 1 }...`);
    const { error: updateError } = await supabase
      .from('artists')
      .update({ total_votes: (artistData.total_votes || 0) + 1 })
      .eq('id', artistId);

    if (updateError) {
      console.error(`[Vote Action] Update Artist Error:`, updateError);
      throw updateError;
    }

    console.log(`[Vote Action] ALL SUCCESSFUL. Revalidating path...`);
    revalidatePath('/');
    return { success: true, countryCode };
  } catch (error: any) {
    console.error('[Vote Action] Unexpected fatal error:', error);
    return { success: false, error: error.message || 'An unexpected system error occurred' };
  }
}

