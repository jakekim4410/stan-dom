'use server';

import { createClient } from '@/utils/supabase/server';

export async function getTodayBirthdays() {
  try {
    const supabase = await createClient();
    const now = new Date();
    // 🇰🇷 KST(한국 시간) 강제 고정: Vercel 서버(UTC)나 클라이언트 위치와 무관하게 K-Pop 기준 적용
    const kstDateString = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const kstTomorrowString = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(tomorrow);
    
    // en-US 포맷은 "MM/DD/YYYY" 형태로 반환됨
    const [month, day, year] = kstDateString.split('/');
    const targetMd = `${month}-${day}`;

    const [tMonth, tDay, tYear] = kstTomorrowString.split('/');
    const tomorrowMd = `${tMonth}-${tDay}`;

    // 1. Fetch all artists and members with birthdays (We can optimize later if table grows, but for now filtering in memory is fine given the small datasets)
    const { data: artists, error: artError } = await supabase
      .from('artists')
      .select('id, name, image_url, birthday')
      .not('birthday', 'is', null);

    if (artError) throw artError;

    const { data: members, error: memError } = await supabase
      .from('members')
      .select('id, artist_id, name, birthday, image_url')
      .not('birthday', 'is', null);

    if (memError) throw memError;

    const todayArtists = (artists || []).filter(a => a.birthday?.slice(5) === targetMd).map(a => ({ ...a, type: 'artist' as const, isUpcoming: false }));
    const tomorrowArtists = (artists || []).filter(a => a.birthday?.slice(5) === tomorrowMd).map(a => ({ ...a, type: 'artist' as const, isUpcoming: true }));

    const todayMembers = (members || []).filter(m => m.birthday?.slice(5) === targetMd).map(m => ({ ...m, type: 'member' as const, isUpcoming: false }));
    const tomorrowMembers = (members || []).filter(m => m.birthday?.slice(5) === tomorrowMd).map(m => ({ ...m, type: 'member' as const, isUpcoming: true }));

    // 합치기 (오늘 생일자 먼저 보여주고, 그 다음이 내일 생일자)
    return { 
      success: true, 
      birthdays: [
        ...todayArtists,
        ...todayMembers,
        ...tomorrowArtists,
        ...tomorrowMembers
      ] 
    };
  } catch (error: any) {
    console.error('Error fetching today birthdays:', error);
    return { success: false, error: error.message };
  }
}
