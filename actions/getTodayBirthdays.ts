'use server';

import { createClient } from '@/utils/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export async function getTodayBirthdays() {
  try {
    noStore();
    const supabase = await createClient();
    const now = new Date();
    // 🇰🇷 KST(한국 시간) 강제 고정: Vercel 서버(UTC)나 클라이언트 위치와 무관하게 K-Pop 기준 적용
    const kstParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);
    
    const month = kstParts.find(p => p.type === 'month')?.value;
    const day = kstParts.find(p => p.type === 'day')?.value;
    const targetMd = `${month}-${day}`;

    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const kstTomorrowParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(tomorrow);

    const tMonth = kstTomorrowParts.find(p => p.type === 'month')?.value;
    const tDay = kstTomorrowParts.find(p => p.type === 'day')?.value;
    const tomorrowMd = `${tMonth}-${tDay}`;

    // 1. Fetch all artists and members with birthdays (We can optimize later if table grows, but for now filtering in memory is fine given the small datasets)
    const { data: artists, error: artError } = await supabase
      .from('artists')
      .select('id, name, image_url, birthday')
      .not('birthday', 'is', null);

    if (artError) throw artError;

    const { data: members, error: memError } = await supabase
      .from('members')
      .select('id, artist_id, name, birthday, image_url, artists(name)')
      .not('birthday', 'is', null);

    if (memError) throw memError;

    const todayArtists = (artists || []).filter(a => a.birthday?.slice(5) === targetMd).map(a => ({ 
      ...a, 
      type: 'artist' as const, 
      isUpcoming: false,
      artist_name: null // Solo artists don't have a parent group name in this context
    }));
    
    const tomorrowArtists = (artists || []).filter(a => a.birthday?.slice(5) === tomorrowMd).map(a => ({ 
      ...a, 
      type: 'artist' as const, 
      isUpcoming: true,
      artist_name: null
    }));

    const todayMembers = (members || []).filter(m => m.birthday?.slice(5) === targetMd).map(m => ({ 
      ...m, 
      type: 'member' as const, 
      isUpcoming: false,
      artist_name: (m.artists as any)?.name || null
    }));

    const tomorrowMembers = (members || []).filter(m => m.birthday?.slice(5) === tomorrowMd).map(m => ({ 
      ...m, 
      type: 'member' as const, 
      isUpcoming: true,
      artist_name: (m.artists as any)?.name || null
    }));

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
