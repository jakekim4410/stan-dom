'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Fetch members for a specific artist
 */
export async function getArtistMembers(artistId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('artist_id', artistId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching members:', error);
    return { success: false, error: error.message };
  }

  return { success: true, members: data };
}

/**
 * Vote for a specific member (Birthday voting or individual ranking)
 */
export async function voteForMember(memberId: string, artistId: string, countryCode: string = 'UN') {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Security check: Ensure member belongs to the artist
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, artist_id')
      .eq('id', memberId)
      .single();

    if (memberError || !member || member.artist_id !== artistId) {
      return { success: false, error: 'INVALID_MEMBER' };
    }

    // Insert vote record (Assuming a 'member_votes' table)
    const { error: voteError } = await supabase
      .from('member_votes')
      .insert({
        user_id: user?.id || null, // Or enforce login if needed
        member_id: memberId,
        artist_id: artistId,
        country_code: countryCode.toUpperCase()
      });

    if (voteError) throw voteError;

    revalidatePath(`/artist/${artistId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Member Vote Error:', error);
    return { success: false, error: error.message };
  }
}
