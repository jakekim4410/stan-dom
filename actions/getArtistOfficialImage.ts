'use server';

import { getArtistImage } from '@/lib/deezer';

export async function getArtistOfficialImage(artistName: string) {
  try {
    const imageUrl = await getArtistImage(artistName);
    return { success: true, imageUrl };
  } catch (error: any) {
    console.error('[Action] getArtistOfficialImage error:', error.message);
    return { success: false, error: error.message };
  }
}
