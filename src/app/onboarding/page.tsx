"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamMascot } from "@/components/team/team-mascot";
import { createClient } from "@/lib/supabase";
import { TEAM_LIST } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { TeamCode } from "@/types";

const PRIMARY_BTN =
  "flex h-14 w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent)] text-base font-semibold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.99] disabled:opacity-60";

/**
 * 온보딩 (/onboarding) — 최초 1회
 * 응원팀 선택 → users 테이블에 프로필 생성 → /home 이동
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = useState<TeamCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 마운트 시 로그인 확인 — 세션 없으면 로그인으로
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) router.replace("/login");
    });
  }, [router]);

  const handleStart = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // 현재 로그인한 유저 확인
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      // 세션이 없으면 로그인부터
      router.replace("/login");
      return;
    }

    // users 테이블에 프로필 생성/갱신 (id = auth.uid())
    const { error: upsertError } = await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? `${user.id}@kakao.local`,
        my_team: selectedTeam,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    router.replace("/home");
  };

  return (
    <main className="page-gradient flex flex-1 flex-col px-5 pt-8 pb-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold leading-snug text-text-primary">
            응원하는 팀을 선택해주세요!
          </h1>
        </header>

        <div className="grid flex-1 grid-cols-2 gap-3">
          {TEAM_LIST.map((team) => {
            const isSelected = selectedTeam === team.code;

            return (
              <button
                key={team.code}
                type="button"
                onClick={() => setSelectedTeam(team.code)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 px-3 py-5 transition-all active:scale-[0.98]",
                  isSelected
                    ? "border-accent ring-2 ring-[var(--accent-border)]"
                    : "border-transparent"
                )}
                style={{ backgroundColor: team.pastelBg }}
                aria-pressed={isSelected}
                aria-label={`${team.name} 선택`}
              >
                <TeamMascot team={team} size="xl" />
                <span
                  className="text-sm font-semibold"
                  style={{ color: team.color }}
                >
                  {team.name}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mt-4 text-center text-sm font-medium text-rose-500">
            {error}
          </p>
        ) : null}

        <div className="mt-8 pb-4">
          <button
            type="button"
            disabled={!selectedTeam || loading}
            onClick={handleStart}
            className={PRIMARY_BTN}
          >
            {loading ? "저장 중..." : "시작하기"}
          </button>
        </div>
      </div>
    </main>
  );
}
