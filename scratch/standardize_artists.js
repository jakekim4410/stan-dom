require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const updates = [
  {
    id: '7595d4bd-74f9-4d58-b9a1-115740c52ca8',
    name: { EN: 'PSY', KO: '싸이', ES: 'PSY' }
  },
  {
    id: '1f955bb4-330e-44db-a972-61557a33d2e5',
    name: { EN: 'BABYMONSTER', KO: '베이비몬스터', ES: 'BABYMONSTER' }
  },
  {
    id: '342c013d-6eee-4ea5-b937-780d58299f99',
    name: { EN: 'V', KO: '뷔', ES: 'V' }
  },
  {
    id: 'd4966a97-b97e-46af-b982-82459ade85ee',
    name: { EN: 'RM', KO: 'RM', ES: 'RM' }
  },
  {
    id: '23db9e65-5b9f-4e83-bd73-de8bdbf052d9',
    name: { EN: 'Jimin', KO: '지민', ES: 'Jimin' }
  },
  {
    id: '5e165bc3-5e0a-42cc-9d04-cc1ffde04af3',
    name: { EN: 'Jungkook', KO: '정국', ES: 'Jungkook' }
  },
  {
    id: '57ed233f-4fcf-4752-b7be-780e210024e3',
    name: { EN: 'Jennie', KO: '제니', ES: 'Jennie' }
  },
  {
    id: 'b2980aa5-8cb8-44da-8328-1b95a5bdc793',
    name: { EN: 'Jisoo', KO: '지수', ES: 'Jisoo' }
  },
  {
    id: 'd3a0a1a2-791d-448a-91a8-1d0699254cb8',
    name: { EN: 'Taeyeon', KO: '태연', ES: 'Taeyeon' }
  },
  {
    id: 'a9d2e4a3-540c-4061-be3a-592ad022494c',
    name: { EN: 'BoA', KO: '보아', ES: 'BoA' }
  },
  {
    id: '32a25303-b329-4a31-ab98-ddc1762d70f2',
    name: { EN: 'Crush', KO: '크러쉬', ES: 'Crush' }
  },
  {
    id: 'd3f02cf1-1c20-4962-bffd-0805a17d24cb',
    name: { EN: 'Zico', KO: '지코', ES: 'Zico' }
  },
  {
    id: 'e6e1098e-0f0d-4479-a6c1-9aa161614fca',
    name: { EN: 'Hyuna', KO: '현아', ES: 'Hyuna' }
  },
  {
    id: '0fa5f4e0-168c-4f2d-bf85-d706fb9f199e',
    name: { EN: 'Suga', KO: '슈가', ES: 'Suga' }
  },
  {
    id: 'a074388b-205c-4ebb-8d89-449d29be9fee',
    name: { EN: 'Jin', KO: '진', ES: 'Jin' }
  },
  {
    id: '927b954b-cdc1-454b-b1b3-6f1fcd8e02a5',
    name: { EN: 'Rosé', KO: '로제', ES: 'Rosé' }
  },
  {
    id: '884cffe7-a97a-4665-a90f-1ba8a0712400',
    name: { EN: 'NewJeans', KO: '뉴진스', ES: 'NewJeans' }
  },
  {
    id: '39e887fa-3bbd-4ce2-b44f-e983ad0d3ea1',
    name: { EN: 'Stray Kids', KO: '스트레이 키즈', ES: 'Stray Kids' }
  }
];

async function run() {
  console.log('Starting updates...');
  for (const update of updates) {
    const { error } = await supabase
      .from('artists')
      .update({ name: JSON.stringify(update.name) })
      .eq('id', update.id);
    
    if (error) {
      console.error(`Failed to update ${update.id}:`, error);
    } else {
      console.log(`Updated ${update.id} to ${update.name.KO}`);
    }
  }
  console.log('Finished updates.');
}

run();
