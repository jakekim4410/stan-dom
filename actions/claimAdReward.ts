'use server';

import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';

const MAX_ADS_PER_DAY = 10; // 하루 최대 10번 광고 시청 가능 (총 30표 추가)

export async function claimAdReward() {
  try {
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const identifierType = user ? 'user_id' : 'ip_address';
    const identifierValue = user ? user.id : ip;

    // KST 09:00 daily reset
    const nowUtc = new Date();
    const todayResetUtc = new Date(Date.UTC(
      nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(),
      0, 0, 0, 0
    ));
    const resetBoundary = nowUtc < todayResetUtc
      ? new Date(todayResetUtc.getTime() - 24 * 60 * 60 * 1000)
      : todayResetUtc;

    // 1. 오늘 이미 몇 번 봤는지 확인
    const { count, error: countError } = await supabase
      .from('rewarded_ads')
      .select('*', { count: 'exact', head: true })
      .eq(identifierType, identifierValue)
      .gt('created_at', resetBoundary.toISOString());

    if (countError) throw countError;

    if ((count || 0) >= MAX_ADS_PER_DAY) {
      return { success: false, error: 'Daily ad limit reached' };
    }

    // 2. 기록 추가
    const { error: insertError } = await supabase
      .from('rewarded_ads')
      .insert({
        user_id: user ? user.id : null,
        ip_address: ip
      });

    if (insertError) throw insertError;

    return { success: true, message: 'Reward claimed successfully!' };
  } catch (error: any) {
    console.error('[claimAdReward] Error:', error);
    return { success: false, error: error.message };
  }
}
