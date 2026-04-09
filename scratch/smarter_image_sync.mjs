const SUPABASE_URL = 'https://bgwttxtohumpceoqadpu.supabase.co';
const ANON_KEY = 'sb_publishable_nxbWVd_Vk4fiTVfQ1QafZA_CfAIWHX6';

async function smarterSync() {
  console.log('🚀 Starting Smarter Artist Image Sync (K-POP Specialized)...');

  try {
    const artistRes = await fetch(`${SUPABASE_URL}/rest/v1/artists?select=id,name`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    });
    const artists = await artistRes.json();

    for (let i = 0; i < artists.length; i++) {
      const a = artists[i];
      console.log(`[${i+1}/${artists.length}] Refining ${a.name}...`);

      try {
        // Search with K-POP suffix for better precision
        const query = encodeURIComponent(a.name + " kpop");
        const dRes = await fetch(`https://api.deezer.com/search/artist?q=${query}&limit=5`);
        const dData = await dRes.json();
        
        if (dData?.data && dData.data.length > 0) {
          // Sort by fans to get the most famous namesake
          const bestMatch = dData.data.sort((x, y) => (y.nb_fan || 0) - (x.nb_fan || 0))[0];
          const newImageUrl = bestMatch.picture_xl || bestMatch.picture_big || bestMatch.picture_medium;

          if (bestMatch.name.toLowerCase().includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(bestMatch.name.toLowerCase())) {
             const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/artists?id=eq.${a.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`
              },
              body: JSON.stringify({ image_url: newImageUrl })
            });
            console.log(`   ✅ Best match found: ${bestMatch.name} (${bestMatch.nb_fan} fans)`);
          } else {
             console.log(`   ⚠️ Match mismatch: ${a.name} vs ${bestMatch.name}`);
          }
        }
      } catch (err) {
        console.error(`   ❌ Failed for ${a.name}`);
      }
      await new Promise(r => setTimeout(r, 100)); // Rate limit safety
    }

    console.log('✨ Smarter Sync Complete!');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

smarterSync();
