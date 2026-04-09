const SUPABASE_URL = 'https://bgwttxtohumpceoqadpu.supabase.co';
const ANON_KEY = 'sb_publishable_nxbWVd_Vk4fiTVfQ1QafZA_CfAIWHX6'; // Using Anon key (RLS is disabled as per user screenshot)

async function syncAll() {
  console.log('🚀 Starting Comprehensive Artist Sync...');

  try {
    // 1. Fetch all artists
    const artistRes = await fetch(`${SUPABASE_URL}/rest/v1/artists?select=id,name,image_url`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    });
    const artists = await artistRes.json();
    console.log(`Found ${artists.length} artists in database.`);

    // 2. Fetch all votes to aggregate locally (more efficient than 100 separate count queries)
    const voteRes = await fetch(`${SUPABASE_URL}/rest/v1/votes?select=artist_id`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    });
    const votes = await voteRes.json();
    
    const voteMap = {};
    votes.forEach(v => {
      voteMap[v.artist_id] = (voteMap[v.artist_id] || 0) + 1;
    });

    console.log(`Synced ${votes.length} total raw votes.`);

    // 3. Process each artist
    for (let i = 0; i < artists.length; i++) {
      const a = artists[i];
      const realVotes = voteMap[a.id] || 0;
      
      console.log(`[${i+1}/${artists.length}] Processing ${a.name}...`);

      let newImageUrl = a.image_url;

      // Only fetch image if it's missing or from a placeholder
      if (!newImageUrl || newImageUrl.includes('placeholder') || newImageUrl.includes('example.com')) {
        try {
          const query = encodeURIComponent(a.name);
          const dRes = await fetch(`https://api.deezer.com/search/artist?q=${query}&limit=1`);
          const dData = await dRes.json();
          if (dData?.data?.[0]) {
            newImageUrl = dData.data[0].picture_xl || dData.data[0].picture_big || dData.data[0].picture_medium;
            console.log(`   📸 Image found: ${a.name}`);
          }
        } catch (err) {
          console.error(`   ❌ Image fetch failed for ${a.name}`);
        }
        // Small delay for rate limit
        await new Promise(r => setTimeout(r, 100));
      }

      // Update the artist entry
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/artists?id=eq.${a.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          total_votes: realVotes,
          image_url: newImageUrl
        })
      });

      if (!updateRes.ok) {
        console.error(`   ❌ Update failed for ${a.name}:`, await updateRes.text());
      }
    }

    console.log('✨ ALL SYNC TASKS COMPLETE!');

  } catch (error) {
    console.error('Fatal sync error:', error);
  }
}

syncAll();
