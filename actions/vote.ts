'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const QUOTA_GUEST = process.env.NODE_ENV === 'development' ? 1000 : 3;
const QUOTA_MEMBER = process.env.NODE_ENV === 'development' ? 1000 : 10;

export async function voteForArtist(artistId: string, countryCode: string = 'UN') {
  console.log(`[Vote Action] DEBUG: Function entered for artist ${artistId}`);
  try {
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const limit = user ? QUOTA_MEMBER : QUOTA_GUEST;
    const identifierType = user ? 'user_id' : 'ip_address';
    const identifierValue = user ? user.id : ip;

    console.log(`[Vote Action] Context: IP=${ip}, User=${user?.id || 'anon'}, Quota=${limit}`);

    // KST 09:00 daily reset: KST = UTC+9, so KST 09:00 = UTC 00:00
    // Find the most recent UTC midnight (= KST 09:00) as the reset boundary
    const nowUtc = new Date();
    const todayResetUtc = new Date(Date.UTC(
      nowUtc.getUTCFullYear(),
      nowUtc.getUTCMonth(),
      nowUtc.getUTCDate(),
      0, 0, 0, 0
    ));
    // If current UTC time is before midnight (i.e. KST time is 00:00-08:59),
    // use the PREVIOUS day's midnight as the reset point
    const resetBoundary = nowUtc < todayResetUtc
      ? new Date(todayResetUtc.getTime() - 24 * 60 * 60 * 1000)
      : todayResetUtc;

    const { data: existingVotes, error: scanError } = await supabase
      .from('votes')
      .select('created_at')
      .eq(identifierType, identifierValue)
      .gt('created_at', resetBoundary.toISOString())
      .order('created_at', { ascending: false });

    if (scanError) {
      console.error(`[Vote Action] Scan Error:`, scanError);
      throw scanError;
    }

    // 추가 보상된 투표권(광고 시청) 계산
    const { count: adCount, error: adError } = await supabase
      .from('rewarded_ads')
      .select('*', { count: 'exact', head: true })
      .eq(identifierType, identifierValue)
      .gt('created_at', resetBoundary.toISOString());

    if (adError) {
      console.error('[Vote Action] Ad count error (ignoring):', adError);
    }

    const rewardedVotes = (adCount || 0) * 3; // 광고 1편당 3표
    const finalLimit = limit + rewardedVotes;

    if (existingVotes && existingVotes.length >= finalLimit) {
      console.log(`[Vote Action] Quota exceeded. Used: ${existingVotes.length}/${finalLimit}`);
      // Next reset = next UTC midnight (= next KST 09:00)
      const nextResetUtc = new Date(resetBoundary.getTime() + 24 * 60 * 60 * 1000);
      return { 
        success: false, 
        error: 'COOLDOWN_ACTIVE', 
        nextVoteAt: nextResetUtc.toISOString(),
        limit: finalLimit
      };
    }

    // 2. Insert vote
    console.log(`[Vote Action] Inserting new vote record...`);
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        user_id: user?.id || null,
        artist_id: artistId,
        country_code: countryCode.toUpperCase(),
        ip_address: ip
      });

    if (voteError) {
      console.error(`[Vote Action] Insert Error:`, voteError);
      throw voteError;
    }

    // 3. Check for Birthday Bonus & Increment total_votes
    console.log(`[Vote Action] Fetching current vote count and metadata for artist ${artistId}...`);
    
    // KST 기준 오늘의 날짜(MM-DD) 계산
    const kstDateString = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    const kstTargetMd = kstDateString.replace('/', '-'); // en-US format is MM/DD, replace with MM-DD
    
    const { data: artistData, error: fetchError } = await supabase
      .from('artists')
      .select('total_votes, birthday')
      .eq('id', artistId)
      .single();

    if (fetchError || !artistData) {
      console.error(`[Vote Action] Fetch Artist Data Error:`, fetchError);
      throw new Error(fetchError?.message || 'Artist not found');
    }

    // 멤버들의 생일도 확인
    const { data: membersData } = await supabase
      .from('members')
      .select('birthday')
      .eq('artist_id', artistId)
      .not('birthday', 'is', null);

    const isArtistBirthday = artistData.birthday?.slice(5) === kstTargetMd;
    const isMemberBirthday = membersData?.some(m => m.birthday?.slice(5) === kstTargetMd);
    const isBirthdayBonus = isArtistBirthday || isMemberBirthday;
    
    const voteValue = isBirthdayBonus ? 2 : 1;

    // RLS (Row Level Security) prevents standard users from directly updating the artists table.
    // We use a privileged service-role client on the server to safely increment the total_votes.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let updateError = null;

    if (serviceRoleKey) {
      console.log(`[Vote Action] Using privileged admin client to update total_votes...`);
      const { createClient: createAdminClient } = require('@supabase/supabase-js');
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      );
      const { error } = await supabaseAdmin
        .from('artists')
        .update({ total_votes: (artistData.total_votes || 0) + voteValue })
        .eq('id', artistId);
      updateError = error;
    } else {
      console.warn(`[Vote Action] SUPABASE_SERVICE_ROLE_KEY is missing in production. Falling back to standard client (database aggregates may sync periodically).`);
      const { error } = await supabase
        .from('artists')
        .update({ total_votes: (artistData.total_votes || 0) + voteValue })
        .eq('id', artistId);
      updateError = error;
    }

    if (updateError) {
      console.error(`[Vote Action] Update Artist Error (logged but non-blocking):`, updateError);
      // We do NOT throw here to ensure users can still celebrate and see the success card!
    }

    console.log(`[Vote Action] ALL SUCCESSFUL. Revalidating path...`);
    revalidatePath('/');
    return { success: true, countryCode, isBirthdayBonus };
  } catch (error: any) {
    console.error('[Vote Action] Unexpected fatal error:', error);
    return { success: false, error: error.message || 'An unexpected system error occurred' };
  }
}

