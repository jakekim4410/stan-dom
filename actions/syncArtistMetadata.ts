'use server';

import { createClient } from '@/utils/supabase/server';
import { searchMusicBrainzArtist, getArtistAndMembers, getPersonBirthday, getNameMap } from '@/lib/musicbrainz';
import { revalidatePath } from 'next/cache';
import { getLangName } from '@/utils/localization';

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
      
      // Attempt to fetch individual birthdays for the first 15 members
      for (const m of mbData.members.slice(0, 15)) {
        const plainName = getLangName(m.name, 'EN');
        const mbPerson = await getPersonBirthday(plainName);
        
        // Use aliases from the member rel if available, else from direct lookup
        const aliases = (mbPerson as any).aliases || [];
        const nameMap = getNameMap(plainName, aliases);

        membersToInsert.push({
          artist_id: artistId,
          name: JSON.stringify(nameMap), // Store as JSON string
          birthday: (mbPerson as any).birthday || null
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
