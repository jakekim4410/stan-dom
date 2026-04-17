'use server';

import { createClient } from '@/utils/supabase/server';

export async function getMonthlyBirthdays() {
  try {
    const supabase = await createClient();
    
    // KST 기준으로 현재 달(Month) 계산
    const now = new Date();
    const kstMonthStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      month: '2-digit'
    }).format(now);
    
    const targetMonth = kstMonthStr;

    // 1. Fetch artists whose birthday matches MM
    const { data: artists, error: artError } = await supabase
      .from('artists')
      .select('id, name, image_url, birthday')
      .not('birthday', 'is', null);

    if (artError) throw artError;

    // 2. Fetch members whose birthday matches MM
    const { data: members, error: memError } = await supabase
      .from('members')
      .select('id, artist_id, name, birthday, image_url')
      .not('birthday', 'is', null);

    if (memError) throw memError;

    const monthArtists = (artists || [])
      .filter(a => a.birthday?.slice(5, 7) === targetMonth)
      .map(a => ({ ...a, type: 'artist' as const }));
      
    const monthMembers = (members || [])
      .filter(m => m.birthday?.slice(5, 7) === targetMonth)
      .map(m => ({ ...m, type: 'member' as const }));

    // Combine and sort chronologically by day
    const combined = [...monthArtists, ...monthMembers].sort((a, b) => {
      const dayA = a.birthday!.slice(8, 10);
      const dayB = b.birthday!.slice(8, 10);
      return dayA.localeCompare(dayB);
    });

    return { success: true, birthdays: combined, currentMonth: parseInt(targetMonth, 10) };
  } catch (error: any) {
    console.error('Error fetching monthly birthdays:', error);
    return { success: false, error: error.message };
  }
}
