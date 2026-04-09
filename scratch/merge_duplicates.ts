import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual env parsing since dotenv might not be in the npx path
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function merge() {
  console.log('--- STARTING ARTIST MERGE PROTOCOL ---');
  
  // 1. Fetch all artists
  const { data: artists, error: fetchError } = await supabase.from('artists').select('*');
  if (fetchError || !artists) {
     console.error('Fetch error:', fetchError);
     return;
  }

  const groups: Record<string, typeof artists> = {};
  artists.forEach(a => {
    const key = a.name.trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  for (const [name, list] of Object.entries(groups)) {
    if (list.length <= 1) continue;

    console.log(`\nMerging duplicate group: "${name}" (${list.length} records)`);
    
    // Pick primary: most votes, or first created
    const sorted = [...list].sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0));
    const primary = sorted[0];
    const secondaries = sorted.slice(1);
    const secondaryIds = secondaries.map(s => s.id);

    console.log(`- Primary Node ID: ${primary.id} (Name: ${primary.name}, Votes: ${primary.total_votes})`);
    console.log(`- Secondary Node IDs: ${secondaryIds.join(', ')}`);

    // A. Re-link Votes
    const { error: voteErr } = await supabase
      .from('votes')
      .update({ artist_id: primary.id })
      .in('artist_id', secondaryIds);
    if (voteErr) console.error('  ! Vote re-link error:', voteErr.message);
    else console.log('  [OK] Votes re-linked');

    // B. Re-link Comments
    const { error: commErr } = await supabase
      .from('comments')
      .update({ artist_id: primary.id })
      .in('artist_id', secondaryIds);
    if (commErr) console.error('  ! Comment re-link error:', commErr.message);
    else console.log('  [OK] Comments re-linked');

    // C. Recalculate Total Votes for Primary
    const { data: voteCount, error: countErr } = await supabase
      .from('votes')
      .select('id', { count: 'exact' })
      .eq('artist_id', primary.id);
    
    const totalCount = voteCount?.length || 0;
    const { error: updateErr } = await supabase
       .from('artists')
       .update({ total_votes: totalCount })
       .eq('id', primary.id);
    
    if (updateErr) console.error('  ! Primary update error:', updateErr.message);
    else console.log(`  [OK] Primary total_votes updated to: ${totalCount}`);

    // D. Delete Secondaries
    const { error: deleteErr } = await supabase
      .from('artists')
      .delete()
      .in('id', secondaryIds);
    if (deleteErr) console.error('  ! Delete error:', deleteErr.message);
    else console.log('  [OK] Redundant nodes purged');
  }

  console.log('\n--- MERGE PROTOCOL COMPLETE ---');
}

merge();
