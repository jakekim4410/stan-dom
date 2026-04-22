require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const FALLBACK_CHART = [
  { rank: 1, title: "Magnetic", artist: "ILLIT" },
  { rank: 2, title: "Fate", artist: "(G)I-DLE" },
  { rank: 3, title: "Sheesh", artist: "BABYMONSTER" },
  { rank: 4, title: "Love Wins All", artist: "IU" },
  { rank: 5, title: "To. X", artist: "Taeyeon" },
  { rank: 6, title: "Plot Twist", artist: "TWS" },
  { rank: 7, title: "Bam Yang Gang", artist: "BIBI" },
  { rank: 8, title: "Smart", artist: "LE SSERAFIM" },
  { rank: 9, title: "EASY", artist: "LE SSERAFIM" },
  { rank: 10, title: "Supernova", artist: "aespa" },
  { rank: 11, title: "Deja Vu", artist: "TXT" },
  { rank: 12, title: "Spot!", artist: "ZICO (feat. JENNIE)" },
  { rank: 13, title: "Impossible", artist: "RIIZE" },
  { rank: 14, title: "HEYA", artist: "IVE" },
  { rank: 15, title: "Super Shy", artist: "NewJeans" },
  { rank: 16, title: "Seven", artist: "Jungkook" },
  { rank: 17, title: "Perfect Night", artist: "LE SSERAFIM" },
  { rank: 18, title: "Wife", artist: "(G)I-DLE" },
  { rank: 19, title: "Drama", artist: "aespa" },
  { rank: 20, title: "Accendio", artist: "IVE" }
];

async function sync() {
  console.log('--- K-Pop Music Chart Initial Sync (Fallback Mode) ---');
  
  try {
    const tracks = FALLBACK_CHART;
    console.log(`Using static fallback chart of ${tracks.length} tracks.`);

    const chartData = [];

    console.log('Mapping songs to YouTube Video IDs...');
    for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        process.stdout.write(`[${i+1}/${tracks.length}] ${track.title} - ${track.artist}... `);

        try {
            const searchQuery = `${track.artist} ${track.title} lyrics`;
            const ytRes = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoEmbeddable=true&maxResults=1&key=${YOUTUBE_API_KEY}`
            );
            const ytData = await ytRes.json();
            const youtubeId = ytData.items?.[0]?.id?.videoId || 'o97AnitLw74';
            
            chartData.push({
                rank: track.rank,
                title: track.title,
                artist: track.artist,
                album_art: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
                youtube_id: youtubeId,
                spotify_id: `static_${track.rank}`,
                updated_at: new Date().toISOString()
            });
            console.log('Done.');
        } catch (err) {
            console.log('Error, using placeholder.');
        }
    }

    console.log('Saving to Supabase...');
    const { error } = await supabase
      .from('kpop_charts')
      .upsert(chartData, { onConflict: 'spotify_id' });

    if (error) throw error;
    console.log('🎉 Successfully synced music chart data!');
    console.log('Note: Using static data for now to bypass API restrictions.');

  } catch (e) {
    console.error('❌ Sync failed:', e.message);
  }
}

sync();
