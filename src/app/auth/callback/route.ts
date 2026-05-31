import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * 카카오 OAuth 콜백 (/auth/callback)
 * 1) URL의 code 파라미터로 세션 교환 (exchangeCodeForSession)
 * 2) users 테이블에 프로필이 있으면 기존 유저 → /home
 *    없으면 신규 유저 → /onboarding
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // code가 없으면 비정상 진입 → 로그인으로
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();

  // 인가 코드 → 세션 교환 (쿠키에 세션 저장)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // users 테이블에 프로필 존재 여부 확인 → 신규/기존 분기
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  const destination = profile ? "/home" : "/onboarding";
  return NextResponse.redirect(`${origin}${destination}`);
}
