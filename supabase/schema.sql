-- ============================================================
-- 직관생활 — Supabase 스키마
-- Supabase Dashboard → SQL Editor 에 붙여넣고 실행하세요.
-- (전체를 한 번에 실행해도 됩니다. 재실행 안전을 위해 IF NOT EXISTS 사용)
-- ============================================================

-- ------------------------------------------------------------
-- 1. users 테이블 (프로필)
--   id 는 Supabase Auth 의 auth.users(id) 를 그대로 사용한다.
--   → RLS 에서 auth.uid() = id 로 본인 확인이 가능해진다.
--   (CLAUDE.md 의 gen_random_uuid() 대신 auth 연동 방식을 채택)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  nickname    TEXT,
  my_team     TEXT NOT NULL,                 -- 'lions', 'bears', 'twins' 등
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. records 테이블 (직관 기록)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_date       DATE NOT NULL,
  stadium         TEXT NOT NULL,             -- 구장 코드
  my_team         TEXT NOT NULL,
  opponent_team   TEXT NOT NULL,
  my_score        INTEGER,
  opponent_score  INTEGER,
  result          TEXT CHECK (result IN ('win', 'loss', 'draw')),
  comment         TEXT,
  is_home         BOOLEAN NOT NULL DEFAULT true,   -- 홈/원정 구분
  photos          TEXT[] NOT NULL DEFAULT '{}',    -- Supabase Storage URL 배열
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS records_user_id_idx   ON public.records (user_id);
CREATE INDEX IF NOT EXISTS records_game_date_idx ON public.records (game_date);

-- ------------------------------------------------------------
-- 3. kbo_games 테이블 (크롤링 데이터 캐시 — 공용)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kbo_games (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id        TEXT,                        -- 네이버 경기 식별자 (예: 20260625HTWO02026)
  game_date      DATE NOT NULL,
  game_datetime  TIMESTAMPTZ,                 -- 경기 시작 시각 (KST, +09:00 보정)
  time_tbd       BOOLEAN NOT NULL DEFAULT false, -- 시작 시각 미정 여부
  stadium        TEXT NOT NULL,
  home_team      TEXT NOT NULL,
  away_team      TEXT NOT NULL,
  home_score     INTEGER,
  away_score     INTEGER,
  status         TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
  inning_scores  JSONB,                       -- 이닝별 점수
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_date, home_team, away_team)
);

CREATE INDEX IF NOT EXISTS kbo_games_date_stadium_idx
  ON public.kbo_games (game_date, stadium);

-- 기존 DB 마이그레이션 (CREATE TABLE IF NOT EXISTS 는 컬럼을 추가하지 않으므로 별도 처리)
ALTER TABLE public.kbo_games
  ADD COLUMN IF NOT EXISTS game_datetime TIMESTAMPTZ;
ALTER TABLE public.kbo_games
  ADD COLUMN IF NOT EXISTS time_tbd BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.kbo_games
  ADD COLUMN IF NOT EXISTS game_id TEXT;

-- ============================================================
-- RLS (Row Level Security)
--   원칙:
--   - users / records : 유저는 자기 데이터만 읽기/쓰기 가능
--   - kbo_games       : 공용 캐시 → 인증 유저는 읽기 가능,
--                       쓰기는 서버(service_role)가 담당 (RLS 우회)
-- ============================================================

-- ---- users ----
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_delete_own" ON public.users;
CREATE POLICY "users_delete_own"
  ON public.users FOR DELETE
  USING (auth.uid() = id);

-- ---- records ----
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "records_select_own" ON public.records;
CREATE POLICY "records_select_own"
  ON public.records FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "records_insert_own" ON public.records;
CREATE POLICY "records_insert_own"
  ON public.records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "records_update_own" ON public.records;
CREATE POLICY "records_update_own"
  ON public.records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "records_delete_own" ON public.records;
CREATE POLICY "records_delete_own"
  ON public.records FOR DELETE
  USING (auth.uid() = user_id);

-- ---- kbo_games (공용 캐시) ----
ALTER TABLE public.kbo_games ENABLE ROW LEVEL SECURITY;

-- 인증된 유저는 경기 데이터를 읽을 수 있다.
DROP POLICY IF EXISTS "kbo_games_select_authenticated" ON public.kbo_games;
CREATE POLICY "kbo_games_select_authenticated"
  ON public.kbo_games FOR SELECT
  TO authenticated
  USING (true);

-- 쓰기(INSERT/UPDATE)는 크롤러가 service_role 키로 수행하며,
-- service_role 은 RLS 를 우회하므로 별도 정책이 필요 없다.
-- 만약 클라이언트(anon/authenticated)에서도 캐시를 채워야 한다면
-- 아래 정책의 주석을 해제하세요.
--
-- DROP POLICY IF EXISTS "kbo_games_write_authenticated" ON public.kbo_games;
-- CREATE POLICY "kbo_games_write_authenticated"
--   ON public.kbo_games FOR INSERT
--   TO authenticated
--   WITH CHECK (true);
