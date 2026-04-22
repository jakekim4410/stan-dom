require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixVideo() {
  const query = 'EXO Love Shot Music Bank';
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${process.env.YOUTUBE_API_KEY}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.items && data.items.length > 0) {
    const videoId = data.items[0].id.videoId;
    console.log(`Found alternate video ID: ${videoId}`);
    
    await supabase.from('hot_issues').update({ video_id: videoId }).eq('id', 'live_1776759933030_5');
    console.log('Successfully updated the video ID in database.');
  } else {
    console.log('No video found.');
  }
}
fixVideo();
