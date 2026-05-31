"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

/**
 * 로그인 (/login)
 * Supabase Auth — 이메일 매직링크(OTP) 로그인
 * 이메일 입력 → 메일로 받은 링크 클릭 → /auth/callback 에서 자동 로그인
 * (비밀번호 불필요)
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // 메일 링크 클릭 후 돌아올 콜백 주소 (배포 환경별 동적 설정)
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("링크 전송에 실패했어요. 이메일을 확인하고 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#EBF2FD] px-6">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        {/* 심볼 */}
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#B8D4F8] text-4xl shadow-sm">
          ⚾️
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#1A56DB]">
          직관생활
        </h1>
        <p className="mt-3 text-base leading-6 text-slate-600">
          이메일로 간편하게 시작하고
          <br />
          나만의 직관 기록을 남겨보세요
        </p>

        {sent ? (
          /* 전송 성공 안내 */
          <div className="mt-10 w-full rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-base font-semibold leading-7 text-slate-700">
              이메일을 확인해주세요!
              <br />
              로그인 링크를 보냈습니다 📧
            </p>
            <p className="mt-3 text-sm text-slate-400">
              {email} 로 전송됨
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="mt-4 text-sm font-medium text-[#1A56DB] underline"
            >
              다른 이메일로 다시 받기
            </button>
          </div>
        ) : (
          /* 이메일 입력 폼 */
          <form onSubmit={handleSubmit} className="mt-10 w-full">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              autoComplete="email"
              required
              className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
            />

            <button
              type="submit"
              disabled={loading || !email}
              className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-[#1A56DB] text-base font-semibold text-white shadow-md transition-colors hover:bg-[#1547b8] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "전송 중..." : "로그인 링크 받기"}
            </button>

            {error ? (
              <p className="mt-4 text-sm font-medium text-rose-500">{error}</p>
            ) : null}
          </form>
        )}

        <p className="mt-8 text-xs text-slate-400">
          카카오 로그인은 준비 중입니다
        </p>
      </div>
    </main>
  );
}
