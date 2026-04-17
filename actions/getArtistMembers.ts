'use server';

import { createClient } from '@/utils/supabase/server';

export interface Member {
  id: string;
  artist_id: string;
  name: string;
  birthday: string | null;
  image_url: string | null;
}

export async function getArtistMembers(artistId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('artist_id', artistId)
      .order('name', { ascending: true });

    if (error) throw error;

    return { success: true, members: data as Member[] };
  } catch (error: any) {
    console.error('Error fetching artist members:', error);
    return { success: false, error: error.message };
  }
}
