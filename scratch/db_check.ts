import { createClient } from './utils/supabase/client';

async function checkData() {
  const supabase = createClient();
  
  console.log('--- Artists Table ---');
  const { data: artists } = await supabase.from('artists').select('id, name, total_votes').limit(5);
  console.log(artists);

  console.log('--- Fandoms Table ---');
  const { data: fandoms } = await supabase.from('fandoms').select('id, name, votes_count').limit(5);
  console.log(fandoms);

  console.log('--- Votes Count ---');
  const { count } = await supabase.from('votes').select('*', { count: 'exact', head: true });
  console.log('Total entries in votes table:', count);
}

checkData();
