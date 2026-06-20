import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트
 *
 * 세션 저장은 localStorage 를 사용한다.
 * - 이 앱은 모든 인증 가드가 클라이언트 사이드(getSession)라 서버가 세션을 읽을
 *   필요가 없으므로 쿠키(@supabase/ssr) 기반이 불필요하다.
 * - iOS standalone PWA(WKWebView)에서 JS 가 쓴 쿠키는 ITP 정책상 만료가 7일로
 *   강제 제한되고 재실행 간 보존이 불안정하다. localStorage 는 설치형 PWA 에서
 *   훨씬 안정적으로 유지돼 리프레시 토큰 유효기간 동안 세션이 보존된다.
 *
 * persistSession + autoRefreshToken 으로 재실행/포커스 시 세션이 자동 복원·갱신된다.
 * 여러 페이지에서 createClient() 를 호출해도 같은 인스턴스를 재사용하도록 싱글톤 처리.
 */
let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
      },
    }
  );

  return browserClient;
}
