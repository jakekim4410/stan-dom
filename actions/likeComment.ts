'use client';

import { createClient } from '@/utils/supabase/client';

export async function toggleLikeComment(commentId: string) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return { success: false, error: 'AUTHENTICATION_REQUIRED' };

  const userId = session.user.id;

  // 1. Check if already liked
  const { data: existingLike } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    // Unlike
    const { error: deleteError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);

    if (deleteError) return { success: false, error: deleteError.message };

    // Decrement likes_count (We'll assume Database triggers or manual update)
    // For simplicity, let's do a manual decrement via increment but with -1 if no triggers
    const { error: updateError } = await supabase.rpc('decrement_comment_likes', { target_id: commentId });
    // Note: If no RPC exists, we can use simple update, but RPC is safer for concurrency.
    // If we don't have RPC, we use update:
    if (updateError) {
       // Manual update fallback
       const { data: comment } = await supabase.from('comments').select('likes_count').eq('id', commentId).single();
       await supabase.from('comments').update({ likes_count: Math.max(0, (comment?.likes_count || 0) - 1) }).eq('id', commentId);
    }

    return { success: true, action: 'unliked' };
  } else {
    // Like
    const { error: insertError } = await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId });

    if (insertError) return { success: false, error: insertError.message };

    const { error: updateError } = await supabase.rpc('increment_comment_likes', { target_id: commentId });
    if (updateError) {
       // Manual update fallback
       const { data: comment } = await supabase.from('comments').select('likes_count').eq('id', commentId).single();
       await supabase.from('comments').update({ likes_count: (comment?.likes_count || 0) + 1 }).eq('id', commentId);
    }

    return { success: true, action: 'liked' };
  }
}
