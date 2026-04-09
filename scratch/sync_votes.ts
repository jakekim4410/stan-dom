import { createClient } from './utils/supabase/client';

async function syncVotes() {
  const supabase = createClient();
  
  console.log('🔄 Starting Vote Count Sync...');

  // 1. Get all fandoms
  const { data: fandoms, error: fError } = await supabase.from('fandoms').select('id, name');
  if (fError) {
    console.error('Error fetching fandoms:', fError);
    return;
  }

  console.log(`Found ${fandoms.length} fandoms. Syncing counts...`);

  for (const fandom of fandoms) {
    // 2. Count actual votes from the 'votes' table
    const { count, error: cError } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', fandom.id);

    if (cError) {
      console.error(`Error counting votes for ${fandom.name}:`, cError);
      continue;
    }

    const actualCount = count || 0;

    // 3. Update fandoms table
    const { error: uError } = await supabase
      .from('fandoms')
      .update({ votes_count: actualCount })
      .eq('id', fandom.id);

    if (uError) {
      console.error(`Error updating count for ${fandom.name}:`, uError);
    } else {
      console.log(`✅ ${fandom.name}: Updated to ${actualCount} votes.`);
    }
  }

  console.log('✨ Sync Complete!');
}

syncVotes();
