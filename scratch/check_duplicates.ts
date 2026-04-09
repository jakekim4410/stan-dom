import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('artists').select('id, name').order('name');
  if (error) {
    console.error(error);
    return;
  }
  
  const counts: Record<string, number> = {};
  data.forEach(a => {
    const low = a.name.toLowerCase();
    counts[low] = (counts[low] || 0) + 1;
  });
  
  const duplicates = Object.entries(counts).filter(([_, count]) => count > 1);
  console.log('Duplicates (case-insensitive):', duplicates);
  
  if (duplicates.length > 0) {
      console.log('Top duplicates detail:');
      data.filter(a => duplicates.some(([name]) => a.name.toLowerCase() === name))
          .forEach(a => console.log(`- ${a.name} (id: ${a.id})`));
  }
}

check();
