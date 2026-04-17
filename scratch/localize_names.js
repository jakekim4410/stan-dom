require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const updates = [
  {
    id: 'bfe2e0ff-0096-408f-be12-26e19447e95b',
    name: { EN: 'G-DRAGON', KO: '지드래곤', ES: 'G-DRAGON' }
  },
  {
    id: 'bc898486-1325-42c9-ba68-774ff8e05be2',
    name: { EN: 'Young Tak', KO: '영탁', ES: 'Young Tak' }
  },
  {
    id: 'ba0c7c65-ab5e-4921-963a-dafa35f1d2c6',
    name: { EN: 'Lee Mujin', KO: '이무진', ES: 'Lee Mujin' }
  },
  {
    id: 'bf11042d-2dd3-450a-9afa-fb9f8841e43c',
    name: { EN: 'Lee Chan-won', KO: '이찬원', ES: 'Lee Chan-won' }
  },
  {
    id: 'ab3dda04-4774-41ed-94f1-0d5f7fb31203',
    name: { EN: 'Lee Hyori', KO: '이효리', ES: 'Lee Hyori' }
  },
  {
    id: '8f2d21a9-2f57-4c6f-a8b2-826641ff4904',
    name: { EN: 'Kim Ho-joong', KO: '김호중', ES: 'Kim Ho-joong' }
  },
  {
    id: 'bfc99fcf-3232-4269-9da3-6228c735d523',
    name: { EN: 'Jeong Dong-won', KO: '정동원', ES: 'Jeong Dong-won' }
  },
  {
    id: '862fa0f3-7215-4826-944a-26b9df806c64',
    name: { EN: 'Chungha', KO: '청하', ES: 'Chungha' }
  },
  {
    id: 'df4f0034-041c-48f6-9f76-11fbcaac3ba8',
    name: { EN: 'Lucy', KO: '루시', ES: 'Lucy' }
  },
  {
    id: '5f803aae-9ea2-422a-8d29-f392ca8de6b2',
    name: { EN: 'Everglow', KO: '에버글로우', ES: 'Everglow' }
  },
  {
    id: 'bcef6ff6-2eed-4358-8ab3-b429c24fb223',
    name: { EN: 'LOONA', KO: '이달의 소녀', ES: 'LOONA' }
  },
  {
    id: 'f2c5fffa-4028-45e5-87e7-9610b5a73408',
    name: { EN: 'WayV', KO: '웨이션브이', ES: 'WayV' }
  },
  {
    id: '9f71a073-3ef7-428b-bc91-d21fe30e3802',
    name: { EN: 'Tomorrow x Together', KO: '투모로우바이투게더', ES: 'Tomorrow x Together' }
  }
];

async function run() {
  console.log('Starting name normalization...');
  for (const update of updates) {
    const { error } = await supabase
      .from('artists')
      .update({ name: JSON.stringify(update.name) })
      .eq('id', update.id);
    
    if (error) {
      console.error(`Failed to update ${update.id}:`, error);
    } else {
      console.log(`Updated ${update.id} KO: ${update.name.KO}`);
    }
  }
  console.log('Finished updates.');
}

run();
