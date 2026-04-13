'use server';

import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';

const QUOTA_GUEST = process.env.NODE_ENV === 'development' ? 1000 : 3;
const QUOTA_MEMBER = process.env.NODE_ENV === 'development' ? 1000 : 10;

export async function getRemainingVotes() {
  try {
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const limit = user ? QUOTA_MEMBER : QUOTA_GUEST;
    const identifierType = user ? 'user_id' : 'ip_address';
    const identifierValue = user ? user.id : ip;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq(identifierType, identifierValue)
      .gt('created_at', twentyFourHoursAgo);

    if (error) throw error;

    return { 
      success: true, 
      count: count || 0, 
      limit, 
      remaining: Math.max(0, limit - (count || 0)) 
    };
  } catch (error: any) {
    console.error('[GetVotes Action] Error:', error);
    return { success: false, error: error.message };
  }
}
