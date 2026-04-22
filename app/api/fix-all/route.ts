import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

  const results = { newsFixed: 0, photoFixed: 0, errors: [] as string[] };

  try {
    // 1. Fix News Videos
    try {
      const { data: articles } = await supabase.from('hot_issues').select('id, title, metadata').order('published_at', { ascending: false }).limit(6);
      if(articles) {
          for (const a of articles) {
              const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(a.title + ' K-POP official M/V')}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`);
              const txt = await ytRes.text();
              const ytData = JSON.parse(txt);
              if (ytData.items && ytData.items.length > 0) {
                  const vid = ytData.items[0].id.videoId;
                  await supabase.from('hot_issues').update({ youtube_id: vid }).eq('id', a.id);
                  results.newsFixed++;
              } else {
                  results.errors.push(`News Video missing for ${a.title}`);
              }
          }
      }
    } catch(err: any) { throw new Error(`YouTube Fetch Error: ${err.message}`) }

    // 2. Fix Album Arts
    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
              'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
      });
      const tokenTxt = await tokenRes.text();
      if (!tokenTxt.startsWith('{')) {
          return NextResponse.json({ error: 'Spotify returned non-JSON: ' + tokenTxt }, { status: 200 });
      }
      const tokenData = JSON.parse(tokenTxt);
      
      if (tokenData.access_token) {
          const playlistRes = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX9tPFwDMOaN1/tracks?limit=50', {
              headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
          });
          const playlistData = await playlistRes.json();
          
          const { data: dbTracks } = await supabase.from('kpop_charts').select('id, title');
          if (dbTracks && playlistData.items) {
              for (const item of playlistData.items) {
                  if (!item.track) continue;
                  const dbTrack = dbTracks.find((t:any) => t.title.toLowerCase() === item.track.name.toLowerCase());
                  if (dbTrack && item.track.album.images.length > 0) {
                      const url = item.track.album.images[0].url;
                      await supabase.from('kpop_charts').update({ album_art: url }).eq('id', dbTrack.id);
                      results.photoFixed++;
                  }
              }
          }
      } else {
          results.errors.push('Spotify Token failed: ' + tokenTxt);
      }
    } catch(err: any) { throw new Error(`Spotify Fetch Error: ${err.message}`) }

    return NextResponse.json(results);
  } catch(e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 200 });
  }
}
