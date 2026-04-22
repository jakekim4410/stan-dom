import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const tokenData = await tokenRes.json();
  if(!tokenData.access_token) {
    console.error('No token', tokenData);
    process.exit(1);
  }
  
  const playlistRes = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX4JAvhLs9Zqr/tracks?limit=50', {
    headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
  });
  const playlistData = await playlistRes.json();
  
  const { data: dbTracks } = await supabase.from('kpop_charts').select('id, title');
  
  let count = 0;
  for (const track of playlistData.items) {
    if (!track.track) continue;
    const dbTrack = dbTracks.find(t => t.title.toLowerCase() === track.track.name.toLowerCase());
    if (dbTrack) {
        const url = track.track.album.images[0].url;
        await supabase.from('kpop_charts').update({ album_art: url }).eq('id', dbTrack.id);
        console.log('Fixed', track.track.name);
        count++;
    }
  }
  console.log('Total fixed:', count);
  process.exit(0);
}
run();
