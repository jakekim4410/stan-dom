const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bgwttxtohumpceoqadpu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nxbWVd_Vk4fiTVfQ1QafZA_CfAIWHX6'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MB_BASE_URL = 'https://musicbrainz.org/ws/2';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getNameMap(defaultName, aliases, sortName) {
    const map = { EN: sortName || defaultName, KO: defaultName, ES: sortName || defaultName };
    
    // Find Korean
    const ko = aliases.find(a => a.locale === 'ko' || a.name.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/));
    if (ko) map.KO = ko.name;

    // Find English (Explicit)
    const en = aliases.find(a => a.locale === 'en');
    if (en) {
        map.EN = en.name;
        map.ES = en.name;
    } else if (sortName && !sortName.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/)) {
        // MusicBrainz sort-name is usually Latin characters
        map.EN = sortName;
        map.ES = sortName;
    } else if (!defaultName.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/) && defaultName.match(/[a-zA-Z]/)) {
        map.EN = defaultName;
        map.ES = defaultName;
    }
    
    return map;
}

async function fix() {
    console.log('--- SCANNING BROKEN MEMBERS ---');
    const { data: members, error } = await supabase.from('members').select('id, name');
    if (error) {
        console.error(error);
        return;
    }

    const regex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
    const broken = members.filter(m => {
        try {
            const p = JSON.parse(m.name);
            return regex.test(p.EN);
        } catch(e) { return false; }
    });

    console.log(`Found ${broken.length} broken members.`);

    for (let i = 0; i < broken.length; i++) {
        const m = broken[i];
        const currentName = JSON.parse(m.name).KO; // Original Korean name

        console.log(`[${i+1}/${broken.length}] Fixing ${currentName}...`);

        try {
            // Search MusicBrainz focused on individual artist
            const searchUrl = `${MB_BASE_URL}/artist/?query=artist:${encodeURIComponent(currentName)}&fmt=json`;
            const sRes = await fetch(searchUrl, { headers: { 'User-Agent': 'STAN-DOM-Fix/1.0.0' }});
            const sData = await sRes.json();
            
            // Try to find the best match (closest name or person type)
            const match = sData.artists?.find(a => 
                (a.name === currentName || a.aliases?.some(al => al.name === currentName)) &&
                a.type === 'Person'
            ) || sData.artists?.[0];

            if (match) {
                await sleep(1000); 
                const detailUrl = `${MB_BASE_URL}/artist/${match.id}?inc=aliases&fmt=json`;
                const dRes = await fetch(detailUrl, { headers: { 'User-Agent': 'STAN-DOM-Fix/1.0.0' }});
                const dData = await dRes.json();
                
                const nameMap = getNameMap(currentName, dData.aliases || [], dData['sort-name']);
                
                // Final Check: If EN still has Korean, try to use search-result name if it's English
                if (regex.test(nameMap.EN) && match.name && !regex.test(match.name)) {
                   nameMap.EN = match.name;
                   nameMap.ES = match.name;
                }

                const jsonName = JSON.stringify(nameMap);
                console.log(`   -> New: ${jsonName}`);
                
                await supabase.from('members').update({ name: jsonName }).eq('id', m.id);
            } else {
                console.warn(`   !! No match found for ${currentName}`);
            }
        } catch (e) {
            console.error(`   !! Error: ${e.message}`);
        }
        await sleep(1000);
    }
    console.log('--- ALL FIXES COMPLETE ---');
}

fix();
