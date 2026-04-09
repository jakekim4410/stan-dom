import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual env parsing
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    });
  }
}
loadEnv();

async function checkReports() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  console.log('--- FETCHING PENDING REPORTS ---');
  const { data, error } = await supabase
    .from('reports')
    .select('*, artists(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No pending reports found.');
    return;
  }

  data.forEach((r: any) => {
    console.log(`\n[${new Date(r.created_at).toLocaleString()}]`);
    console.log(`ARTIST: ${r.artists?.name || r.artist_id}`);
    console.log(`REASON: ${r.reason_code}`);
    if (r.description) console.log(`NOTE: ${r.description}`);
    console.log(`USER: ${r.user_id || 'Anonymous'}`);
    console.log('-'.repeat(30));
  });
}

checkReports();
