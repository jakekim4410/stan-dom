require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('hot_issues').select('id, body').order('created_at', { ascending: false }).limit(10);
  data.forEach(d => {
    const len = d.body && d.body.KO ? d.body.KO.length : 0;
    const hasSource = d.body && d.body.KO && (d.body.KO.includes('Source:') || d.body.KO.includes('출처:'));
    console.log(`[${d.id}]: Length=${len}, Source=${hasSource ? 'YES' : 'NO'}`);
  });
}
check();
