"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/layout/bottom-nav";
import { createClient } from "@/lib/supabase";
import { getTeam } from "@/lib/teams";
import { displayDate, resultLabel, winRate } from "@/lib/utils";
import type { GameResult, Record, TeamCode } from "@/types";

interface Profile {
  nickname: string | null;
  my_team: TeamCode;
}

/**
 * 홈 (/home)
 * 로그인 후 메인 화면 — 시즌 요약 + 최근 기록 + 직관 기록 CTA
 */
export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [recentRecords, setRecentRecords] = useState<Record[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // 1. 로그인 확인
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 2. 프로필 조회 — 없으면 온보딩으로
      const { data: profileData } = await supabase
        .from("users")
        .select("nickname, my_team")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileData) {
        router.replace("/onboarding");
        return;
      }

      setProfile(profileData as Profile);

      // 3. 시즌 요약용 전체 기록 + 최근 3개
      const { data: allRecords } = await supabase
        .from("records")
        .select("*")
        .eq("user_id", user.id)
        .order("game_date", { ascending: false });

      const list = (allRecords ?? []) as Record[];
      setRecords(list);
      setRecentRecords(list.slice(0, 3));
      setLoading(false);
    }

    load();
  }, [router]);

  if (loading || !profile) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#EBF2FD]">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </main>
    );
  }

  const myTeam = getTeam(profile.my_team);
  const wins = records.filter((r) => r.result === "win").length;
  const losses = records.filter((r) => r.result === "loss").length;
  const winRatePercent = Math.round(winRate(wins, losses) * 100);

  return (
    <>
      <main className="flex flex-1 flex-col bg-[#EBF2FD] px-6 pb-28 pt-8">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">
              {profile.nickname
                ? `${profile.nickname}님, 안녕하세요!`
                : "안녕하세요!"}
            </h1>
            <p className="mt-1 text-base text-slate-500">
              {myTeam.name} 오늘도 승리하세요
            </p>
          </header>

          <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500">시즌 요약</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div
                className="rounded-xl px-4 py-3 text-center"
                style={{ backgroundColor: myTeam.pastelBg }}
              >
                <p
                  className="text-2xl font-bold"
                  style={{ color: myTeam.color }}
                >
                  {records.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">직관</p>
              </div>
              <div
                className="rounded-xl px-4 py-3 text-center"
                style={{ backgroundColor: myTeam.pastelBg }}
              >
                <p
                  className="text-2xl font-bold"
                  style={{ color: myTeam.color }}
                >
                  {winRatePercent}%
                </p>
                <p className="mt-1 text-xs text-slate-500">승률</p>
              </div>
            </div>
          </section>

          {/* 최근 기록 */}
          {recentRecords.length > 0 ? (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-slate-500">
                최근 기록
              </h2>
              <ul className="space-y-3">
                {recentRecords.map((record) => {
                  const opponent = getTeam(record.opponent_team);
                  return (
                    <li
                      key={record.id}
                      className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {myTeam.name} vs {opponent.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {displayDate(record.game_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        {record.my_score !== null &&
                        record.opponent_score !== null ? (
                          <p className="text-sm font-bold text-slate-700">
                            {record.my_score} : {record.opponent_score}
                          </p>
                        ) : null}
                        {record.result ? (
                          <span
                            className={resultBadgeClass(record.result)}
                          >
                            {resultLabel(record.result)}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <div className="mt-auto space-y-4">
            <Link
              href="/record/new"
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#B8D4F8] text-base font-semibold text-[#1A56DB] shadow-sm transition-colors hover:bg-[#a5c7f5] active:scale-[0.99]"
            >
              오늘의 직관 기록하기
            </Link>
            {recentRecords.length === 0 ? (
              <p className="text-center text-sm text-slate-400">
                최근 기록이 없습니다
              </p>
            ) : null}
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}

function resultBadgeClass(result: GameResult): string {
  const base =
    "ml-auto mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold";
  switch (result) {
    case "win":
      return `${base} bg-emerald-50 text-emerald-600`;
    case "loss":
      return `${base} bg-red-50 text-red-500`;
    case "draw":
      return `${base} bg-slate-100 text-slate-500`;
  }
}
