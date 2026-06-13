"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TeamMascot } from "@/components/team/team-mascot";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { getStadium } from "@/lib/stadiums";
import { getTeam } from "@/lib/teams";
import { winRate } from "@/lib/utils";
import type {
  GameResult,
  Record as GameRecord,
  StadiumCode,
} from "@/types";

/** 'YYYY-MM-DD' → '2026.06.07 토' */
function formatRecordDate(isoDate: string): string {
  const date = new Date(isoDate);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d} ${days[date.getDay()]}`;
}

function resultBadgeText(result: GameResult): string {
  switch (result) {
    case "win":
      return "승리";
    case "loss":
      return "패배";
    case "draw":
      return "무승부";
  }
}

function resultBadgeClass(result: GameResult): string {
  const base =
    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold";
  switch (result) {
    case "win":
      return `${base} bg-emerald-50 text-emerald-600`;
    case "loss":
      return `${base} bg-red-50 text-red-500`;
    case "draw":
      return `${base} bg-slate-100 text-slate-500`;
  }
}

/**
 * 직관 기록 목록 (/record)
 * 내 전체 기록 조회 + 카드 보기 이동
 */
export default function RecordListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<GameRecord[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        router.replace("/onboarding");
        return;
      }

      const { data: allRecords } = await supabase
        .from("records")
        .select("*")
        .eq("user_id", user.id)
        .order("game_date", { ascending: false });

      setRecords((allRecords ?? []) as GameRecord[]);
      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#EBF2FD]">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </main>
    );
  }

  const wins = records.filter((r) => r.result === "win").length;
  const losses = records.filter((r) => r.result === "loss").length;
  const winRatePercent = Math.round(winRate(wins, losses) * 100);

  return (
    <>
      <main className="flex flex-1 flex-col bg-[#EBF2FD] px-6 pb-28 pt-8">
        <div className="mx-auto w-full max-w-md">
          {/* 헤더 */}
          <header className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">직관 기록</h1>
            <Link
              href="/record/new"
              className="flex items-center gap-1 rounded-xl bg-[#B8D4F8] px-3 py-2 text-sm font-semibold text-[#1A56DB] transition-colors hover:bg-[#a5c7f5] active:scale-[0.99]"
            >
              <Plus size={16} />
              새 기록
            </Link>
          </header>

          {records.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-slate-500">
                총 {records.length}회 직관 | 승률 {winRatePercent}%
              </p>

              <ul className="space-y-3">
                {records.map((record) => (
                  <RecordCard key={record.id} record={record} />
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-base text-slate-500">
                아직 직관 기록이 없어요
              </p>
              <Link href="/record/new" className="mt-6 w-full">
                <Button variant="secondary">첫 직관 기록하기</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}

function RecordCard({ record }: { record: GameRecord }) {
  const myTeam = getTeam(record.my_team);
  const opponentTeam = getTeam(record.opponent_team);
  const stadium = getStadium(record.stadium as StadiumCode);
  const thumbnail = record.photos?.[0];

  const hasScore =
    record.my_score !== null && record.opponent_score !== null;

  return (
    <li>
      <Link
        href={`/record/${record.id}`}
        className="block rounded-2xl bg-white p-4 shadow-sm transition-colors active:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">
            {formatRecordDate(record.game_date)}
          </p>
          {record.result ? (
            <span className={resultBadgeClass(record.result)}>
              {resultBadgeText(record.result)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <TeamMascot team={myTeam} size="md" />
          <span className="text-sm font-medium text-slate-400">vs</span>
          <TeamMascot team={opponentTeam} size="md" />
          {hasScore ? (
            <span className="ml-1 text-base font-bold text-slate-800">
              {record.my_score} : {record.opponent_score}
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-slate-400">{stadium.name}</p>

        {(record.comment || thumbnail) && (
          <div className="mt-3 flex items-end justify-between gap-3">
            {record.comment ? (
              <p className="line-clamp-1 flex-1 text-sm text-slate-500">
                {record.comment}
              </p>
            ) : (
              <span className="flex-1" />
            )}
            {thumbnail ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnail}
                  alt="직관 사진"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        )}
      </Link>
    </li>
  );
}
