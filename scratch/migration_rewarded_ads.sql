-- rewarded_ads 테이블 생성 (광고 시청 기록 저장)
-- Supabase Dashboard → SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS rewarded_ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 로그인 유저용 (비로그인이면 null)
    ip_address TEXT,                                          -- 비로그인 유저 식별용
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 검색 성능을 위한 인덱스 생성 (오늘 날짜 기준으로 자주 조회하므로)
CREATE INDEX IF NOT EXISTS idx_rewarded_ads_created_at ON rewarded_ads (created_at);
CREATE INDEX IF NOT EXISTS idx_rewarded_ads_user_id ON rewarded_ads (user_id);
CREATE INDEX IF NOT EXISTS idx_rewarded_ads_ip ON rewarded_ads (ip_address);

-- 권한 설정 (RLS) - 서비스 롤/서버 액션에서만 삽입/조회하도록 모두 허용하거나 제한
ALTER TABLE rewarded_ads ENABLE ROW LEVEL SECURITY;

-- 서버 액션(anon key 사용)에서 삽입 가능하도록 정책 추가
CREATE POLICY "Enable insert for anonymous users" 
ON rewarded_ads FOR INSERT 
TO public 
WITH CHECK (true);

-- 서버 액션(anon key 사용)에서 조회 가능하도록 정책 추가
CREATE POLICY "Enable read access for all users" 
ON rewarded_ads FOR SELECT 
TO public 
USING (true);
