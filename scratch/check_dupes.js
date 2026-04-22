require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('hot_issues').select('id, headline').order('created_at', { ascending: false }).limit(10);
  data.forEach((d, i) => {
    console.log(`[${i+1}] ${d.id}: ${d.headline ? d.headline.KO : 'NO HEADLINE'}`);
  });
}
check();
