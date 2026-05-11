import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !YOUTUBE_API_KEY) {
  console.error('Missing environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FALLBACK_SONGS = [
  { title: 'Hype Boy', artist: 'NewJeans', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/92/7d/7a/927d7a31-b6a4-2399-5f2a-d9df29b4661a/NewJeans_1st_EP_Bluebook_Online_Cover.jpg/600x600bb.jpg', youtube_id: '11cta61wi0g' },
  { title: 'Seven (feat. Latto)', artist: 'Jung Kook', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/28/70/43/2870438a-0985-2e11-e40a-200938b81347/192641091599.jpg/600x600bb.jpg', youtube_id: 'QU9c0053UAU' },
  { title: 'Super Shy', artist: 'NewJeans', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/1e/8c/d7/1e8cd71b-3162-8e7c-87b3-579e6f338d97/NewJeans_2nd_EP_Get_Up_Online_Cover.jpg/600x600bb.jpg', youtube_id: 'nJDMAjH9Usc' },
  { title: 'Gangnam Style', artist: 'PSY', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/09/bd/a409bde1-e9b4-b4a6-7787-8ea312017df8/12UMGIM41843.rgb.jpg/600x600bb.jpg', youtube_id: '9bZkp7q19f0' },
  { title: 'Dynamite', artist: 'BTS', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/33/c4/4c/33c44cd6-9b0a-313b-2bd6-4b2a3d76e73c/20UM1IM05370.rgb.jpg/600x600bb.jpg', youtube_id: 'gdZLi9oWNZg' },
  { title: 'DDU-DU DDU-DU', artist: 'BLACKPINK', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/31/b0/a2/31b0a2c3-4d4b-7cb8-cb4a-8f83db5bb7b9/18UMGIM33400.rgb.jpg/600x600bb.jpg', youtube_id: 'IHNzOHi8sJs' },
  { title: 'Butter', artist: 'BTS', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/73/9d/1d/739d1d3b-6351-30ca-05f1-39dae0776104/192641068515.jpg/600x600bb.jpg', youtube_id: 'WMweEpGlu_U' },
  { title: 'Kill This Love', artist: 'BLACKPINK', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/95/92/7d/95927d6d-6395-5a4f-561b-9277028e3579/BLACKPINK_Kill_This_Love_Online_Cover.jpg/600x600bb.jpg', youtube_id: '2S24-y0Ij3Y' },
  { title: 'Love Dive', artist: 'IVE', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/8e/31/1d/8e311d4e-63f5-7945-8850-7059737119e1/IVE_LOVE_DIVE_Online_Cover.jpg/600x600bb.jpg', youtube_id: 'Y8JFxS1HlDo' },
  { title: 'Cupid', artist: 'FIFTY FIFTY', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/33/7d/13/337d130a-9d62-126a-9378-067f9273767e/FIFTY_FIFTY_The_Beginning_Cupid_Online_Cover.jpg/600x600bb.jpg', youtube_id: 'QZovqw68OQU' },
  { title: 'Next Level', artist: 'aespa', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/31/b0/a2/31b0a2c3-4d4b-7cb8-cb4a-8f83db5bb7b9/18UMGIM33400.rgb.jpg/600x600bb.jpg', youtube_id: '4TWR90KJl84' },
  { title: 'The Feels', artist: 'TWICE', album_art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/21/3c/6e/213c6e4e-6395-5a4f-561b-9277028e3579/TWICE_The_Feels_Online_Cover.jpg/600x600bb.jpg', youtube_id: 'f5_wn8mexnM' }
];

async function updateMusicChart() {
  console.log('🎵 Starting Weekly Hot 100 Update...');
  
  try {
    // 1. Fetch iTunes RSS Top K-Pop Songs
    console.log('📡 Fetching data from iTunes...');
    const itunesRes = await fetch('https://itunes.apple.com/us/rss/topsongs/limit=100/genre=51/json');
    if (!itunesRes.ok) throw new Error('iTunes API failed');
    
    const itunesData = await itunesRes.json();
    const tracks = itunesData.feed?.entry || [];
    console.log(`✅ Found ${tracks.length} tracks on iTunes.`);

    if (tracks.length === 0) {
      console.error('No tracks found. Aborting.');
      return;
    }

    // 2. Get existing YouTube mappings to save quota
    console.log('🔍 Fetching existing YouTube IDs from database...');
    const { data: existingChart } = await supabase.from('kpop_charts').select('title, artist, youtube_id');
    const existingMap = new Map();
    if (existingChart) {
      existingChart.forEach(track => {
        if (track.youtube_id && track.youtube_id.trim() !== '') {
          existingMap.set(`${track.title.toLowerCase()}_${track.artist.toLowerCase()}`, track.youtube_id);
        }
      });
    }
    console.log(`ℹ️ Reusing ${existingMap.size} existing YouTube IDs.`);

    const chartData = [];

    // 3. Process each track
    for (let i = 0; i < tracks.length; i++) {
      const entry = tracks[i];
      const trackTitle = entry['im:name']?.label;
      const artistName = entry['im:artist']?.label;
      const albumArtRaw = entry['im:image']?.[2]?.label || entry['im:image']?.[0]?.label;
      const albumArt = albumArtRaw ? albumArtRaw.replace('170x170bb', '600x600bb') : null;
      
      const itunesId = entry.id?.attributes?.['im:id'] || `itunes_${i}`;
      const searchKey = `${trackTitle.toLowerCase()}_${artistName.toLowerCase()}`;
      
      let youtubeId = '';
      
      if (existingMap.has(searchKey)) {
        youtubeId = existingMap.get(searchKey);
      } else {
        console.log(`🔎 Searching YouTube for: ${artistName} - ${trackTitle}`);
        const searchQuery = `${artistName} ${trackTitle} official audio`;
        try {
          const ytRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
          );
          const ytData = await ytRes.json();
          youtubeId = ytData.items?.[0]?.id?.videoId || '';
          
          // Delay to stay safe
          await new Promise(res => setTimeout(res, 100));
        } catch (e) {
          console.warn(`⚠️ YT Fetch failed for ${trackTitle}:`, e.message);
        }
      }

      chartData.push({
        rank: i + 1,
        title: trackTitle,
        artist: artistName,
        album_art: albumArt,
        youtube_id: youtubeId,
        spotify_id: itunesId, // Keeping it consistent with existing schema
        updated_at: new Date().toISOString()
      });
      
      if (i % 20 === 0 && i > 0) {
        console.log(`⏳ Progress: ${i}/${tracks.length}...`);
      }
    }

    // 3.5 Fill the gap up to 100 using fallback songs if necessary
    if (chartData.length < 100) {
      console.log(`补充: 현재 ${chartData.length}곡임. 100곡을 채우기 위해 스테디셀러를 추가합니다...`);
      let fillIndex = 0;
      while (chartData.length < 100 && fillIndex < FALLBACK_SONGS.length) {
        const fallback = FALLBACK_SONGS[fillIndex];
        // 중복 방지
        const isDuplicate = chartData.some(c => c.title.toLowerCase() === fallback.title.toLowerCase());
        if (!isDuplicate) {
          chartData.push({
            rank: chartData.length + 1,
            title: fallback.title,
            artist: fallback.artist,
            album_art: fallback.album_art,
            youtube_id: fallback.youtube_id,
            spotify_id: `fallback_${fillIndex}`,
            updated_at: new Date().toISOString()
          });
        }
        fillIndex++;
      }
    }

    // 4. Update Database
    console.log('💾 Updating Supabase table (kpop_charts)...');
    
    // Delete old data
    const { error: deleteError } = await supabase
      .from('kpop_charts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    // Insert new data
    const { error: insertError } = await supabase
      .from('kpop_charts')
      .insert(chartData);

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    console.log(`✨ Successfully updated ${chartData.length} tracks!`);
    console.log('🚀 Weekly Hot 100 Update Complete.');

  } catch (error) {
    console.error('❌ Error updating chart:', error.message);
  }
}

updateMusicChart();
