"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TeamMascot } from "@/components/team/team-mascot";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { TEAM_LIST, getTeam } from "@/lib/teams";
import { cn, winRate } from "@/lib/utils";
import type { TeamCode } from "@/types";

interface Profile {
  email: string;
  my_team: TeamCode;
}

/**
 * 마이페이지 (/my)
 * 프로필, 응원팀 변경, 기록 요약, 로그아웃
 */
export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalGames, setTotalGames] = useState(0);
  const [winRatePercent, setWinRatePercent] = useState(0);

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamCode | null>(null);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("users")
        .select("email, my_team")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileData) {
        router.replace("/onboarding");
        return;
      }

      setProfile(profileData as Profile);

      const { data: records } = await supabase
        .from("records")
        .select("result")
        .eq("user_id", user.id);

      const list = records ?? [];
      const wins = list.filter((r) => r.result === "win").length;
      const losses = list.filter((r) => r.result === "loss").length;

      setTotalGames(list.length);
      setWinRatePercent(Math.round(winRate(wins, losses) * 100));
      setLoading(false);
    }

    load();
  }, [router]);

  const openTeamModal = () => {
    if (!profile) return;
    setSelectedTeam(profile.my_team);
    setTeamError(null);
    setTeamModalOpen(true);
  };

  const handleTeamChange = async () => {
    if (!profile || !selectedTeam) return;
    if (selectedTeam === profile.my_team) {
      setTeamModalOpen(false);
      return;
    }

    setTeamSaving(true);
    setTeamError(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ my_team: selectedTeam })
      .eq("id", user.id);

    if (error) {
      setTeamError("팀 변경에 실패했어요. 잠시 후 다시 시도해주세요.");
      setTeamSaving(false);
      return;
    }

    setProfile({ ...profile, my_team: selectedTeam });
    setTeamModalOpen(false);
    setTeamSaving(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading || !profile) {
    return (
      <main className="page-gradient flex flex-1 items-center justify-center">
        <p className="text-sm text-text-tertiary">불러오는 중...</p>
      </main>
    );
  }

  const myTeam = getTeam(profile.my_team);

  return (
    <>
      <main className="page-gradient flex flex-1 flex-col px-5 pb-28 pt-8">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <h1 className="mb-6 text-2xl font-bold text-text-primary">
            마이페이지
          </h1>

          {/* 프로필 */}
          <section className="glass-card mb-3 p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              프로필
            </h2>

            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-medium text-text-tertiary">
                  이메일
                </p>
                <p className="text-sm text-text-secondary">{profile.email}</p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-text-tertiary">
                  응원팀
                </p>
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: myTeam.pastelBg,
                    color: myTeam.color,
                  }}
                >
                  <TeamMascot team={myTeam} size="md" />
                  {myTeam.name}
                </span>
              </div>

              <button
                type="button"
                onClick={openTeamModal}
                className="flex h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-accent-bg text-sm font-semibold text-accent transition-colors hover:bg-accent-bg-strong active:scale-[0.99]"
              >
                팀 변경
              </button>
            </div>
          </section>

          {/* 내 기록 요약 */}
          <section className="glass-card mb-3 p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              내 기록 요약
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-accent">
                  {totalGames}
                </p>
                <p className="mt-1.5 text-sm text-text-secondary">총 직관</p>
              </div>
              <div className="border-l border-[var(--border-subtle)] pl-6">
                <p className="text-3xl font-bold tabular-nums tracking-tight text-accent">
                  {winRatePercent}
                  <span className="ml-0.5 text-xl font-semibold">%</span>
                </p>
                <p className="mt-1.5 text-sm text-text-secondary">승률</p>
              </div>
            </div>
          </section>

          {/* 앱 정보 */}
          <section className="glass-card mb-6 p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              앱 정보
            </h2>
            <p className="text-sm text-text-secondary">직관생활 v1.0</p>
            <a
              href="mailto:contact@jikwan-life.app?subject=직관생활%20문의"
              className="mt-3 inline-block text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              문의하기
            </a>
          </section>

          {/* 로그아웃 — 하단 차분한 스타일 */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-11 w-full items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] text-sm font-medium text-text-tertiary transition-colors hover:bg-surface-subtle active:opacity-80 disabled:opacity-50"
          >
            {loggingOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      </main>

      <BottomNav variant="glass" />

      {/* 팀 변경 모달 */}
      {teamModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-modal-title"
        >
          <div className="glass-card mx-auto w-full max-w-md p-5 shadow-[var(--shadow-glass-lg)]">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="team-modal-title"
                className="text-lg font-bold text-text-primary"
              >
                응원팀 변경
              </h2>
              <button
                type="button"
                onClick={() => setTeamModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-subtle"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto">
              {TEAM_LIST.map((team) => {
                const isSelected = selectedTeam === team.code;

                return (
                  <button
                    key={team.code}
                    type="button"
                    onClick={() => setSelectedTeam(team.code)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-4 transition-all active:scale-[0.98]",
                      isSelected
                        ? "border-accent ring-2 ring-[var(--accent-border)]"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: team.pastelBg }}
                    aria-pressed={isSelected}
                  >
                    <TeamMascot team={team} size="xl" />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: team.color }}
                    >
                      {team.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {teamError ? (
              <p className="mt-3 text-center text-sm text-rose-500">
                {teamError}
              </p>
            ) : null}

            <div className="mt-4">
              <Button
                disabled={!selectedTeam || teamSaving}
                onClick={handleTeamChange}
              >
                {teamSaving ? "저장 중..." : "변경하기"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
