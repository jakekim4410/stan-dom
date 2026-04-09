'use server';

/**
 * Fetches the top track for a specific artist from Deezer.
 *
 * Strategy 1: Artist ID → top tracklist (most reliable).
 * Strategy 2: General track search filtered strictly by artist name match.
 * If both fail (e.g. HYBE artists like BTS have no Deezer license),
 * returns success: false so the UI can show a graceful "No preview" message.
 */
export async function getArtistTopTrack(artistName: string) {
  try {
    const query = encodeURIComponent(artistName);
    const nameLower = artistName.toLowerCase();

    // ── Strategy 1: Artist ID → /top tracklist ─────────────────────────────
    const searchRes = await fetch(`https://api.deezer.com/search/artist?q=${query}&limit=1`);
    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.length > 0) {
      const artistId = searchData.data[0].id;
      const tracksRes = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=10`);
      const tracksData = await tracksRes.json();

      const track = tracksData.data?.find((t: any) => t.preview);
      if (track) {
        return {
          success: true,
          track: {
            id: track.id,
            title: track.title,
            preview: track.preview,
            albumCover: track.album?.cover_xl || track.album?.cover_medium,
            link: track.link,
          },
        };
      }
    }

    // ── Strategy 2: General track search with strict artist name matching ───
    const fallbackRes = await fetch(`https://api.deezer.com/search/track?q=${query}&limit=25`);
    const fallbackData = await fallbackRes.json();

    const fallbackTrack = fallbackData.data?.find(
      (t: any) => t.preview && t.artist?.name?.toLowerCase() === nameLower
    );

    if (fallbackTrack) {
      return {
        success: true,
        track: {
          id: fallbackTrack.id,
          title: fallbackTrack.title,
          preview: fallbackTrack.preview,
          albumCover: fallbackTrack.album?.cover_xl || fallbackTrack.album?.cover_medium,
          link: fallbackTrack.link,
        },
      };
    }

    // ── No previewable tracks found (licensing restriction) ─────────────────
    return {
      success: false,
      error: 'No previewable audio license available for this artist on Deezer.',
    };
  } catch (error: any) {
    console.error('getArtistTopTrack error:', error);
    return { success: false, error: 'Network failure fetching audio data.' };
  }
}
