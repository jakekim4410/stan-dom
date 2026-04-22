-- yt-fallback 캐싱을 위한 컬럼 추가
-- Supabase Dashboard → SQL Editor에서 실행하세요

ALTER TABLE kpop_charts
  ADD COLUMN IF NOT EXISTS fallback_youtube_id TEXT DEFAULT NULL;

-- 검색 성능 향상을 위한 인덱스 (title 기준 LIKE 검색)
CREATE INDEX IF NOT EXISTS idx_kpop_charts_title ON kpop_charts (title);

COMMENT ON COLUMN kpop_charts.fallback_youtube_id IS
  'yt-fallback API가 찾은 대체 YouTube 영상 ID. NULL이면 아직 캐시 없음.';
