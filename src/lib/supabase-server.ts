import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 컴포넌트 / Route Handler 용 Supabase 클라이언트
 * - 쿠키를 통해 세션을 읽고 갱신한다 (@supabase/ssr).
 * - Next.js 16에서 cookies()는 async 이므로 await 후 사용.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // 서버 컴포넌트에서 호출되면 set이 막힐 수 있으나,
          // 미들웨어/Route Handler에서 세션 갱신이 이뤄지므로 무시 가능.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 렌더 중 set 시도 — 무시
          }
        },
      },
    }
  );
}
