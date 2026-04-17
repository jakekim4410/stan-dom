'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleMemberLike(memberId: string, artistId: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'AUTH_REQUIRED' };

    // 1. Check if already liked
    const { data: existingLike } = await supabase
      .from('member_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('member_id', memberId)
      .single();

    if (existingLike) {
      // 2a. Unlike: Delete record and decrement count
      const { error: delError } = await supabase
        .from('member_likes')
        .delete()
        .eq('id', existingLike.id);

      if (delError) throw delError;

      const { data: member } = await supabase.from('members').select('likes_count').eq('id', memberId).single();
      await supabase
        .from('members')
        .update({ likes_count: Math.max(0, (member?.likes_count || 0) - 1) })
        .eq('id', memberId);
      
      revalidatePath(`/artist/${artistId}`);
      return { success: true, action: 'unliked' };
    } else {
      // 2b. Like: Insert record and increment count
      const { error: insError } = await supabase
        .from('member_likes')
        .insert({ user_id: user.id, member_id: memberId });

      if (insError) throw insError;

      const { data: member } = await supabase.from('members').select('likes_count').eq('id', memberId).single();
      await supabase
        .from('members')
        .update({ likes_count: (member?.likes_count || 0) + 1 })
        .eq('id', memberId);

      revalidatePath(`/artist/${artistId}`);
      return { success: true, action: 'liked' };
    }
  } catch (error: any) {
    console.error('[Action] toggleMemberLike error:', error.message);
    return { success: false, error: error.message };
  }
}
