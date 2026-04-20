-- ============================================================
-- Step 1: 테이블 생성 (SQL Editor에서 실행)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hot_issues (
  id           TEXT        PRIMARY KEY,
  published_at TIMESTAMPTZ NOT NULL,
  slot         TEXT        NOT NULL,
  date         TEXT        NOT NULL,
  category     JSONB       NOT NULL,
  headline     JSONB       NOT NULL,
  lead         JSONB       NOT NULL,
  body         JSONB       NOT NULL,
  video_id     TEXT        NOT NULL,
  accent       TEXT        NOT NULL DEFAULT '#37C561',
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hot_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_hot_issues"
  ON public.hot_issues FOR SELECT
  USING (is_active = true);

-- ============================================================
-- Step 2: 시드 데이터 삽입 (Step 1과 함께 또는 이후에 실행)
-- ============================================================
INSERT INTO public.hot_issues (id, published_at, slot, date, category, headline, lead, body, video_id, accent, tags) VALUES
('20260420_01', '2026-04-20T00:00:00Z', 'KST 09:00', '2026-04-20',
 '{"EN":"Chart News","KO":"차트 뉴스","ES":"Noticias de Charts"}',
 '{"EN":"BTS ''SWIM'' Makes History — 10 Consecutive Weeks Atop Billboard Hot 100","KO":"BTS ''SWIM'', 빌보드 핫100 10주 연속 1위 K-POP 역대 최장 기록 경신","ES":"BTS ''SWIM'' Hace Historia — 10 Semanas Consecutivas al Tope del Billboard Hot 100"}',
 '{"EN":"BTS breaks the all-time K-pop record on the Billboard Hot 100 for 10 straight weeks with ''SWIM''.","KO":"BTS가 ''SWIM''으로 빌보드 핫100 10주 연속 1위를 기록하며 K-POP 역대 최장 기록을 경신했다.","ES":"BTS rompe el récord histórico del K-pop en el Billboard Hot 100 durante 10 semanas con ''SWIM''."}',
 '{"EN":"BTS has officially broken a new K-pop chart record as ''SWIM'' marks its 10th consecutive week at the top of the US Billboard Hot 100.\n\nSource: Billboard Weekly Chart Report.","KO":"방탄소년단(BTS)이 신곡 ''SWIM''으로 미국 빌보드 핫100 10주 연속 1위라는 전무후무한 대기록을 달성했다.\n\n출처: 빌보드 주간 차트 공식 결과.","ES":"BTS ha roto un nuevo récord con ''SWIM'', décima semana consecutiva en el número 1 del Billboard Hot 100.\n\nFuente: Informe semanal de Billboard."}',
 'gdZLi9oWNZg', '#9333EA', ARRAY['BTS','SWIM','Billboard','Hot100']),

('20260420_02', '2026-04-20T13:00:00Z', 'EST 09:00', '2026-04-20',
 '{"EN":"World Tour","KO":"월드투어","ES":"Gira Mundial"}',
 '{"EN":"Stray Kids Announce ''DOMINIC'' 3rd World Tour — 32 Cities Across 5 Continents","KO":"스트레이 키즈, 3번째 월드투어 ''DOMINIC'' 공식 발표 — 5대륙 32개 도시","ES":"Stray Kids Anuncia la Gira ''DOMINIC'' — 32 Ciudades en 5 Continentes"}',
 '{"EN":"Stray Kids announces ''DOMINIC'', their largest-ever world tour spanning 32 cities across 5 continents.","KO":"스트레이 키즈가 역대 최대 규모의 3번째 월드투어 ''DOMINIC''을 공식 발표했다.","ES":"Stray Kids anuncia ''DOMINIC'', su gira mundial más grande con 32 ciudades en 5 continentes."}',
 '{"EN":"JYP Entertainment''s Stray Kids officially announced ''DOMINIC'' world tour, July 2026, 32 cities across 5 continents.\n\nSource: JYP Entertainment Press Release.","KO":"스트레이 키즈가 3번째 월드투어 ''DOMINIC''을 공식 발표했다. 2026년 7월 뚫발을 시작으로 총 5개 대륙 32개 도시를 순회한다.\n\n출처: JYP엔터테인먼트 공식 보도자료.","ES":"Stray Kids anunció ''DOMINIC'', julio 2026, 32 ciudades en 5 continentes.\n\nFuente: JYP Entertainment."}',
 'TQTboN-S1B8', '#DC2626', ARRAY['StrayKids','DOMINIC','WorldTour','JYP']),

('20260419_01', '2026-04-19T00:00:00Z', 'KST 09:00', '2026-04-19',
 '{"EN":"New Release","KO":"신보 / MV","ES":"Nuevo Lanzamiento"}',
 '{"EN":"aespa Drops ''METAVERSE ARCH'' — ''HYPERLINK'' Sets 100M View Speed Record","KO":"에스파, 첫 정규앨범 ''METAVERSE ARCH'' 발매 · ''HYPERLINK'' MV 1억뷰 최단 기록","ES":"aespa Lanza ''METAVERSE ARCH'' — ''HYPERLINK'' Récord 100M Vistas"}',
 '{"EN":"aespa releases ''METAVERSE ARCH''; ''HYPERLINK'' sets K-pop speed record for 100M views in 18 hours.","KO":"에스파 첫 정규앨범 ''METAVERSE ARCH'' 공개. ''HYPERLINK'' MV 18시간 만에 1억 뷰 돌파.","ES":"aespa lanza ''METAVERSE ARCH''; ''HYPERLINK'' rompe récord K-pop en 100M vistas (18 horas)."}',
 '{"EN":"SM Entertainment''s aespa comeback with ''METAVERSE ARCH''. ''HYPERLINK'' reached 100M views in 18 hours.\n\nSource: SM Entertainment & aespa Official YouTube.","KO":"에스파가 첫 정규앨범 ''METAVERSE ARCH''로 컴백했다. 타이틀곡 ''HYPERLINK'' MV는 18시간 만에 1억 뷰를 돌파했다.\n\n출처: SM엔터테인먼트 공식 보도자료.","ES":"aespa regresó con ''METAVERSE ARCH''. ''HYPERLINK'' 100M vistas en 18 horas.\n\nFuente: SM Entertainment."}',
 'phuiiNCxRMg', '#8B5CF6', ARRAY['aespa','METAVERSE_ARCH','HYPERLINK','SM']),

('20260419_02', '2026-04-19T13:00:00Z', 'EST 09:00', '2026-04-19',
 '{"EN":"Industry / Awards","KO":"시상식 / 산업","ES":"Premios / Industria"}',
 '{"EN":"2026 Billboard Music Awards: SEVENTEEN, NewJeans & ENHYPEN Sweep K-Pop Categories","KO":"2026 빌보드 뮤직 어워즈 K-POP: 세븐틴·뉴진스·엔하이픈 주요 부문 석권","ES":"Premios Billboard 2026: SEVENTEEN, NewJeans y ENHYPEN Dominan K-Pop"}',
 '{"EN":"SEVENTEEN wins Top K-Pop Artist, NewJeans Best New K-Pop Act, ENHYPEN Top K-Pop Album.","KO":"세븐틴 K-POP 최우수 아티스트, 뉴진스 최우수 신인상, 엔하이픈 최우수 K-POP 앨범상 수상.","ES":"SEVENTEEN Mejor Artista K-Pop, NewJeans Mejor Nuevo Acto, ENHYPEN Mejor Álbum K-Pop."}',
 '{"EN":"The 2026 Billboard Music Awards saw K-pop sweep all major categories.\n\nSource: Billboard Official & Industry Reports.","KO":"2026 빌보드 뮤직 어워즈 K-POP 부문 완전 석권.\n\n출처: 빌보드 공식 시상 결과.","ES":"Los Billboard Music Awards 2026: K-pop barrió todas las categorías.\n\nFuente: Billboard."}',
 'QMlNLo74mOw', '#F472B6', ARRAY['BillboardAwards','SEVENTEEN','NewJeans','ENHYPEN']),

('20260418_01', '2026-04-18T00:00:00Z', 'KST 09:00', '2026-04-18',
 '{"EN":"World Tour","KO":"월드투어","ES":"Gira Mundial"}',
 '{"EN":"SEVENTEEN ''SPILL THE FEELS'' Tour: 800K Tickets Sold in 10 Minutes","KO":"세븐틴 ''SPILL THE FEELS'' 투어, 10분 만에 80만 장 매진 K-POP 역대 최단 기록","ES":"SEVENTEEN ''SPILL THE FEELS'': 800K Entradas en 10 Minutos"}',
 '{"EN":"SEVENTEEN''s ''SPILL THE FEELS'' world tour tickets sell out in 10 minutes — 800,000 tickets globally.","KO":"세븐틴 ''SPILL THE FEELS'' 월드투어 티켓이 10분 만에 80만 장 전석 매진됐다.","ES":"Las entradas de ''SPILL THE FEELS'' de SEVENTEEN se agotan en 10 minutos con 800K entradas."}',
 '{"EN":"SEVENTEEN shattered K-pop ticketing records with 800,000 tickets sold in 10 minutes.\n\nSource: Pledis Entertainment & Ticketmaster.","KO":"세븐틴이 ''SPILL THE FEELS'' 월드투어 10분 만에 80만 장 매진 기록을 세웠다.\n\n출처: 플레디스엔터테인먼트 공식 보도자료.","ES":"SEVENTEEN vendió 800.000 entradas en 10 minutos.\n\nFuente: Pledis Entertainment y Ticketmaster."}',
 '-GQg25oP0S4', '#F472B6', ARRAY['SEVENTEEN','SPILLTHEFEELS','WorldTour','Carat']),

('20260418_02', '2026-04-18T13:00:00Z', 'EST 09:00', '2026-04-18',
 '{"EN":"Collaboration","KO":"콜라보레이션","ES":"Colaboración"}',
 '{"EN":"NewJeans × Louis Vuitton: ''NJ LV Heritage'' Collection Unveiled","KO":"뉴진스 × 루이비통, ''NJ LV Heritage'' 컬렉션 공개","ES":"NewJeans × Louis Vuitton: Colección ''NJ LV Heritage'' Revelada"}',
 '{"EN":"NewJeans and Louis Vuitton unveil the ''NJ LV Heritage'' limited collection.","KO":"뉴진스와 루이비통이 ''NJ LV Heritage'' 한정 컬렉션을 공개했다.","ES":"NewJeans y Louis Vuitton presentan la colección limitada ''NJ LV Heritage''."}',
 '{"EN":"NewJeans and Louis Vuitton officially unveiled ''NJ LV Heritage''. The campaign film surpassed 50M views in 24 hours.\n\nSource: Louis Vuitton & NewJeans ADOR Agency.","KO":"뉴진스와 루이비통이 ''NJ LV Heritage'' 컬렉션을 공개했다. 캠페인 필름이 24시간 내 5천만 뷰를 돌파했다.\n\n출처: 루이비통 공식 프레스 릴리즈.","ES":"NewJeans y Louis Vuitton presentaron ''NJ LV Heritage''. El film supera 50M vistas en 24 horas.\n\nFuente: Louis Vuitton."}',
 '9wUKhEgnllc', '#3B82F6', ARRAY['NewJeans','LouisVuitton','Fashion','Collab']),

('20260417_02', '2026-04-17T13:00:00Z', 'EST 09:00', '2026-04-17',
 '{"EN":"New Release","KO":"신보 / MV","ES":"Nuevo Lanzamiento"}',
 '{"EN":"Xdinary Heroes Drop 8th Mini Album ''DEAD AND'' — Title Track ''Voyager'' Out Now","KO":"엑스디너리 히어로즈, 8번째 미니앨범 ''DEAD AND'' 발매 · ''Voyager'' 공개","ES":"Xdinary Heroes lanza ''DEAD AND'' — ''Voyager'' ya disponible"}',
 '{"EN":"JYP''s rock band Xdinary Heroes releases ''DEAD AND'' with ''Voyager'' as title track.","KO":"JYP 소속 록 밴드 엑스디너리 히어로즈가 8번째 미니앨범 ''DEAD AND''를 공개했다.","ES":"Xdinary Heroes de JYP lanza ''DEAD AND'' con ''Voyager'' como tema principal."}',
 '{"EN":"Xdinary Heroes returned with 8th mini album ''DEAD AND''. Title track ''Voyager'' showcases explosive guitar riffs.\n\nSource: JYP Entertainment & Official YouTube.","KO":"엑스디너리 히어로즈가 8번째 미니 앨범 ''DEAD AND''로 컴백했다. 타이틀곡 ''Voyager''는 폭발적인 기타 리프가 특징이다.\n\n출처: JYP엔터테인먼트 공식 보도자료.","ES":"Xdinary Heroes regresó con ''DEAD AND''. ''Voyager'' músicaa explosiva.\n\nFuente: JYP Entertainment."}',
 'C6FXANyVACw', '#F59E0B', ARRAY['XdinaryHeroes','DEADAND','Voyager','JYP']),

('20260417_01', '2026-04-17T00:00:00Z', 'KST 09:00', '2026-04-17',
 '{"EN":"Industry / Business","KO":"산업 / 비즈니스","ES":"Industria / Negocios"}',
 '{"EN":"Big 4 File ''Fanomenon'' JV + HYBE×Paramount K-Pop Movie Announced","KO":"빅4 ''파노메논'' 공정위 신고 완료 + HYBE×파라마운트 K-POP 영화 발표","ES":"Big 4 solicitan JV ''Fanomenon'' + Película K-Pop HYBE×Paramount"}',
 '{"EN":"HYBE, SM, JYP & YG file joint venture ''Fanomenon'' for 2027 global K-pop festival + HYBE×Paramount Hollywood film.","KO":"HYBE·SM·JYP·YG 4사가 2027년 글로벌 K-POP 페스티벌 합작 신고 완료. HYBE는 할리우드 K-POP 영화도 발표했다.","ES":"HYBE, SM, JYP y YG presentan JV ''Fanomenon'' + HYBE×Paramount película K-Pop."}',
 '{"EN":"South Korea''s Big 4 filed JV ''Fanomenon'' for a 2027 global K-Pop festival. HYBE also announced a Hollywood film with Paramount for February 2027.\n\nSource: Reuters & Variety.","KO":"빅4인 HYBE, SM, JYP, YG가 공정거래위원회에 합작법인 ''파노메논(가칭)'' 신고를 완료했다. HYBE는 파라마운트 픽처스와 K-POP 할리우드 영화도 발표했다.\n\n출처: 공정위 신고 내역 및 버라이어티 독점 인터뷰.","ES":"Las Big 4 presentaron ''Fanomenon'' para un festival global en 2027. HYBE reveló película de Hollywood con Paramount.\n\nFuente: Reuters y Variety."}',
 'gdZLi9oWNZg', '#A855F7', ARRAY['Fanomenon','HYBE','BigFour','KPopMovie']),

('20260416_02', '2026-04-16T13:00:00Z', 'EST 09:00', '2026-04-16',
 '{"EN":"Festival Review","KO":"페스티벌 리뷰","ES":"Reseña Festival"}',
 '{"EN":"Coachella 2025 K-Pop Weekend 1 Recap — LISA, JENNIE, ENHYPEN & XG Shine","KO":"코첼라 2025 K-POP 위크엔드 1 — 리사·제니·엔하이픈·XG 무대 총정리","ES":"Coachella 2025 Weekend K-Pop — LISA, JENNIE, ENHYPEN y XG brillan"}',
 '{"EN":"LISA''s solo debut set, JENNIE''s Ruby Experience, ENHYPEN''s 13-song run, and XG''s choreography defined K-pop at Coachella 2025.","KO":"리사 솔로 데뷔, 제니 루비 익스피리언스, 엔하이픈 13곡 세트리스트, XG 군무까지 코첼라 2025 K-POP 총정리.","ES":"El debut de LISA, Ruby Experience de JENNIE, 13 canciones de ENHYPEN y XG definieron el K-pop en Coachella 2025."}',
 '{"EN":"LISA, JENNIE, ENHYPEN and XG shone at Coachella 2025 Weekend 1.\n\nSource: Official Coachella YouTube.","KO":"리사는 솔로 데뷔곡들로 코첼라 무대를 장악했고, 엔하이픈은 13곡 세트리스트를 소화했다.\n\n출처: 코첼라 공식 유튜브.","ES":"LISA, JENNIE, ENHYPEN y XG brillaron en Coachella 2025.\n\nFuente: YouTube oficial de Coachella."}',
 'WYEsVSmfoes', '#EC4899', ARRAY['Coachella2025','LISA','JENNIE','ENHYPEN','XG']),

('20260416_01', '2026-04-16T00:00:00Z', 'KST 09:00', '2026-04-16',
 '{"EN":"Awards / Music","KO":"음원 / 수상","ES":"Premios / Música"}',
 '{"EN":"BTS ''SWIM'' Earns 3 AMA Nominations Including Artist of the Year","KO":"BTS ''SWIM'', 제52회 AMA 올해의 아티스트 포함 3개 부문 노미네이션","ES":"BTS ''SWIM'' logra 3 nominaciones AMA incluyendo Artista del Año"}',
 '{"EN":"BTS dominates the 52nd AMA nominations alongside aespa, ENHYPEN, Stray Kids, LE SSERAFIM and KATSEYE.","KO":"BTS를 비롯해 aespa·ENHYPEN·스트레이 키즈·르세라핌·KATSEYE 등이 제52회 AMA를 석권했다.","ES":"BTS domina las nominaciones de los 52.os AMA junto a aespa, ENHYPEN y más."}',
 '{"EN":"BTS ''SWIM'' earns three major nominations at the 52nd AMAs, including ''Artist of the Year''.\n\nSource: AMA Official Press Release & Billboard.","KO":"BTS가 제52회 AMA에서 ''올해의 아티스트''를 포함 총 3개 부문에 노미네이트됐다.\n\n출처: 미국 AMA 공식 보도자료.","ES":"BTS obtiene tres nominaciones en los 52.os AMA incluyendo ''Artista del Año''.\n\nFuente: AMA y Billboard."}',
 'b4iVv91Z6lY', '#37C561', ARRAY['BTS','SWIM','AMA2026','KPOP']),

('20260415_02', '2026-04-15T13:00:00Z', 'EST 09:00', '2026-04-15',
 '{"EN":"Full Concert","KO":"풀 콘서트","ES":"Concierto Completo"}',
 '{"EN":"#BANGCHELLA Full 60-min Concert Now on YouTube — Stream BIGBANG Coachella 2026","KO":"#BANGCHELLA 풀 콘서트 공개 — 빅뱅 코첼라 2026 60분 전체 공연 유튜브 스트리밍","ES":"#BANGCHELLA Concierto 60 min ya en YouTube — BIGBANG Coachella 2026"}',
 '{"EN":"The full BIGBANG Coachella 2026 performance is now streamable on YouTube.","KO":"빅뱅 코첼라 2026 아웃도어 시어터 전체 공연이 유튜브에 공개됐다.","ES":"La actuación completa de BIGBANG en Coachella 2026 ya está en YouTube."}',
 '{"EN":"BIGBANG''s epic Coachella return is now on YouTube for 60 minutes, including Bang Bang Bang and Fantastic Baby.\n\nSource: Coachella Official Media.","KO":"빅뱅의 코첼라 2026 풀 콘서트 영상이 유튜브에 공개됐다. ''뱅뱅뱅'', ''판타스틱 베이비'' 등 수록.\n\n출처: 코첼라 오피셜 유튜브.","ES":"BIGBANG en Coachella 2026 disponible en YouTube. Bang Bang Bang y Fantastic Baby incluidos.\n\nFuente: Coachella Official."}',
 'uI6EwBBFFrQ', '#FF6B6B', ARRAY['BIGBANG','BANGCHELLA','FullConcert','Coachella2026']),

('20260415_01', '2026-04-15T00:00:00Z', 'KST 09:00', '2026-04-15',
 '{"EN":"Festival / Live","KO":"글로벌 공연 / 페스티벌","ES":"Festival / Concierto"}',
 '{"EN":"BIGBANG Returns at Coachella 2026 — Legendary Comeback After 6 Years","KO":"빅뱅, 코첼라 2026 전격 컴백… 6년 공백 깨고 20주년 신호탄","ES":"BIGBANG regresa en Coachella 2026 — Regreso legendario tras 6 años"}',
 '{"EN":"G-Dragon, Taeyang & Daesung lit up Coachella Outdoor Theatre for 60 minutes.","KO":"G-드래곤·태양·대성 트리오가 코첼라 아웃도어 시어터를 60분간 불태웠다.","ES":"G-Dragon, Taeyang y Daesung iluminaron Coachella Outdoor Theatre 60 minutos."}',
 '{"EN":"K-pop legends BIGBANG made a monumental return at Coachella 2026, celebrating their 20th anniversary.\n\nSource: Rolling Stone & Billboard Reviews.","KO":"K팝의 영원한 레전드 ''빅뱅''이 6년의 공백을 깨고 코첼라 2026에서 전격 컴백했다.\n\n출처: 미국 롤링스톤 및 빌보드 리뷰.","ES":"BIGBANG rompió su pausa de seis años en Coachella 2026 celebrando su 20 aniversario.\n\nFuente: Rolling Stone y Billboard."}',
 'WYEsVSmfoes', '#FF00FF', ARRAY['BIGBANG','BANGCHELLA','Coachella2026'])

ON CONFLICT (id) DO UPDATE SET
  published_at = EXCLUDED.published_at,
  headline     = EXCLUDED.headline,
  lead         = EXCLUDED.lead,
  body         = EXCLUDED.body,
  video_id     = EXCLUDED.video_id,
  accent       = EXCLUDED.accent,
  tags         = EXCLUDED.tags,
  is_active    = EXCLUDED.is_active;
