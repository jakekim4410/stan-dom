import { createClient } from './utils/supabase/client';

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

async function registerArtists() {
  const supabase = createClient();
  console.log('--- Registering Top 100 Artists ---');

  for (const name of top100Artists) {
    const { data: existing } = await supabase.from('artists').select('id').ilike('name', name).single();
    
    if (existing) {
      console.log(`Skipping ${name}: Already exists.`);
      continue;
    }

    const { error } = await supabase.from('artists').insert({ name, total_votes: 0 });
    if (error) {
      console.error(`Error inserting ${name}:`, error.message);
    } else {
      console.log(`Registered: ${name}`);
    }
  }
  console.log('--- Registration Complete ---');
}

registerArtists();
