'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getArtistImage } from '@/lib/deezer';
import { searchMusicBrainzArtist, getArtistAndMembers } from '@/lib/musicbrainz';

export async function addArtist(artistName: string, providedImageUrl?: string | null, manualBirthday?: string | null) {
  if (!artistName || typeof artistName !== 'string') {
    return { success: false, error: 'Invalid artist name provided.' };
  }

  const cleanName = artistName.trim();
  if (cleanName.length === 0) {
    return { success: false, error: 'Artist name cannot be empty.' };
  }

  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'AUTHENTICATION_REQUIRED' };
    }

    // 0. Check for exact duplicate in DB (Case-Insensitive)
    const { data: existing } = await supabase
      .from('artists')
      .select('id, name')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      return { 
        success: false, 
        error: 'DUPLICATE_NODE_DETECTED', 
        existingId: existing.id,
        existingName: existing.name
      };
    }

    // 1. Resolve image URL (use provided one, or fetch dynamically)
    let imageUrl = providedImageUrl;
    if (!imageUrl) {
      imageUrl = await getArtistImage(cleanName) || null;
    }

    // 1.5 Sync with MusicBrainz for Birthday and Members
    let birthday = manualBirthday;
    let members: { name: string; birthday: string | null }[] = [];

    const mbid = await searchMusicBrainzArtist(cleanName);
    if (mbid) {
      const mbData = await getArtistAndMembers(mbid);
      if (mbData) {
        if (!birthday) birthday = mbData.birthday;
        if (mbData.members) members = mbData.members;
      }
    }

    // 2. Insert into Supabase (Artists Table)
    const { data: artistData, error } = await supabase
      .from('artists')
      .insert({
        name: cleanName,
        image_url: imageUrl || null,
        total_votes: 0,
        birthday: birthday || null
      })
      .select()
      .single();

    if (error) throw error;

    // 2.5 Insert Members into Supabase
    if (artistData && members.length > 0) {
      const membersToInsert = members.map(m => ({
        artist_id: artistData.id,
        name: m.name,
        birthday: m.birthday
      }));
      
      await supabase.from('members').insert(membersToInsert);
    }

    // 3. Revalidate
    revalidatePath('/');
    
    return { 
      success: true, 
      artist: artistData, 
      spotifyImageFound: !!imageUrl 
    };
  } catch (error: any) {
    console.error('Add Artist Server Action Error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}


