import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const NAME_UPDATES = [
  // BTS
  { id: 'aaf7edc9-f414-49d2-86f4-c3312acd73d9', en: 'RM', ko: 'RM' },
  { id: '730c3625-07ab-42d2-ab3b-4d76e3c4664d', en: 'Jin', ko: '진' },
  { id: '6aedb1b6-00d7-450b-a526-d6a88d9c47b3', en: 'SUGA', ko: '슈가' },
  { id: '0e7bb2af-5483-440e-83af-bc0e88d30b80', en: 'j-hope', ko: '제이홉' },
  { id: '1d9d0ef9-b332-4a2b-babe-bb4773467d4d', en: 'Jimin', ko: '지민' },
  { id: 'bdb26a5e-fc65-4720-a28e-141767f655dd', en: 'V', ko: '뷔' },
  { id: '6e3f6d0c-6263-4600-9065-7074e140677e', en: 'Jung Kook', ko: '정국' },

  // IVE
  { nameContains: '안유진', en: 'Yujin', ko: '유진' },
  { nameContains: '장원영', en: 'Wonyoung', ko: '원영' },
  { nameContains: '나오이레이', en: 'Rei', ko: '레이' },
  { nameContains: '김지원', artist_id: '242da795-772b-44e6-b5a8-c76f38123830', en: 'Liz', ko: '리즈' },

  // aespa
  { nameContains: '유지민', en: 'Karina', ko: '카리나' },
  { nameContains: '김민정', en: 'Winter', ko: '윈터' },

  // LE SSERAFIM
  { nameContains: '김채원', en: 'Chaewon', ko: '채원' },
  { nameContains: '홍은채', en: 'Eunchae', ko: '은채' },
  { nameContains: '미야와키 사쿠라', en: 'Sakura', ko: '사쿠라' },

  // BLACKPINK
  { nameContains: '김제니', en: 'Jennie', ko: '제니' },
  { nameContains: 'Kim Ji-soo', en: 'Jisoo', ko: '지수' },
  { nameContains: '로제', en: 'Rosé', ko: '로제' },

  // NewJeans
  { nameContains: '강해린', en: 'Haerin', ko: '해린' },
  { nameContains: '이혜인', en: 'Hyein', ko: '혜인' },
  { nameContains: '박민지', en: 'Minji', ko: '민지' },

  // TWICE
  { nameContains: '손채영', en: 'Chaeyoung', ko: '채영' },
  { nameContains: '김다현', en: 'Dahyun', ko: '다현' },
  { nameContains: '유정연', en: 'Jeongyeon', ko: '정연' },
  { nameContains: '박지효', en: 'Jihyo', ko: '지효' },

  // Others
  { nameContains: '신류진', en: 'Ryujin', ko: '류진' },
  { nameContains: '정휘인', en: 'Wheein', ko: '휘인' },
  { nameContains: '이동혁', en: 'Haechan', ko: '해찬' },
  { nameContains: '이태용', en: 'Taeyong', ko: '태용' },
  { nameContains: '김기범', en: 'Key', ko: '키' },
  { nameContains: 'Gong, Minji', en: 'Minzy', ko: '민지' },
  { nameContains: '공찬식', en: 'Gongchan', ko: '공찬' },

  // Japanese & Chinese Name Corrections
  { id: 'e125fd29-b77e-4331-bbd5-f74b23d16561', en: 'Shotaro', ko: '쇼타로' },
  { id: 'aae339d1-9847-478b-ba19-818b50e3b9d9', en: 'Kazuha', ko: '카즈하' },
  { id: 'e22b59c6-35a6-4469-9779-bb97bffd4df7', en: 'Momo', ko: '모모' },
  { id: '79c22e0c-b1e5-4ef3-9b0b-534f6cba33f9', en: 'Renjun', ko: '런쥔' },
  { id: 'f9b06d9b-07b7-4608-9c2d-505232448cad', en: 'Yiren', ko: '이런' },
  { id: '674b023a-d2b8-4710-81e5-46d4a2987101', en: 'Mashiho', ko: '마시호' },
  { id: '1893257e-54e7-428d-b1f2-d1828cc0801a', en: 'Asahi', ko: '아사히' },
  { id: '0e3591e2-82b8-476a-ab4c-e18a17a15c2f', en: 'Yoshi', ko: '요시' },
  { id: '5065dedc-33ff-4d22-be8e-ac5a0dcbb299', en: 'Jay B', ko: '제이비' },
  // Missing Sana and Sakura in the search above but usually needed
  { nameContains: 'SANA', en: 'Sana', ko: '사나' },
  { nameContains: 'SAKURA', en: 'Sakura', ko: '사쿠라' },
];

async function run() {
  console.log('Starting member name migration...');

  for (const update of NAME_UPDATES) {
    const newNameObj = JSON.stringify({
      EN: update.en,
      KO: update.ko,
      ES: update.en // Default ES to EN for now
    });

    if (update.id) {
      const { error } = await supabase
        .from('members')
        .update({ name: newNameObj })
        .eq('id', update.id);
      
      if (error) console.error(`Failed to update member ${update.id}:`, error.message);
      else console.log(`Updated member ${update.en} (by ID)`);
    } else if (update.nameContains) {
      // Find by partial name match
      const { data, error: findError } = await supabase
        .from('members')
        .select('*')
        .ilike('name', `%${update.nameContains}%`);

      if (findError) {
        console.error(`Error finding member like ${update.nameContains}:`, findError.message);
        continue;
      }

      if (data && data.length > 0) {
        for (const member of data) {
           // If artist_id filter is provided, skip if not matching
           if (update.artist_id && member.artist_id !== update.artist_id) continue;

           const { error: updateError } = await supabase
             .from('members')
             .update({ name: newNameObj })
             .eq('id', member.id);
           
           if (updateError) console.error(`Failed to update member ${member.id}:`, updateError.message);
           else console.log(`Updated member ${update.en} (found by ${update.nameContains})`);
        }
      }
    }
  }

  console.log('Migration complete.');
}

run();
