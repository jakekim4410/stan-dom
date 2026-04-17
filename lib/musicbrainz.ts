/**
 * MusicBrainz API Utility for K-Pop Birthdays and Members
 * Documentation: https://musicbrainz.org/doc/MusicBrainz_API
 */

export interface MBArtist {
  id: string;
  name: string; // JSON string
  birthday: string | null;
  members?: MBMember[];
}

export interface MBMember {
  name: string; // JSON string
  birthday: string | null;
}

export interface MBAlias {
  name: string;
  locale: string | null;
  primary: boolean | null;
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
    const url = `${MB_BASE_URL}/artist/${mbid}?inc=artist-rels+aliases&fmt=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'STAN-DOM/1.0.0 ( contact@standom.online )' }
    });
    const data = await res.json();

    const artist: MBArtist = {
      id: data.id,
      name: JSON.stringify(getNameMap(data.name, data.aliases || [])),
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
      artist.members = memberRels.map((rel: any) => ({
        name: JSON.stringify(getNameMap(rel.artist.name, rel.artist.aliases || [])),
        birthday: null
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
export async function getPersonBirthday(name: string): Promise<any> {
  const mbid = await searchMusicBrainzArtist(name);
  if (!mbid) return { birthday: null, aliases: [] };
  const url = `${MB_BASE_URL}/artist/${mbid}?inc=aliases&fmt=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'STAN-DOM/1.0.0 ( contact@standom.online )' }
  });
  const data = await res.json();
  return {
    birthday: data['life-span']?.begin || null,
    aliases: data.aliases || []
  };
}

/**
 * Extracts a name map from aliases, favoring primary or locale-specific names
 */
export function getNameMap(defaultName: string, aliases: MBAlias[]): Record<string, string> {
  const map: Record<string, string> = { EN: defaultName, KO: defaultName, ES: defaultName };
  
  // Try to find Korean name
  const ko = aliases.find(a => a.locale === 'ko' || (a.name.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/)));
  if (ko) map.KO = ko.name;

  // Try to find English name
  const en = aliases.find(a => a.locale === 'en');
  if (en) {
    map.EN = en.name;
    map.ES = en.name; 
  } else if (!defaultName.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/) && defaultName.match(/[a-zA-Z]/)) {
    // If default name is already Latin, use it for EN/ES
    map.EN = defaultName;
    map.ES = defaultName;
  }

  return map;
}
