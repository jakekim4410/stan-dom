'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateMemberPhoto(memberId: string, artistId: string, imageUrl: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const isLocalAdmin = process.env.NODE_ENV === 'development';

    if (!user && !isLocalAdmin) {
      return { success: false, error: 'LOG_IN_REQUIRED' };
    }

    // Check if the member currently has an image
    const { data: memberData } = await supabase
      .from('members')
      .select('image_url')
      .eq('id', memberId)
      .single();

    const hasNoImage = !memberData?.image_url;

    // Reputation Gating (Free if no image, otherwise 5+ votes for the parent artist)
    if (!isLocalAdmin && !hasNoImage) {
      if (!user) return { success: false, error: 'LOG_IN_REQUIRED' };

      const { count, error: countErr } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('artist_id', artistId);

      if (countErr) throw countErr;

      const voteCount = count || 0;
      if (voteCount < 5) {
        return {
          success: false,
          error: 'VOTES_INSUFFICIENT',
          currentVotes: voteCount,
          requiredVotes: 5
        };
      }
    }

    // Perform the update
    const { error } = await supabase
      .from('members')
      .update({ image_url: imageUrl })
      .eq('id', memberId);

    if (error) throw error;

    revalidatePath(`/artist/${artistId}`);
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    console.error('[Action] updateMemberPhoto error:', error.message);
    return { success: false, error: error.message };
  }
}
