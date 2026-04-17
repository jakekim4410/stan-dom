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
    
    // en-US 포맷은 "MM/DD/YYYY" 형태로 반환됨
    const [month, day, year] = kstDateString.split('/');
    const targetMd = `${month}-${day}`;

    // 1. Fetch artists whose birthday matches MM-DD
    // Using postgres string matching logic because birthday is Type DATE (YYYY-MM-DD)
    const { data: artists, error: artError } = await supabase
      .from('artists')
      .select('id, name, image_url, birthday')
      .not('birthday', 'is', null);

    if (artError) throw artError;

    // 2. Fetch members whose birthday matches MM-DD
    const { data: members, error: memError } = await supabase
      .from('members')
      .select('id, artist_id, name, birthday, image_url')
      .not('birthday', 'is', null);

    if (memError) throw memError;

    const todayArtists = (artists || []).filter(a => a.birthday?.slice(5) === targetMd);
    const todayMembers = (members || []).filter(m => m.birthday?.slice(5) === targetMd);

    return { 
      success: true, 
      birthdays: [
        ...todayArtists.map(a => ({ ...a, type: 'artist' as const })),
        ...todayMembers.map(m => ({ ...m, type: 'member' as const }))
      ] 
    };
  } catch (error: any) {
    console.error('Error fetching today birthdays:', error);
    return { success: false, error: error.message };
  }
}
