'use server';

import { createClient } from '@/utils/supabase/server';
import { searchMusicBrainzArtist, getArtistAndMembers, getPersonBirthday } from '@/lib/musicbrainz';
import { revalidatePath } from 'next/cache';

export async function syncArtistMetadata(artistId: string, artistName: string) {
  try {
    const supabase = await createClient();

    // 1. Search MusicBrainz
    const mbid = await searchMusicBrainzArtist(artistName);
    if (!mbid) return { success: false, error: 'NO_MATCH_FOUND' };

    const mbData = await getArtistAndMembers(mbid);
    if (!mbData) return { success: false, error: 'DATA_FETCH_FAILED' };

    // 2. Update Artist Birthday
    if (mbData.birthday) {
      await supabase
        .from('artists')
        .update({ birthday: mbData.birthday })
        .eq('id', artistId);
    }

    // 3. Handle Members
    if (mbData.members && mbData.members.length > 0) {
      // Clear existing members for this artist to avoid duplicates/stale data
      await supabase.from('members').delete().eq('artist_id', artistId);

      // Insert new members
      const membersToInsert = [];
      
      // Attempt to fetch individual birthdays for the first 10 members (rate limit consideration)
      for (const m of mbData.members.slice(0, 15)) {
        // Individual birthday fetch
        const bday = await getPersonBirthday(m.name);
        membersToInsert.push({
          artist_id: artistId,
          name: m.name,
          birthday: bday || null
        });
      }

      const { error: memError } = await supabase.from('members').insert(membersToInsert);
      if (memError) throw memError;
    }

    revalidatePath(`/artist/${artistId}`);
    revalidatePath('/');
    
    return { success: true };
  } catch (error: any) {
    console.error('Metadata Sync Error:', error);
    return { success: false, error: error.message };
  }
}
