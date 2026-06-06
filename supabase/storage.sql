-- ============================================================
-- 직관생활 — Supabase Storage (직관 사진)
-- Supabase Dashboard → SQL Editor 에 붙여넣고 실행하세요.
-- (재실행 안전: 버킷은 upsert, 정책은 DROP 후 CREATE)
-- ============================================================

-- ------------------------------------------------------------
-- 1. record-photos 버킷
--   - public            : true  (이미지 public URL로 직접 접근 가능)
--   - file_size_limit   : 5MB
--   - allowed_mime_types: jpeg / png / webp
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'record-photos',
  'record-photos',
  true,
  5242880,                                       -- 5 * 1024 * 1024
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 2. RLS 정책 (storage.objects)
--   업로드 경로 규약: record-photos/{userId}/{timestamp}_{filename}
--   → 객체 name 의 첫 번째 폴더 세그먼트가 곧 소유자(userId).
--   → (storage.foldername(name))[1] = auth.uid()::text 로 본인 확인.
--
--   storage.objects 는 Supabase 가 기본으로 RLS 를 켜둔 상태이다.
-- ============================================================

-- ---- 읽기: public 버킷이므로 누구나 조회 가능 ----
DROP POLICY IF EXISTS "record_photos_public_read" ON storage.objects;
CREATE POLICY "record_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'record-photos');

-- ---- 업로드: 인증 유저가 자기 폴더에만 ----
DROP POLICY IF EXISTS "record_photos_insert_own" ON storage.objects;
CREATE POLICY "record_photos_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'record-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---- 수정: 본인 폴더만 ----
DROP POLICY IF EXISTS "record_photos_update_own" ON storage.objects;
CREATE POLICY "record_photos_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'record-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'record-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---- 삭제: 본인 폴더만 ----
DROP POLICY IF EXISTS "record_photos_delete_own" ON storage.objects;
CREATE POLICY "record_photos_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'record-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
