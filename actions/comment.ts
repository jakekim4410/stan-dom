'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const COMMENT_QUOTA_GUEST = 3;
const COMMENT_QUOTA_MEMBER = 50;

export async function addComment(artistId: string, content: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Strict Auth Check
    if (!user) {
      return { success: false, error: 'AUTH_REQUIRED' };
    }

    const limit = COMMENT_QUOTA_MEMBER;
    const identifierKey = 'user_id';
    const identifierValue = user.id;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existingComments, error: scanError } = await supabase
      .from('comments')
      .select('created_at')
      .eq(identifierKey, identifierValue)
      .gt('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (scanError) throw scanError;

    if (existingComments && existingComments.length >= limit) {
      const oldestBlockingComment = new Date(existingComments[limit - 1].created_at);
      const nextAllowedDate = new Date(oldestBlockingComment.getTime() + 24 * 60 * 60 * 1000);
      return { 
        success: false, 
        error: 'COOLDOWN_ACTIVE', 
        nextAllowedAt: nextAllowedDate.toISOString() 
      };
    }

    // 2. Metadata Extraction (Registered Info)
    const displayName = user.user_metadata?.full_name || user.user_metadata?.custom_id || 'Global Fan';
    const countryCode = user.user_metadata?.country_code || null;

    const { error: insertError } = await supabase.from('comments').insert({
      artist_id: artistId,
      content: content.trim(),
      display_name: displayName,
      country_code: countryCode,
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

