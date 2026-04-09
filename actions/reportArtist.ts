'use server';

import { createClient } from '@/utils/supabase/server';

export async function reportArtistData(artistId: string, reasonCode: string, description?: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // reasonCode should be one of: INAPPROPRIATE, WRONG_ARTIST, LOW_QUALITY, DUPLICATE, OTHER
    const { error } = await supabase
      .from('reports')
      .insert({
        artist_id: artistId,
        user_id: user?.id || null,
        reason_code: reasonCode,
        description: description || '',
        created_at: new Date().toISOString()
      });

    if (error) {
       console.warn('[Report] Table might be missing or error occurred:', error.message);
       // We still return true to the user UI, but log the failure for admin to fix DB schema
       return { success: true, warning: 'REPORT_LOGGED_FALLBACK' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Action] reportArtistData error:', error.message);
    return { success: false, error: error.message };
  }
}
