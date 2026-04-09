'use server';

import { searchDeezerArtists, DeezerArtist } from '@/lib/deezer';

export async function searchForArtists(query: string): Promise<{ success: boolean, results: DeezerArtist[], error?: string }> {
  try {
    if (!query || query.trim() === '') {
      return { success: true, results: [] };
    }
    
    const results = await searchDeezerArtists(query.trim(), 5);
    return { success: true, results };
  } catch (err: any) {
    console.error('Action error [searchForArtists]:', err);
    return { success: false, results: [], error: err.message };
  }
}
