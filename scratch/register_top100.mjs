// Let's use fetch directly.
const SUPABASE_URL = 'https://bgwttxtohumpceoqadpu.supabase.co';
const ANON_KEY = 'sb_publishable_nxbWVd_Vk4fiTVfQ1QafZA_CfAIWHX6';

const top100Artists = [
  "BTS", "Blackpink", "NewJeans", "IVE", "LE SSERAFIM", "Seventeen", "Stray Kids", "TWICE", "aespa", "Red Velvet",
  "NCT 127", "NCT Dream", "TXT", "ENHYPEN", "ATEEZ", "ITZY", "(G)I-DLE", "Mamamoo", "EXO", "SHINee",
  "IU", "Taeyeon", "Jungkook", "Jimin", "V", "Suga", "Jin", "RM", "j-hope", "Lisa",
  "Jennie", "Rosé", "Jisoo", "STAYC", "NMIXX", "Kep1er", "BABYMONSTER", "RIIZE", "ZEROBASEONE", "BOYNEXTDOOR",
  "TWS", "ILLIT", "fromis_9", "Oh My Girl", "Apink", "Girls' Generation", "Super Junior", "TVXQ!", "BIGBANG", "Winner",
  "iKON", "Monsta X", "The Boyz", "TREASURE", "WayV", "VIVIZ", "Billlie", "Everglow", "Dreamcatcher", "Loona",
  "KARD", "PENTAGON", "Golden Child", "SF9", "Day6", "Xdinary Heroes", "Lucy", "N.Flying", "BTOB", "Highlight",
  "INFINITE", "2PM", "Block B", "VIXX", "GOT7", "B1A4", "Teen Top", "T-ara", "KARA", "2NE1",
  "PSY", "Rain", "BoA", "Lee Hyori", "Sunmi", "Chungha", "Hyuna", "Zico", "Jay Park", "Crush",
  "Heize", "Bibi", "Yena", "Kwon Eunbi", "Lee Mujin", "Lim Young-woong", "Young Tak", "Lee Chan-won", "Kim Ho-joong", "Jeong Dong-won"
];

async function registerAll() {
  console.log('Sending 100 artists to Supabase...');
  
  const payload = top100Artists.map(name => ({
    name,
    total_votes: Math.floor(Math.random() * 50)
  }));

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/artists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('Successfully registered all 100 artists!');
    } else {
      const text = await response.text();
      console.error('Failed to register artists:', text);
    }
  } catch (error) {
    console.error('Unexpected error during registration:', error);
  }
}

registerAll();
