"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Step = 1 | 2;

const OTP_LENGTH = 8;

const INPUT_CLASS =
  "h-14 w-full rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 text-base text-text-primary outline-none backdrop-blur-sm transition-colors placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-[var(--accent-border)]";

const OTP_INPUT_CLASS =
  "h-16 w-full rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 text-center text-3xl font-bold tracking-[0.3em] text-text-primary outline-none backdrop-blur-sm transition-colors placeholder:text-text-tertiary placeholder:tracking-[0.3em] focus:border-accent focus:ring-2 focus:ring-[var(--accent-border)]";

const PRIMARY_BTN_CLASS =
  "mt-4 flex h-14 w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent)] text-base font-semibold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.99] disabled:opacity-60";

function mapOtpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("expired") || lower.includes("만료")) {
    return "코드가 만료되었어요. 다시 받아주세요";
  }
  return "인증 코드가 올바르지 않아요. 다시 확인해주세요";
}

/**
 * 로그인 (/login)
 * Supabase Auth — 이메일 OTP 코드 로그인
 */
export default function LoginPage() {
  const router = useRouter();
  const codeInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step === 2) {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const sendOtp = async (targetEmail: string) => {
    const supabase = createClient();
    return supabase.auth.signInWithOtp({ email: targetEmail });
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    setError(null);

    const { error: otpError } = await sendOtp(email);

    if (otpError) {
      setError("인증 코드 전송에 실패했어요. 이메일을 확인하고 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    setCode("");
    setStep(2);
    setLoading(false);
  };

  const handleResendCode = async () => {
    if (!email || resendLoading) return;

    setResendLoading(true);
    setError(null);

    const { error: otpError } = await sendOtp(email);

    if (otpError) {
      setError("코드 재전송에 실패했어요. 잠시 후 다시 시도해주세요.");
    } else {
      setCode("");
      codeInputRef.current?.focus();
    }

    setResendLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || code.length !== OTP_LENGTH || loading) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verifyError) {
      setError(mapOtpError(verifyError.message));
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      setError("로그인에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    router.replace(profile ? "/home" : "/onboarding");
  };

  const handleBackToEmail = () => {
    setStep(1);
    setCode("");
    setError(null);
  };

  const handleCodeChange = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, OTP_LENGTH));
    if (error) setError(null);
  };

  return (
    <main className="page-gradient flex flex-1 flex-col items-center justify-center px-5 py-12">
      <div className="glass-card mx-auto w-full max-w-md p-8 text-center">
        <div className="glass mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] text-3xl">
          ⚾️
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          직관생활
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          이메일로 간편하게 시작하고
          <br />
          나만의 직관 기록을 남겨보세요
        </p>

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="mt-8 w-full text-left">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              autoComplete="email"
              required
              className={INPUT_CLASS}
            />

            <button
              type="submit"
              disabled={loading || !email}
              className={PRIMARY_BTN_CLASS}
            >
              {loading ? "전송 중..." : "인증 코드 받기"}
            </button>

            {error ? (
              <p className="mt-4 text-center text-sm font-medium text-rose-500">
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-8 w-full text-left">
            <p className="mb-6 text-center text-sm leading-relaxed text-text-secondary">
              <span className="font-semibold text-text-primary">{email}</span>
              으로 인증 코드를 보냈어요
            </p>

            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              maxLength={OTP_LENGTH}
              placeholder="········"
              className={OTP_INPUT_CLASS}
              aria-label="인증 코드"
            />

            <button
              type="submit"
              disabled={loading || code.length !== OTP_LENGTH}
              className={PRIMARY_BTN_CLASS}
            >
              {loading ? "확인 중..." : "로그인"}
            </button>

            {error ? (
              <p className="mt-4 text-center text-sm font-medium text-rose-500">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading || loading}
                className="text-sm font-medium text-accent disabled:opacity-50"
              >
                {resendLoading ? "재전송 중..." : "코드 재전송"}
              </button>
              <button
                type="button"
                onClick={handleBackToEmail}
                disabled={loading}
                className="text-sm font-medium text-text-secondary underline-offset-2 hover:underline"
              >
                다른 이메일로 다시 받기
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-xs text-text-tertiary">
          카카오 로그인은 준비 중입니다
        </p>
      </div>
    </main>
  );
}
