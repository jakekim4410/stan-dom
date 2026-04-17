'use server';

import { createClient } from '@/utils/supabase/server';

export interface Member {
  id: string;
  artist_id: string;
  name: string;
  birthday: string | null;
  image_url: string | null;
  likes_count: number;
  is_liked?: boolean;
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

    // Check likes for current user if applicable
    const { data: { user } } = await supabase.auth.getUser();
    let likedMemberIds: Set<string> = new Set();
    
    if (user) {
      const { data: userLikes } = await supabase
        .from('member_likes')
        .select('member_id')
        .eq('user_id', user.id);
      
      if (userLikes) {
        likedMemberIds = new Set(userLikes.map(l => l.member_id));
      }
    }

    const membersWithStats = (data || []).map(m => ({
      ...m,
      likes_count: m.likes_count || 0,
      is_liked: likedMemberIds.has(m.id)
    }));

    return { success: true, members: membersWithStats as Member[] };
  } catch (error: any) {
    console.error('Error fetching artist members:', error);
    return { success: false, error: error.message };
  }
}
