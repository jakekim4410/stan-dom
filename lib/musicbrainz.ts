/**
 * MusicBrainz API Utility for K-Pop Birthdays and Members
 * Documentation: https://musicbrainz.org/doc/MusicBrainz_API
 */

export interface MBArtist {
  id: string;
  name: string;
  birthday: string | null;
  members?: MBMember[];
}

export interface MBMember {
  name: string;
  birthday: string | null;
}

const MB_BASE_URL = 'https://musicbrainz.org/ws/2';

/**
 * Searches for an artist's MBID by name
 */
export async function searchMusicBrainzArtist(name: string): Promise<string | null> {
  try {
    const url = `${MB_BASE_URL}/artist/?query=artist:${encodeURIComponent(name)}&fmt=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'STAN-DOM/1.0.0 ( contact@standom.online )' }
    });
    const data = await res.json();
    
    // Pick the first result that is a 'Group' or 'Person' and has a name match
    const match = data.artists?.find((a: any) => 
      a.name.toLowerCase() === name.toLowerCase() && 
      (a.type === 'Group' || a.type === 'Person')
    );

    return match ? match.id : (data.artists?.[0]?.id || null);
  } catch (error) {
    console.error('MusicBrainz Search Error:', error);
    return null;
  }
}

/**
 * Fetches birth-date and member list for a given MBID
 * Note: MB Rate limits to 1 req/sec. We use this primarily on the server.
 */
export async function getArtistAndMembers(mbid: string): Promise<MBArtist | null> {
  try {
    const url = `${MB_BASE_URL}/artist/${mbid}?inc=artist-rels&fmt=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'STAN-DOM/1.0.0 ( contact@standom.online )' }
    });
    const data = await res.json();

    const artist: MBArtist = {
      id: data.id,
      name: data.name,
      birthday: data['life-span']?.begin || null,
      members: []
    };

    // Filter relations for 'member of band' (backward means the person belongs to the group)
    const memberRels = data.relations?.filter((rel: any) => 
      rel.type === 'member of band' && 
      rel.direction === 'backward' &&
      rel.artist
    );

    if (memberRels && memberRels.length > 0) {
      // For each member, we need their individual birthday. 
      // Since fetching each one is slow, we'll suggest a "Sync" button later 
      // or try to fetch the top 5 here if needed.
      // For now, we collect names and IDs.
      artist.members = memberRels.map((rel: any) => ({
        name: rel.artist.name,
        birthday: null // Will be updated individually or via secondary sync
      }));
    }

    return artist;
  } catch (error) {
    console.error('MusicBrainz Detail Error:', error);
    return null;
  }
}

/**
 * Batch-friendly way to get a specific person's birthday by name
 * Useful for syncing members
 */
export async function getPersonBirthday(name: string): Promise<string | null> {
  const mbid = await searchMusicBrainzArtist(name);
  if (!mbid) return null;
  
  const url = `${MB_BASE_URL}/artist/${mbid}?fmt=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'STAN-DOM/1.0.0 ( contact@standom.online )' }
  });
  const data = await res.json();
  return data['life-span']?.begin || null;
}
