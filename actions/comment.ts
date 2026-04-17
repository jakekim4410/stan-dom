'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const COMMENT_QUOTA_MEMBER = 50;

export async function addComment(artistId: string, content: string, countryCode?: string, memberId?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'AUTH_REQUIRED' };
    }

    const identifierValue = user.id;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existingComments, error: scanError } = await supabase
      .from('comments')
      .select('created_at')
      .eq('user_id', identifierValue)
      .gt('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (scanError) throw scanError;

    if (existingComments && existingComments.length >= COMMENT_QUOTA_MEMBER) {
      const oldestBlockingComment = new Date(existingComments[COMMENT_QUOTA_MEMBER - 1].created_at);
      const nextAllowedDate = new Date(oldestBlockingComment.getTime() + 24 * 60 * 60 * 1000);
      return {
        success: false,
        error: 'COOLDOWN_ACTIVE',
        nextAllowedAt: nextAllowedDate.toISOString()
      };
    }

    const displayName = user.user_metadata?.full_name || user.user_metadata?.custom_id || 'Global Fan';
    // 파라미터로 받은 countryCode 우선, 없으면 메타데이터에서
    const resolvedCountryCode = countryCode || user.user_metadata?.country_code || null;

    const { error: insertError } = await supabase.from('comments').insert({
      artist_id: artistId,
      member_id: memberId || null,
      content: content.trim(),
      display_name: displayName,
      country_code: resolvedCountryCode,
      user_id: user.id
    });

    if (insertError) throw insertError;

    revalidatePath(`/artist/${artistId}`);
    return { success: true };

  } catch (error: any) {
    console.error('[Add Comment Action] Error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

export async function updateComment(commentId: string, content: string, artistId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'AUTH_REQUIRED' };

    // 본인 댓글인지 확인
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) return { success: false, error: 'NOT_FOUND' };
    if (comment.user_id !== user.id) return { success: false, error: 'UNAUTHORIZED' };

    const { error: updateError } = await supabase
      .from('comments')
      .update({ content: content.trim() })
      .eq('id', commentId);

    if (updateError) throw updateError;

    revalidatePath(`/artist/${artistId}`);
    return { success: true };

  } catch (error: any) {
    console.error('[Update Comment Action] Error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

export async function deleteComment(commentId: string, artistId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'AUTH_REQUIRED' };

    // 본인 댓글인지 확인
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) return { success: false, error: 'NOT_FOUND' };
    if (comment.user_id !== user.id) return { success: false, error: 'UNAUTHORIZED' };

    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) throw deleteError;

    revalidatePath(`/artist/${artistId}`);
    return { success: true };

  } catch (error: any) {
    console.error('[Delete Comment Action] Error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}