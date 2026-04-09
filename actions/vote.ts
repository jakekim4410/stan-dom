'use server';

import { supabase } from '@/utils/supabase';
import { revalidatePath } from 'next/cache';

export async function voteForArtist(artistId: string, countryCode: string = 'UN') {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Insert vote with user-selected country code
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        user_id: user?.id || null,
        artist_id: artistId,
        country_code: countryCode.toUpperCase(),
      });

    if (voteError) throw voteError;

    // 2. Increment total_votes atomically
    const { data: artistData, error: fetchError } = await supabase
      .from('artists')
      .select('total_votes')
      .eq('id', artistId)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('artists')
      .update({ total_votes: (artistData.total_votes || 0) + 1 })
      .eq('id', artistId);

    if (updateError) throw updateError;

    revalidatePath('/');
    return { success: true, countryCode };
  } catch (error: any) {
    console.error('Voting error:', error);
    return { success: false, error: error.message };
  }
}
