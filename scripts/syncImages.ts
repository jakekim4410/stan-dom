import { createClient } from '@supabase/supabase-js';
import { getArtistImage } from '../lib/deezer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function syncImages() {
  console.log('🔄 Fetching all artists...');
  const { data: artists, error } = await supabase.from('artists').select('*');
  if (error) throw error;

  for (const artist of artists) {
    if (!artist.image_url || artist.image_url.includes('placeholder.com')) {
      console.log(`🎵 Found legacy artist: ${artist.name}. Fetching Deezer image...`);
      const newUrl = await getArtistImage(artist.name);
      if (newUrl) {
        await supabase
          .from('artists')
          .update({ image_url: newUrl })
          .eq('id', artist.id);
        console.log(`✅ Updated ${artist.name} -> ${newUrl}`);
      } else {
        console.log(`❌ Failed to find image for ${artist.name}`);
      }
    }
  }
  console.log('🎉 Sync Complete!');
}

syncImages();
