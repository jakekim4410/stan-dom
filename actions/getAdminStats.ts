'use server';

import { createClient } from '@/utils/supabase/server';

export async function getAdminStats() {
  try {
    const supabase = await createClient();
    
    // Admin check: Only allow authenticated admins (jakekim4410 or others)
    const { data: { user } } = await supabase.auth.getUser();
    
    // We can allow public access in development, but secure it in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowedAdminEmails = ['jakekim4410@gmail.com', 'jakekim4410@naver.com', 'richg98@naver.com'];
    
    if (!isDevelopment && (!user || !user.email || !allowedAdminEmails.includes(user.email))) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    // 1. Fetch all votes to compute UV and country distributions
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('id, ip_address, country_code, created_at, user_id, artists(name)')
      .order('created_at', { ascending: false });

    if (votesError) throw votesError;

    // 2. Fetch all rewarded ads
    const { data: ads, error: adsError } = await supabase
      .from('rewarded_ads')
      .select('id, ip_address, created_at, user_id')
      .order('created_at', { ascending: false });

    if (adsError) throw adsError;

    // 3. Fetch total counts from artists
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('name, total_votes')
      .order('total_votes', { ascending: false });

    if (artistsError) throw artistsError;

    // 4. Fetch total comments
    const { count: totalComments, error: commentsError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });

    if (commentsError) throw commentsError;

    // --- Statistics computation ---
    const allIps = new Set<string>();
    const voteIps = new Set<string>();
    const adIps = new Set<string>();
    const activeUsers = new Set<string>();

    // Country distribution
    const countryVotes: Record<string, number> = {};
    votes.forEach(vote => {
      if (vote.ip_address) {
        allIps.add(vote.ip_address);
        voteIps.add(vote.ip_address);
      }
      if (vote.user_id) {
        activeUsers.add(vote.user_id);
      }
      const country = vote.country_code || 'UNKNOWN';
      countryVotes[country] = (countryVotes[country] || 0) + 1;
    });

    ads.forEach(ad => {
      if (ad.ip_address) {
        allIps.add(ad.ip_address);
        adIps.add(ad.ip_address);
      }
      if (ad.user_id) {
        activeUsers.add(ad.user_id);
      }
    });

    // Recent activity log (Merge votes and ads into a single feed)
    const recentActivities: any[] = [];
    
    votes.slice(0, 10).forEach(vote => {
      recentActivities.push({
        type: 'VOTE',
        time: vote.created_at,
        country: vote.country_code || 'UN',
        target: (vote.artists as any)?.name || '아티스트',
        userType: vote.user_id ? '회원' : '게스트'
      });
    });

    ads.slice(0, 10).forEach(ad => {
      recentActivities.push({
        type: 'AD_REWARD',
        time: ad.created_at,
        country: 'APP',
        target: '3 볼티지 적립',
        userType: ad.user_id ? '회원' : '게스트'
      });
    });

    // Sort combined activity by time
    recentActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return {
      success: true,
      stats: {
        totalUniqueVisitors: allIps.size,
        votingUniqueVisitors: voteIps.size,
        adUniqueVisitors: adIps.size,
        totalVotes: votes.length,
        totalAdRewards: ads.length,
        totalComments: totalComments || 0,
        activeMemberAccounts: activeUsers.size,
        countryVotes: Object.entries(countryVotes)
          .map(([code, count]) => ({ code, count }))
          .sort((a, b) => b.count - a.count),
        topArtists: artists.slice(0, 5),
        recentActivities: recentActivities.slice(0, 10)
      }
    };

  } catch (error: any) {
    console.error('[getAdminStats] Error:', error);
    return { success: false, error: error.message };
  }
}
