'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function updateArtistPhoto(artistId: string, imageUrl: string) {
  const supabase = await createClient();

  try {
    // 1. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    const isLocalAdmin = process.env.NODE_ENV === 'development';

    if (!user && !isLocalAdmin) {
      return { success: false, error: 'LOG_IN_REQUIRED' };
    }

    // 2. Reputation Gating (10+ votes for this artist)
    if (!isLocalAdmin) {
      if (!user) {
        return { success: false, error: 'LOG_IN_REQUIRED' };
      }

      const { count, error: countErr } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('artist_id', artistId);

      if (countErr) throw countErr;

      const voteCount = count || 0;
      if (voteCount < 10) {
        return {
          success: false,
          error: 'VOTES_INSUFFICIENT',
          currentVotes: voteCount,
          requiredVotes: 10
        };
      }
    }

    // 3. Perform the update using Admin Client to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Update may fail due to RLS.');
    }
    const supabaseAdmin = serviceRoleKey 
      ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
      : supabase;

    const { error } = await supabaseAdmin
      .from('artists')
      .update({ image_url: imageUrl })
      .eq('id', artistId);

    if (error) throw error;

    // 4. Revalidate paths
    revalidatePath('/');
    revalidatePath(`/artist/${artistId}`);

    return { success: true };
  } catch (error: any) {
    console.error('[Action] updateArtistPhoto error:', error.message);
    return { success: false, error: error.message };
  }
}