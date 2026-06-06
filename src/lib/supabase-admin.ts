import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용(Service Role) Supabase 클라이언트.
 * - RLS 를 우회하므로 절대 클라이언트 번들에 노출되면 안 된다 (서버에서만 import).
 * - kbo_games 같은 공용 캐시 테이블에 쓰기(upsert)할 때 사용한다.
 * - SUPABASE_SERVICE_ROLE_KEY 가 없으면 null 을 반환한다 (호출부에서 폴백 처리).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
