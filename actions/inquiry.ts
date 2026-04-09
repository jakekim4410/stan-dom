'use server';

import { createClient } from '@/utils/supabase/server';

export async function addInquiry(content: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('inquiries')
      .insert([
        { 
          user_id: user?.id || null, 
          user_email: user?.email || null,
          content 
        }
      ]);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[Action] addInquiry error:', error.message);
    return { success: false, error: error.message };
  }
}
