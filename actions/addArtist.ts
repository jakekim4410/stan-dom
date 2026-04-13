'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getArtistImage } from '@/lib/deezer';

export async function addArtist(artistName: string, providedImageUrl?: string | null) {
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

    // 2. Insert into Supabase
    const { data, error } = await supabase
      .from('artists')
      .insert({
        name: cleanName,
        image_url: imageUrl || null,
        total_votes: 0
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Revalidate
    revalidatePath('/');
    
    return { 
      success: true, 
      artist: data, 
      spotifyImageFound: !!imageUrl 
    };
  } catch (error: any) {
    console.error('Add Artist Server Action Error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}


