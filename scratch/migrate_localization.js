const { createClient } = require('@supabase/supabase-js');
// Fetch is global in Node 24+

// CONFIG
const SUPABASE_URL = 'https://bgwttxtohumpceoqadpu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nxbWVd_Vk4fiTVfQ1QafZA_CfAIWHX6'; // NOTE: This is public key, might need service key for bulk updates if RLS is on.
// Since I don't have service key, I'll assume I can update if I have the rights or use the provided key if it allows updates.
// IF update fails, I will need the user to provide a service key or disable RLS temporarily.

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MB_BASE_URL = 'https://musicbrainz.org/ws/2';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getNameMap(defaultName, aliases) {
    const map = { EN: defaultName, KO: defaultName, ES: defaultName };
    
    // Find Korean
    const ko = aliases.find(a => a.locale === 'ko' || a.name.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/));
    if (ko) map.KO = ko.name;

    // Find English
    const en = aliases.find(a => a.locale === 'en');
    if (en) {
        map.EN = en.name;
        map.ES = en.name;
    } else if (!defaultName.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/) && defaultName.match(/[a-zA-Z]/)) {
        map.EN = defaultName;
        map.ES = defaultName;
    }
    
    return map;
}

async function migrate() {
    console.log('--- STARTING ARTIST NAME LOCALIZATION MIGRATION ---');

    // 1. Fetch all artists
    const { data: artists, error } = await supabase.from('artists').select('id, name');
    if (error) {
        console.error('Error fetching artists:', error);
        return;
    }

    console.log(`Found ${artists.length} artists to process.`);

    for (let i = 0; i < artists.length; i++) {
        const artist = artists[i];
        
        // Skip if already JSON
        if (artist.name.startsWith('{')) {
            console.log(`[${i+1}/${artists.length}] Skipping ${artist.name} (already JSON)`);
            continue;
        }

        console.log(`[${i+1}/${artists.length}] Processing ${artist.name}...`);
        
        try {
            // Search MusicBrainz
            const searchUrl = `${MB_BASE_URL}/artist/?query=artist:${encodeURIComponent(artist.name)}&fmt=json`;
            const sRes = await fetch(searchUrl, { headers: { 'User-Agent': 'STAN-DOM-Migration/1.0.0' }});
            const sData = await sRes.json();
            
            const match = sData.artists?.find(a => 
                a.name.toLowerCase() === artist.name.toLowerCase() || 
                a.aliases?.some(al => al.name.toLowerCase() === artist.name.toLowerCase())
            ) || sData.artists?.[0];

            if (match) {
                // Get detail with aliases
                await sleep(1000); // MB rate limit
                const detailUrl = `${MB_BASE_URL}/artist/${match.id}?inc=aliases&fmt=json`;
                const dRes = await fetch(detailUrl, { headers: { 'User-Agent': 'STAN-DOM-Migration/1.0.0' }});
                const dData = await dRes.json();
                
                const nameMap = getNameMap(artist.name, dData.aliases || []);
                const jsonName = JSON.stringify(nameMap);
                
                console.log(`   -> Localized: ${jsonName}`);
                
                const { error: uErr } = await supabase.from('artists').update({ name: jsonName }).eq('id', artist.id);
                if (uErr) console.error('   !! Update Error:', uErr.message);
            } else {
                // Just convert existing string to JSON map
                const nameMap = { EN: artist.name, KO: artist.name, ES: artist.name };
                const jsonName = JSON.stringify(nameMap);
                await supabase.from('artists').update({ name: jsonName }).eq('id', artist.id);
                console.log(`   -> Fell back to basic JSON: ${jsonName}`);
            }
        } catch (e) {
            console.error(`   !! Failed to process ${artist.name}:`, e.message);
        }

        await sleep(1000); // MusicBrainz rate limit
    }

    console.log('\n--- STARTING MEMBER FIX (SOLAR ETC) ---');
    const { data: members, error: mErr } = await supabase.from('members').select('id, name');
    
    for (const member of members) {
        if (member.name.includes('"EN":"솔라"')) {
             console.log(`Fixing Solar (${member.id})...`);
             const fixed = JSON.stringify({ EN: 'Solar', KO: '솔라', ES: 'Solar' });
             await supabase.from('members').update({ name: fixed }).eq('id', member.id);
        }
        // Add more fixes if needed
    }

    console.log('--- MIGRATION COMPLETE ---');
}

migrate();
