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
      <main className="flex flex-1 items-center justify-center bg-[#EBF2FD]">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#EBF2FD] px-6 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        {/* 이모지 심볼 (자체 캐릭터/색상만 활용) */}
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#B8D4F8] text-5xl shadow-sm">
          ⚾️
        </div>

        {/* 서비스명 */}
        <h1 className="text-4xl font-bold tracking-tight text-[#1A56DB]">
          직관생활
        </h1>

        {/* 부제 */}
        <p className="mt-4 text-lg leading-7 text-slate-600">
          직관을 기록하고,
          <br />
          예쁘게 만들어서,
          <br />
          바로 공유하세요
        </p>

        {/* 시작하기 CTA */}
        <Link
          href="/login"
          className="mt-10 flex h-14 w-full items-center justify-center rounded-2xl bg-[#1A56DB] text-lg font-semibold text-white shadow-md transition-colors hover:bg-[#1547b8] active:scale-[0.99]"
        >
          시작하기
        </Link>

        {/* 보조 안내 */}
        <p className="mt-6 text-sm text-slate-400">
          20~30대 KBO 팬을 위한 직관 기록 앱
        </p>
      </div>
    </main>
  );
}
