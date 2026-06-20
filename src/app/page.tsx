"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

/**
 * 랜딩 페이지 (/)
 * - PWA 는 종료 후 재실행 시 (홈 화면 아이콘에 따라) 이 URL 로 열릴 수 있으므로,
 *   진입 시 세션을 확인해 로그인 상태면 /home 으로 보낸다.
 *   (프로필 유무에 따른 /onboarding 분기는 /home 가드가 처리)
 * - getSession() 은 localStorage 기반(네트워크 불필요)이라 콜드 스타트에서도 안전.
 * - 비로그인 사용자에게만 서비스 소개 + 시작하기 CTA 를 보여준다.
 */
export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace("/home");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <main className="page-gradient flex flex-1 items-center justify-center">
        <p className="text-sm text-text-tertiary">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="page-gradient flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="glass-card mx-auto flex w-full max-w-md flex-col items-center p-8 text-center">
        <div className="glass mb-6 flex h-20 w-20 items-center justify-center rounded-[var(--radius-xl)] text-4xl">
          ⚾️
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          직관생활
        </h1>

        <p className="mt-3 text-lg font-medium leading-snug text-text-secondary">
          내 직관이 기록이 되는 순간
        </p>

        <Link
          href="/login"
          className="mt-10 flex h-14 w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent)] text-base font-semibold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.99]"
        >
          시작하기
        </Link>
      </div>
    </main>
  );
}
