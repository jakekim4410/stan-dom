import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getDeezerArtistImage(name) {
  try {
    const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`);
    const data = await res.json();
    return data?.data?.[0]?.picture_xl || data?.data?.[0]?.picture_big || null;
  } catch (e) {
    return null;
  }
}

async function getDeezerTrackImage(title, artist) {
  try {
    const res = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(`${artist} ${title}`)}&limit=1`);
    const data = await res.json();
    return data?.data?.[0]?.album?.cover_xl || data?.data?.[0]?.album?.cover_big || null;
  } catch (e) {
    return null;
  }
}

async function fixImages() {
  console.log('🖼️ Fixing Artist Images...');
  const battleArtists = ['NCT WISH', 'NEXZ', 'ALL(H)OURS'];
  for (const name of battleArtists) {
    const imageUrl = await getDeezerArtistImage(name);
    if (imageUrl) {
      console.log(`✅ Found image for ${name}: ${imageUrl}`);
      await supabase.from('artists').update({ image_url: imageUrl }).ilike('name', `%${name}%`);
    } else {
      console.log(`❌ No image found for ${name}`);
    }
  }

  console.log('\n🎵 Fixing Music Chart (kpop_charts) Images...');
  const { data: chartTracks } = await supabase.from('kpop_charts').select('id, title, artist, album_art');
  
  for (const track of chartTracks) {
    // If image is missing or looks like it might be broken/generic
    if (!track.album_art || track.album_art.includes('default') || track.album_art.length < 10) {
      const imageUrl = await getDeezerTrackImage(track.title, track.artist);
      if (imageUrl) {
        console.log(`✅ Found image for ${track.artist} - ${track.title}: ${imageUrl}`);
        await supabase.from('kpop_charts').update({ album_art: imageUrl }).eq('id', track.id);
      }
    }
  }

  console.log('\n🚀 Image Fix Complete.');
}

fixImages();
