/**
 * seed_hot_issues.mjs
 * 
 * 기존 하드코딩된 핫이슈 기사를 Supabase hot_issues 테이블에 시드합니다.
 * 실행 전: Supabase 대시보드에서 SQL Editor 탭에서 create_hot_issues.sql을 먼저 실행하세요.
 * 
 * 실행방법:
 *   node scratch/seed_hot_issues.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // Service Role Key required for inserts bypassing RLS
);

const ARTICLES = [
  // ── April 20 ────────────────────────────────────────────────────────
  {
    id: '20260420_01',
    published_at: '2026-04-20T00:00:00Z',
    slot: 'KST 09:00',
    date: '2026-04-20',
    category: { EN: 'Chart News', KO: '차트 뉴스', ES: 'Noticias de Charts' },
    headline: {
      EN: "BTS 'SWIM' Makes History — 10 Consecutive Weeks Atop Billboard Hot 100",
      KO: "BTS 'SWIM', 빌보드 핫100 10주 연속 1위 K-POP 역대 최장 기록 경신",
      ES: "BTS 'SWIM' Hace Historia — 10 Semanas Consecutivas al Tope del Billboard Hot 100",
    },
    lead: {
      EN: "BTS breaks the all-time K-pop record on the Billboard Hot 100, holding #1 for 10 straight weeks with 'SWIM'.",
      KO: "BTS가 'SWIM'으로 빌보드 핫100 10주 연속 1위를 기록하며 K-POP 역대 최장 기록을 경신했다.",
      ES: "BTS rompe el récord histórico del K-pop en el Billboard Hot 100, manteniéndose en el #1 durante 10 semanas con 'SWIM'.",
    },
    body: {
      EN: "BTS has officially broken a new K-pop chart record as 'SWIM' marks its 10th consecutive week at the top of the US Billboard Hot 100. This unprecedented achievement surpasses their own previous record.\n\nSource: Billboard Weekly Chart Report & Global Music Data Analytics.",
      KO: "방탄소년단(BTS)이 신곡 'SWIM'으로 미국 빌보드 핫100 10주 연속 1위라는 전무후무한 대기록을 달성했다. 팬들이 제작한 챌린지 영상과 커버 콘텐츠가 전 세계적으로 수십억 뷰를 기록하고 있다.\n\n출처: 빌보드 주간 차트 공식 결과 및 글로벌 음원 데이터 분석.",
      ES: "BTS ha roto un nuevo récord con 'SWIM', que marca su décima semana consecutiva en el número 1 del Billboard Hot 100.\n\nFuente: Informe semanal de Billboard y análisis de datos musicales globales.",
    },
    video_id: 'gdZLi9oWNZg',
    accent: '#9333EA',
    tags: ['BTS', 'SWIM', 'Billboard', 'Hot100'],
    is_active: true,
  },
  {
    id: '20260420_02',
    published_at: '2026-04-20T13:00:00Z',
    slot: 'EST 09:00',
    date: '2026-04-20',
    category: { EN: 'World Tour', KO: '월드투어', ES: 'Gira Mundial' },
    headline: {
      EN: "Stray Kids Announce 'DOMINIC' 3rd World Tour — 32 Cities Across 5 Continents",
      KO: "스트레이 키즈, 3번째 월드투어 'DOMINIC' 공식 발표 — 5대륙 32개 도시 단독 공연",
      ES: "Stray Kids Anuncia la Gira 'DOMINIC' — 32 Ciudades en 5 Continentes",
    },
    lead: {
      EN: "Stray Kids announces their largest-ever world tour 'DOMINIC', spanning 32 cities across 5 continents.",
      KO: "스트레이 키즈가 역대 최대 규모의 3번째 월드투어 'DOMINIC'을 공식 발표했다.",
      ES: "Stray Kids anuncia su gira mundial más grande hasta la fecha, 'DOMINIC', con 32 ciudades en 5 continentes.",
    },
    body: {
      EN: "JYP Entertainment's Stray Kids officially announced their third world tour, 'DOMINIC', set to kick off July 2026. The tour spans 32 cities across 5 continents — the largest solo tour by a K-pop artist.\n\nSource: JYP Entertainment Official Press Release.",
      KO: "JYP엔터테인먼트 소속 스트레이 키즈가 세 번째 월드투어 'DOMINIC'을 공식 발표했다. 2026년 7월 출발을 시작으로 총 5개 대륙 32개 도시를 순회한다.\n\n출처: JYP엔터테인먼트 공식 보도자료.",
      ES: "Stray Kids anunció 'DOMINIC', que comenzará en julio de 2026 abarcando 32 ciudades en 5 continentes.\n\nFuente: JYP Entertainment Comunicado oficial.",
    },
    video_id: 'TQTboN-S1B8',
    accent: '#DC2626',
    tags: ['StrayKids', 'DOMINIC', 'WorldTour', 'JYP'],
    is_active: true,
  },
  // ── April 19 ────────────────────────────────────────────────────────
  {
    id: '20260419_01',
    published_at: '2026-04-19T00:00:00Z',
    slot: 'KST 09:00',
    date: '2026-04-19',
    category: { EN: 'New Release', KO: '신보 / MV', ES: 'Nuevo Lanzamiento' },
    headline: {
      EN: "aespa Drops Full Album 'METAVERSE ARCH' — 'HYPERLINK' Sets 100M View Speed Record",
      KO: "에스파, 첫 정규앨범 'METAVERSE ARCH' 발매 · 타이틀곡 'HYPERLINK' MV 1억뷰 최단 기록",
      ES: "aespa Lanza 'METAVERSE ARCH' — 'HYPERLINK' Establece Récord de Velocidad en 100M de Vistas",
    },
    lead: {
      EN: "aespa releases 'METAVERSE ARCH'; title track 'HYPERLINK' sets the K-pop speed record for 100M views in 18 hours.",
      KO: "에스파의 첫 정규앨범 'METAVERSE ARCH'가 공개됐다. 타이틀곡 'HYPERLINK' MV는 18시간 만에 1억 뷰를 돌파하며 K-POP 최단 기록을 경신했다.",
      ES: "aespa lanza 'METAVERSE ARCH'; 'HYPERLINK' rompe el récord del K-pop más rápido en 100M vistas (18 horas).",
    },
    body: {
      EN: "SM Entertainment's aespa made a monumental comeback with 'METAVERSE ARCH', their debut full-length album. 'HYPERLINK' reached 100M views in just 18 hours — a new K-pop speed record. The album topped iTunes charts in 76 countries simultaneously.\n\nSource: SM Entertainment Press Release & aespa Official YouTube.",
      KO: "SM엔터테인먼트 소속 에스파(aespa)가 첫 정규앨범 'METAVERSE ARCH'로 새로운 장을 열었다. 타이틀곡 'HYPERLINK' 뮤직비디오는 18시간 만에 1억 뷰를 돌파하며 K-POP 역대 최단 기록을 새로 썼으며, 76개국 아이튠즈 1위를 동시에 기록했다.\n\n출처: SM엔터테인먼트 공식 보도자료 및 에스파 공식 유튜브.",
      ES: "aespa de SM Entertainment regresó con 'METAVERSE ARCH'. 'HYPERLINK' rompió el récord de 100M de vistas en solo 18 horas. El álbum encabezó iTunes en 76 países.\n\nFuente: SM Entertainment y YouTube oficial de aespa.",
    },
    video_id: 'phuiiNCxRMg',
    accent: '#8B5CF6',
    tags: ['aespa', 'METAVERSE_ARCH', 'HYPERLINK', 'SM'],
    is_active: true,
  },
  {
    id: '20260419_02',
    published_at: '2026-04-19T13:00:00Z',
    slot: 'EST 09:00',
    date: '2026-04-19',
    category: { EN: 'Industry / Awards', KO: '시상식 / 산업', ES: 'Premios / Industria' },
    headline: {
      EN: "2026 Billboard Music Awards: SEVENTEEN, NewJeans & ENHYPEN Sweep K-Pop Categories",
      KO: "2026 빌보드 뮤직 어워즈 K-POP: 세븐틴·뉴진스·엔하이픈 주요 부문 석권",
      ES: "Premios Billboard 2026: SEVENTEEN, NewJeans y ENHYPEN Dominan las Categorías K-Pop",
    },
    lead: {
      EN: "SEVENTEEN wins Top K-Pop Artist, NewJeans takes Best New K-Pop Act, ENHYPEN claims Top K-Pop Album at the 2026 Billboard Music Awards.",
      KO: "2026 빌보드 뮤직 어워즈에서 세븐틴이 K-POP 최우수 아티스트, 뉴진스가 최우수 신인상, 엔하이픈이 최우수 K-POP 앨범상을 수상했다.",
      ES: "SEVENTEEN gana Mejor Artista K-Pop, NewJeans Mejor Nuevo Acto, y ENHYPEN Mejor Álbum K-Pop en los Billboard Music Awards 2026.",
    },
    body: {
      EN: "The 2026 Billboard Music Awards saw K-pop acts sweep all major categories. SEVENTEEN's global performance earned Top K-Pop Artist. NewJeans claimed Best New K-Pop Act. ENHYPEN earned Top K-Pop Album with strong global sales.\n\nSource: Billboard Official Awards Announcement & Industry Reports.",
      KO: "2026 빌보드 뮤직 어워즈에서 K-POP 관련 부문이 완전 석권됐다. 세븐틴이 최우수 K-POP 아티스트상, 뉴진스가 최우수 신인상, 엔하이픈이 최우수 K-POP 앨범상을 각각 거머쥐었다.\n\n출처: 빌보드 공식 시상 결과 및 한국콘텐츠진흥원 산업 자료.",
      ES: "Los Billboard Music Awards 2026: SEVENTEEN ganó Mejor Artista K-Pop, NewJeans Mejor Nuevo Acto, y ENHYPEN Mejor Álbum K-Pop.\n\nFuente: Anuncio oficial de Billboard e informes de la industria.",
    },
    video_id: 'QMlNLo74mOw',
    accent: '#F472B6',
    tags: ['BillboardAwards', 'SEVENTEEN', 'NewJeans', 'ENHYPEN'],
    is_active: true,
  },
  // ── April 18 ────────────────────────────────────────────────────────
  {
    id: '20260418_01',
    published_at: '2026-04-18T00:00:00Z',
    slot: 'KST 09:00',
    date: '2026-04-18',
    category: { EN: 'World Tour', KO: '월드투어', ES: 'Gira Mundial' },
    headline: {
      EN: "SEVENTEEN 'SPILL THE FEELS' Tour: 800K Tickets Sold in 10 Minutes — K-Pop Record",
      KO: "세븐틴 'SPILL THE FEELS' 투어, 10분 만에 80만 장 매진 — K-POP 역대 최단 기록",
      ES: "Gira 'SPILL THE FEELS' de SEVENTEEN: 800K Entradas en 10 Minutos — Récord K-Pop",
    },
    lead: {
      EN: "SEVENTEEN's 'SPILL THE FEELS' world tour tickets sell out in 10 minutes — 800,000 tickets globally, a new K-pop single-day ticketing record.",
      KO: "세븐틴의 'SPILL THE FEELS' 월드투어 티켓이 선예매 개시 10분 만에 80만 장 전석 매진되며 K-POP 역사상 단일 최다 발권 신기록을 수립했다.",
      ES: "Las entradas de la gira 'SPILL THE FEELS' de SEVENTEEN se agotan en 10 minutos con 800.000 entradas globalmente — nuevo récord.",
    },
    body: {
      EN: "SEVENTEEN shattered all previous K-pop ticketing records. 800,000 tickets sold in 10 minutes triggered server crashes on multiple global platforms. The tour spans 24 cities across North America, Europe and Asia.\n\nSource: Pledis Entertainment Press Release & Ticketmaster Global Data.",
      KO: "세븐틴이 'SPILL THE FEELS' 월드투어 티켓 선예매에서 전례 없는 기록을 세웠다. 전 세계 동시 오픈 10분 만에 80만 장이 전석 매진되며, 글로벌 주요 티켓팅 플랫폼들이 서버 다운을 경험했다.\n\n출처: 플레디스엔터테인먼트 공식 보도자료 및 글로벌 티켓마스터.",
      ES: "SEVENTEEN pulverizó todos los récords previos con 800.000 entradas agotadas en 10 minutos. La gira abarcará 24 ciudades con múltiples shows.\n\nFuente: Pledis Entertainment y datos globales de Ticketmaster.",
    },
    video_id: '-GQg25oP0S4',
    accent: '#F472B6',
    tags: ['SEVENTEEN', 'SPILLTHEFEELS', 'WorldTour', 'Carat'],
    is_active: true,
  },
  {
    id: '20260418_02',
    published_at: '2026-04-18T13:00:00Z',
    slot: 'EST 09:00',
    date: '2026-04-18',
    category: { EN: 'Collaboration', KO: '콜라보레이션', ES: 'Colaboración' },
    headline: {
      EN: "NewJeans × Louis Vuitton: K-Pop's Biggest Fashion Collab 'NJ LV Heritage' Unveiled",
      KO: "뉴진스 × 루이비통, K-POP 역대 최대 패션 콜라보 'NJ LV Heritage' 컬렉션 공개",
      ES: "NewJeans × Louis Vuitton: La Mayor Colaboración de Moda del K-Pop 'NJ LV Heritage' Revelada",
    },
    lead: {
      EN: "NewJeans and Louis Vuitton unveil the 'NJ LV Heritage' limited collection — K-pop's most high-profile luxury fashion collaboration.",
      KO: "뉴진스와 루이비통이 'NJ LV Heritage' 컬렉션을 공개했다. K-POP 역사상 가장 큰 규모의 럭셔리 패션 협업이다.",
      ES: "NewJeans y Louis Vuitton presentan la colección limitada 'NJ LV Heritage' — la mayor colaboración de moda de lujo del K-pop.",
    },
    body: {
      EN: "NewJeans and Louis Vuitton officially unveiled the 'NJ LV Heritage' limited collection, combining NewJeans' retro-modern aesthetic with Louis Vuitton's legendary craftsmanship. The campaign film shot in Paris and Seoul surpassed 50M views in 24 hours.\n\nSource: Louis Vuitton Official Press Release & NewJeans ADOR Agency.",
      KO: "뉴진스와 루이비통이 'NJ LV Heritage' 한정 컬렉션을 공식 공개했다. 서울과 파리를 동시에 배경으로 한 캠페인 필름은 24시간 내 5천만 뷰를 돌파했다.\n\n출처: 루이비통 공식 프레스 릴리즈 및 뉴진스 ADOR 에이전시.",
      ES: "NewJeans y Louis Vuitton presentaron 'NJ LV Heritage'. El film de campaña rodado en París y Seúl ya supera 50M de vistas en 24 horas.\n\nFuente: Louis Vuitton Comunicado oficial y ADOR Agency.",
    },
    video_id: '9wUKhEgnllc',
    accent: '#3B82F6',
    tags: ['NewJeans', 'LouisVuitton', 'Fashion', 'Collab'],
    is_active: true,
  },
  // ── April 17 ────────────────────────────────────────────────────────
  {
    id: '20260417_02',
    published_at: '2026-04-17T13:00:00Z',
    slot: 'EST 09:00',
    date: '2026-04-17',
    category: { EN: 'New Release', KO: '신보 / MV', ES: 'Nuevo Lanzamiento' },
    headline: {
      EN: "Xdinary Heroes Drop 8th Mini Album 'DEAD AND' — Title Track 'Voyager' Out Now",
      KO: "엑스디너리 히어로즈, 8번째 미니앨범 'DEAD AND' 발매 · 타이틀곡 'Voyager' 공개",
      ES: "Xdinary Heroes lanza su 8.° mini álbum 'DEAD AND' — 'Voyager' ya disponible",
    },
    lead: {
      EN: "JYP's rock band Xdinary Heroes releases 'DEAD AND' with 'Voyager' as the title track on April 17 at 1PM KST.",
      KO: "JYP 소속 록 밴드 엑스디너리 히어로즈가 4월 17일 오후 1시 8번째 미니앨범 'DEAD AND'와 타이틀곡 'Voyager'를 전격 공개했다.",
      ES: "Xdinary Heroes de JYP lanza 'DEAD AND' con 'Voyager' como tema principal el 17 de abril a la 1PM KST.",
    },
    body: {
      EN: "JYP Entertainment's rock band Xdinary Heroes officially returned with their 8th mini album 'DEAD AND'. The title track 'Voyager' features explosive guitar riffs and sharp vocal delivery, showcasing their musical evolution.\n\nSource: JYP Entertainment Press Release & Official YouTube MV.",
      KO: "JYP엔터테인먼트 소속 엑스디너리 히어로즈가 4월 17일 오후 1시, 여덟 번째 미니 앨범 'DEAD AND'를 전 세계 동시 발매하고 컴백했다. 타이틀곡 'Voyager'는 폭발적인 기타 리프와 날카로운 보컬이 더해진 곡으로 글로벌 팬들의 폭발적인 반응이 쏟아지고 있다.\n\n출처: JYP엔터테인먼트 공식 보도자료 및 신곡 뮤직비디오.",
      ES: "Xdinary Heroes ha regresado con su octavo mini álbum 'DEAD AND'. La pista principal 'Voyager' muestra riffs de guitarra explosivos y evolución musical continua.\n\nFuente: JYP Entertainment y MV oficial en YouTube.",
    },
    video_id: 'C6FXANyVACw',
    accent: '#F59E0B',
    tags: ['XdinaryHeroes', 'DEADAND', 'Voyager', 'JYP'],
    is_active: true,
  },
  {
    id: '20260417_01',
    published_at: '2026-04-17T00:00:00Z',
    slot: 'KST 09:00',
    date: '2026-04-17',
    category: { EN: 'Industry / Business', KO: '산업 / 비즈니스', ES: 'Industria / Negocios' },
    headline: {
      EN: "Big 4 File 'Fanomenon' JV + HYBE×Paramount K-Pop Movie Announced",
      KO: "빅4 '파노메논' 공정위 신고 완료 + HYBE×파라마운트 K-POP 영화 발표",
      ES: "Las Big 4 solicitan JV 'Fanomenon' + Se anuncia película K-Pop de HYBE×Paramount",
    },
    lead: {
      EN: "HYBE, SM, JYP & YG file joint venture for a global K-pop festival targeting 2027, while HYBE reveals a Hollywood film for Feb 2027.",
      KO: "HYBE·SM·JYP·YG 4사가 2027년 글로벌 K-POP 페스티벌 합작 신고를 마치고, HYBE는 2027년 2월 할리우드 K-POP 영화까지 발표했다.",
      ES: "HYBE, SM, JYP y YG presentan JV para un festival K-pop global en 2027, mientras HYBE revela una película de Hollywood para febrero de 2027.",
    },
    body: {
      EN: "South Korea's Big 4 (HYBE, SM, JYP, YG) filed a joint venture declaration establishing 'Fanomenon' — a massive unified global K-Pop festival planned for 2027. HYBE also announced a partnership with Paramount Pictures for a K-Pop Hollywood movie in February 2027.\n\nSource: Reuters, Korea Fair Trade Commission & Variety.",
      KO: "대한민국 엔터테인먼트 '빅4'인 HYBE, SM, JYP, YG가 이례적으로 공정거래위원회에 합작법인 '파노메논(가칭)' 설립 신고를 완료했다. 이들은 2027년 '글로벌 연합 K-POP 페스티벌'을 준비한다. HYBE는 파라마운트 픽처스와 K-POP 할리우드 영화를 2027년 2월 개봉 목표로 제작한다고 발표했다.\n\n출처: 공정위 신고 내역 분석 및 미국 버라이어티(Variety) 독점 인터뷰.",
      ES: "Las Big 4 de Corea (HYBE, SM, JYP, YG) presentaron la empresa conjunta 'Fanomenon' para organizar un festival global en 2027. HYBE también reveló una película de Hollywood sobre K-Pop para febrero de 2027.\n\nFuente: Reuters, FTC de Corea y The Hollywood Reporter.",
    },
    video_id: 'gdZLi9oWNZg',
    accent: '#A855F7',
    tags: ['Fanomenon', 'HYBE', 'BigFour', 'KPopMovie'],
    is_active: true,
  },
  // ── April 16 ────────────────────────────────────────────────────────
  {
    id: '20260416_02',
    published_at: '2026-04-16T13:00:00Z',
    slot: 'EST 09:00',
    date: '2026-04-16',
    category: { EN: 'Festival Review', KO: '페스티벌 리뷰', ES: 'Reseña Festival' },
    headline: {
      EN: 'Coachella 2025 K-Pop Weekend 1 Recap — LISA, JENNIE, ENHYPEN & XG Shine',
      KO: '코첼라 2025 K-POP 위크엔드 1 종합 리뷰 — 리사·제니·엔하이픈·XG 무대 총정리',
      ES: 'Resumen del Weekend 1 K-Pop en Coachella 2025 — LISA, JENNIE, ENHYPEN y XG brillan',
    },
    lead: {
      EN: "LISA's solo debut set, JENNIE's Ruby Experience, ENHYPEN's 13-song run, and XG's choreography defined K-pop at Coachella 2025.",
      KO: '리사 솔로 데뷔, 제니의 루비 익스피리언스, 엔하이픈의 13곡 세트리스트, XG의 파워풀한 안무까지 코첼라 2025 K-POP을 총정리했다.',
      ES: 'El debut en solitario de LISA, The Ruby Experience de JENNIE, el set de ENHYPEN y la coreografía de XG definieron el K-pop en Coachella 2025.',
    },
    body: {
      EN: "LISA set the stage on fire, proving her unparalleled stage presence. JENNIE delivered The Ruby Experience with captivating visuals, while ENHYPEN powered through a massive 13-song set. XG also brought powerful choreography.\n\nSource: Official Coachella YouTube & Global K-Pop News Agencies.",
      KO: "리사는 솔로 데뷔곡들로 코첼라 무대를 완벽하게 장악했다. 제니는 특유의 루비 익스피리언스를 선보였으며, 엔하이픈은 무려 13곡에 달하는 세트리스트를 소화했다. XG 역시 파워풀한 군무로 글로벌 팬들의 시선을 사로잡았다.\n\n출처: 코첼라 공식 유튜브 및 글로벌 주요 엔터 매체.",
      ES: "LISA incendió el escenario con sus temas debut. JENNIE entregó su Ruby Experience, ENHYPEN interpretó 13 canciones. XG deslumbró con su coreografía.\n\nFuente: YouTube oficial de Coachella y agencias globales.",
    },
    video_id: 'WYEsVSmfoes',
    accent: '#EC4899',
    tags: ['Coachella2025', 'LISA', 'JENNIE', 'ENHYPEN', 'XG'],
    is_active: true,
  },
  {
    id: '20260416_01',
    published_at: '2026-04-16T00:00:00Z',
    slot: 'KST 09:00',
    date: '2026-04-16',
    category: { EN: 'Awards / Music', KO: '음원 / 수상', ES: 'Premios / Música' },
    headline: {
      EN: "BTS 'SWIM' Earns 3 AMA Nominations Including Artist of the Year",
      KO: "BTS 'SWIM', 제52회 AMA 올해의 아티스트 포함 3개 부문 노미네이션",
      ES: "BTS 'SWIM' logra 3 nominaciones a los AMA incluyendo Artista del Año",
    },
    lead: {
      EN: 'BTS dominates the 52nd American Music Awards nominations alongside aespa, ENHYPEN, Stray Kids, LE SSERAFIM and KATSEYE.',
      KO: 'BTS를 비롯해 aespa·ENHYPEN·스트레이 키즈·르세라핌·KATSEYE 등이 제52회 AMA를 석권했다.',
      ES: 'BTS domina las nominaciones de los 52.os AMA junto a aespa, ENHYPEN, Stray Kids, LE SSERAFIM y KATSEYE.',
    },
    body: {
      EN: "BTS continues to prove their global dominance as 'SWIM' earns three major nominations at the 52nd AMAs, including 'Artist of the Year'. K-pop is well represented with aespa, ENHYPEN, Stray Kids, LE SSERAFIM, and KATSEYE.\n\nSource: AMA Official Press Release & Billboard.",
      KO: "방탄소년단(BTS)이 제52회 아메리칸 뮤직 어워즈(AMA)에서 '올해의 아티스트'를 포함해 총 3개 주요 부문에 노미네이트됐다. 에스파, 엔하이픈, 스트레이 키즈, 르세라핌, 캣츠아이 등도 대거 후보에 올랐다.\n\n출처: 미국 AMA 공식 보도자료 및 빌보드 뉴스.",
      ES: "BTS obtiene tres nominaciones importantes en los 52.os AMA, incluyendo 'Artista del Año'. Se unen aespa, ENHYPEN, Stray Kids, LE SSERAFIM y KATSEYE.\n\nFuente: Comunicado de prensa oficial de los AMA y Billboard.",
    },
    video_id: 'b4iVv91Z6lY',
    accent: '#37C561',
    tags: ['BTS', 'SWIM', 'AMA2026', 'KPOP'],
    is_active: true,
  },
  // ── April 15 ────────────────────────────────────────────────────────
  {
    id: '20260415_02',
    published_at: '2026-04-15T13:00:00Z',
    slot: 'EST 09:00',
    date: '2026-04-15',
    category: { EN: 'Full Concert', KO: '풀 콘서트', ES: 'Concierto Completo' },
    headline: {
      EN: '#BANGCHELLA Full 60-min Concert Now on YouTube — Stream BIGBANG Coachella 2026',
      KO: '#BANGCHELLA 풀 콘서트 공개 — 빅뱅 코첼라 2026 60분 전체 공연 유튜브 스트리밍 시작',
      ES: '#BANGCHELLA Concierto Completo de 60 min ya en YouTube — Transmite BIGBANG Coachella 2026',
    },
    lead: {
      EN: 'The full BIGBANG Outdoor Theatre performance at Coachella 2026 is now streamable, including Bang Bang Bang, Fantastic Baby and solo tracks.',
      KO: '빅뱅 코첼라 2026 아웃도어 시어터 전체 공연이 유튜브에 공개됐다. 뱅뱅뱅·판타스틱 베이비·솔로 무대까지 전부 포함.',
      ES: 'La actuación completa de BIGBANG en Coachella 2026 ya está en streaming, incluyendo Bang Bang Bang y Fantastic Baby.',
    },
    body: {
      EN: "BIGBANG's epic Coachella return is now officially available on YouTube in high definition. The 60-minute video captures 'Bang Bang Bang', 'Fantastic Baby', and high-octane solos by G-Dragon, Taeyang, and Daesung. #BANGCHELLA remained a top global trend for three consecutive days.\n\nSource: Coachella Official Media Releases.",
      KO: "빅뱅의 코첼라 아웃도어 시어터 무대의 60분 풀타임 공연 영상이 코첼라 오피셜 유튜브 채널을 통해 스트리밍 공개되었다. '뱅뱅뱅', '판타스틱 베이비'뿐만 아니라 솔로 무대까지 고화질로 담겨있다.\n\n출처: 코첼라 오피셜 유튜브 하이라이트 영상.",
      ES: "¡El regreso de BIGBANG en Coachella ya está disponible en YouTube en alta definición! 60 minutos con Bang Bang Bang, Fantastic Baby y números en solitario.\n\nFuente: Lanzamientos oficiales de medios de Coachella.",
    },
    video_id: 'uI6EwBBFFrQ',
    accent: '#FF6B6B',
    tags: ['BIGBANG', 'BANGCHELLA', 'FullConcert', 'Coachella2026'],
    is_active: true,
  },
  {
    id: '20260415_01',
    published_at: '2026-04-15T00:00:00Z',
    slot: 'KST 09:00',
    date: '2026-04-15',
    category: { EN: 'Festival / Live', KO: '글로벌 공연 / 페스티벌', ES: 'Festival / Concierto' },
    headline: {
      EN: 'BIGBANG Returns at Coachella 2026 — A Legendary Comeback After 6 Years',
      KO: '빅뱅, 코첼라 2026 전격 컴백… 6년 공백 깨고 20주년 신호탄',
      ES: 'BIGBANG regresa en Coachella 2026 — Un regreso legendario tras 6 años',
    },
    lead: {
      EN: 'G-Dragon, Taeyang & Daesung lit up Coachella Outdoor Theatre with Bang Bang Bang, Fantastic Baby and more for 60 minutes.',
      KO: 'G-드래곤·태양·대성 트리오가 뱅뱅뱅, 판타스틱 베이비 등으로 코첼라 아웃도어 시어터를 60분간 불태웠다.',
      ES: 'G-Dragon, Taeyang y Daesung iluminaron el Outdoor Theatre de Coachella con Bang Bang Bang, Fantastic Baby y más durante 60 minutos.',
    },
    body: {
      EN: "K-pop legends BIGBANG made a monumental return at Coachella. Breaking a six-year hiatus, G-Dragon, Taeyang, and Daesung celebrated their 20th anniversary with an electrifying 60-minute set. Critics called it 'The absolute peak of K-Pop live mastery'.\n\nSource: Rolling Stone & Billboard Reviews.",
      KO: "K팝의 영원한 레전드 '빅뱅'이 6년의 공백을 깨고 코첼라 2026 아웃도어 시어터의 밤을 불태우며 전격 컴백했다! 지드래곤, 태양, 대성 트리오가 데뷔 20주년의 신호탄을 쏘아올렸다. 현지 매체와 평론가들은 'K팝 역대 최고의 라이브 장악력'이라는 찬사를 쏟아냈다.\n\n출처: 미국 롤링스톤(Rolling Stone) 및 전문가 라이브 리뷰.",
      ES: "BIGBANG rompió su pausa de seis años en Coachella 2026. G-Dragon, Taeyang y Daesung celebraron su vigésimo aniversario con un impresionante set de 60 minutos.\n\nFuente: Rolling Stone y Billboard Reviews.",
    },
    video_id: 'WYEsVSmfoes',
    accent: '#FF00FF',
    tags: ['BIGBANG', 'BANGCHELLA', 'Coachella2026'],
    is_active: true,
  },
];

async function seed() {
  console.log(`📰 Seeding ${ARTICLES.length} hot issues to Supabase...`);

  // Insert in batches of 5 to avoid rate limits
  for (let i = 0; i < ARTICLES.length; i += 5) {
    const batch = ARTICLES.slice(i, i + 5);
    const { error } = await supabase
      .from('hot_issues')
      .upsert(batch, { onConflict: 'id' });   // upsert = insert or update

    if (error) {
      console.error(`❌ Batch ${i / 5 + 1} error:`, error.message);
    } else {
      console.log(`✅ Batch ${i / 5 + 1}: inserted ${batch.length} articles`);
    }
  }

  console.log('🎉 Seeding complete!');
}

seed().catch(console.error);
