'use server';

import { createClient } from '@/utils/supabase/server';

export async function getTodayBirthdays() {
  try {
    const supabase = await createClient();
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
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
