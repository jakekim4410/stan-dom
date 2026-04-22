require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('hot_issues').select('*').order('published_at', { ascending: false });
  data.forEach((d, i) => {
    console.log(`[${i+1}] ID: ${d.id}`);
    console.log(`    Headline: ${d.headline.KO}`);
    console.log(`    Video ID: ${d.video_id}`);
    console.log(`    Published At: ${d.published_at}`);
    console.log(`    Created At: ${d.created_at}`);
    console.log(`    Slot: ${d.slot}\n`);
  });
}
check();
