"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Image as ImageIcon, Plus } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { getStadium } from "@/lib/stadiums";
import { getTeam } from "@/lib/teams";
import { displayDate, resultLabel, winRate } from "@/lib/utils";
import type {
  GameResult,
  Record as GameRecord,
  StadiumCode,
} from "@/types";

function resultBadgeClass(result: GameResult): string {
  const base =
    "shrink-0 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold";
  switch (result) {
    case "win":
      return `${base} bg-accent-bg text-accent`;
    case "loss":
      return `${base} bg-surface-subtle text-text-secondary`;
    case "draw":
      return `${base} bg-surface-subtle text-text-tertiary`;
  }
}

/** 팀 구분용 작은 색 점 (홈과 동일) */
function TeamDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full ring-2 ring-white/60"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
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
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

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
      <main className="page-gradient flex flex-1 items-center justify-center">
        <p className="text-sm text-text-tertiary">불러오는 중...</p>
      </main>
    );
  }

  const wins = records.filter((r) => r.result === "win").length;
  const losses = records.filter((r) => r.result === "loss").length;
  const winRatePercent = Math.round(winRate(wins, losses) * 100);

  return (
    <>
      <main className="page-gradient flex flex-1 flex-col px-5 pb-28 pt-8">
        <div className="mx-auto w-full max-w-md">
          {/* 헤더 */}
          <header className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text-primary">직관 기록</h1>
            <Link
              href="/record/new"
              className="flex items-center gap-1 rounded-[var(--radius-md)] bg-accent-bg px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-bg-strong active:scale-[0.99]"
            >
              <Plus size={16} />
              새 기록
            </Link>
          </header>

          {records.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-text-secondary">
                총 {records.length}회 직관 | 승률 {winRatePercent}%
              </p>

              <ul className="space-y-2">
                {records.map((record) => (
                  <RecordCard key={record.id} record={record} />
                ))}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-base text-text-secondary">
                아직 직관 기록이 없어요
              </p>
              <Link href="/record/new" className="mt-6 w-full">
                <Button variant="secondary">첫 직관 기록하기</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
      <BottomNav variant="glass" />
    </>
  );
}

function RecordCard({ record }: { record: GameRecord }) {
  const myTeam = getTeam(record.my_team);
  const opponentTeam = getTeam(record.opponent_team);
  const stadium = getStadium(record.stadium as StadiumCode);
  const photos = record.photos ?? [];
  const thumbnail = photos[0];
  const photoCount = photos.length;

  const hasScore =
    record.my_score !== null && record.opponent_score !== null;

  return (
    <li>
      <Link
        href={`/record/${record.id}`}
        className="glass-card block p-4 transition-opacity active:opacity-80"
      >
        {/* 최상단: 날짜(좌) · 승/패 배지(우) — 사진 유무와 무관하게 고정 */}
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-sm font-semibold text-text-primary">
            {displayDate(record.game_date)}
          </p>
          {record.result ? (
            <span className={resultBadgeClass(record.result)}>
              {resultLabel(record.result)}
            </span>
          ) : null}
        </div>

        {/* 본문: 텍스트(좌) · 썸네일(우) */}
        <div className="mt-2 flex gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="flex items-center gap-1.5">
                <TeamDot color={myTeam.color} />
                <span className="text-sm font-semibold text-text-primary">
                  {myTeam.short}
                </span>
              </div>
              {hasScore ? (
                <span className="text-base font-bold tabular-nums text-text-primary">
                  {record.my_score} : {record.opponent_score}
                </span>
              ) : (
                <span className="text-sm font-semibold text-text-tertiary">
                  vs
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <TeamDot color={opponentTeam.color} />
                <span className="text-sm font-semibold text-text-primary">
                  {opponentTeam.short}
                </span>
              </div>
            </div>

            <p className="mt-1.5 text-xs text-text-tertiary">{stadium.name}</p>

            {record.comment ? (
              <p className="mt-1.5 line-clamp-1 text-sm text-text-secondary">
                {record.comment}
              </p>
            ) : null}
          </div>

          {thumbnail ? (
            <div className="relative h-[68px] w-[68px] shrink-0 self-center overflow-hidden rounded-[var(--radius-md)] bg-surface-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnail}
                alt="직관 사진"
                className="h-full w-full object-cover"
              />
              {photoCount >= 2 ? (
                <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  <ImageIcon size={10} strokeWidth={2.2} aria-hidden />
                  {photoCount}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
