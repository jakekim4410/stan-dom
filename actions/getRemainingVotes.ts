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

    // KST 09:00 daily reset (KST = UTC+9, KST 09:00 = UTC 00:00)
    const nowUtc = new Date();
    const todayResetUtc = new Date(Date.UTC(
      nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(),
      0, 0, 0, 0
    ));
    const resetBoundary = nowUtc < todayResetUtc
      ? new Date(todayResetUtc.getTime() - 24 * 60 * 60 * 1000)
      : todayResetUtc;

    const { count, error } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq(identifierType, identifierValue)
      .gt('created_at', resetBoundary.toISOString());

    if (error) throw error;

    // 추가 보상된 투표권(광고 시청) 계산
    const { count: adCount, error: adError } = await supabase
      .from('rewarded_ads')
      .select('*', { count: 'exact', head: true })
      .eq(identifierType, identifierValue)
      .gt('created_at', resetBoundary.toISOString());

    if (adError) {
      console.error('[GetVotes Action] Ad count error (ignoring):', adError);
    }

    const rewardedVotes = (adCount || 0) * 3; // 광고 1편당 3표
    const finalLimit = limit + rewardedVotes;

    return { 
      success: true, 
      count: count || 0, 
      limit: finalLimit, 
      remaining: Math.max(0, finalLimit - (count || 0)),
      adViewsToday: adCount || 0
    };
  } catch (error: any) {
    console.error('[GetVotes Action] Error:', error);
    return { success: false, error: error.message };
  }
}
