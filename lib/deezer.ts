export interface DeezerArtist {
  id: string;
  name: string;
  imageUrl: string | null;
  followers: number;
}

export async function getArtistImage(artistName: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(artistName);
    const res = await fetch(`https://api.deezer.com/search/artist?q=${query}&limit=1`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error('Deezer Search API Error:', await res.text());
      return null;
    }

    const data = await res.json();
    if (data?.data && data.data.length > 0) {
      // 1. Try to find exact matches first (case-insensitive)
      const exactMatches = data.data.filter((a: any) => a.name.toLowerCase() === artistName.toLowerCase());
      
      // 2. If exact matches exist, use them. Otherwise, fallback to the partial matches.
      const targetPool = exactMatches.length > 0 ? exactMatches : data.data;

      // 3. Sort the resulting pool by nb_fan to ensure we get the most famous namesake
      const sortedArtists = targetPool.sort((a: any, b: any) => (b.nb_fan || 0) - (a.nb_fan || 0));
      return sortedArtists[0].picture_xl || sortedArtists[0].picture_big || sortedArtists[0].picture || null;
    }
  } catch (error) {
    console.error('Deezer Image Fetch Error:', error);
  }
  return null;
}

export async function searchDeezerArtists(query: string, limit = 5): Promise<DeezerArtist[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(`https://api.deezer.com/search/artist?q=${encodedQuery}&limit=${limit}`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error('Deezer Search API Error:', await res.text());
      return [];
    }

    const data = await res.json();
    if (data?.data) {
      // 1. Separate exact matches from partial matches
      const exactMatches = data.data.filter((a: any) => a.name.toLowerCase() === query.toLowerCase());
      const partialMatches = data.data.filter((a: any) => a.name.toLowerCase() !== query.toLowerCase());

      // 2. Sort both pools by nb_fan internally
      exactMatches.sort((a: any, b: any) => (b.nb_fan || 0) - (a.nb_fan || 0));
      partialMatches.sort((a: any, b: any) => (b.nb_fan || 0) - (a.nb_fan || 0));

      // 3. Combine them: Exact matches first, then partial matches.
      const sortedData = [...exactMatches, ...partialMatches];
      
      return sortedData.map((artist: any) => {
        return {
          id: String(artist.id),
          name: artist.name,
          // Use medium for thumbnail (250x250)
          imageUrl: artist.picture_medium || artist.picture,
          followers: artist.nb_fan || 0,
        };
      });
    }
  } catch (error) {
    console.error('Deezer Artists Search Error:', error);
  }
  return [];
}
