"use client";

import Link from "next/link";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { TeamMascot } from "@/components/team/team-mascot";
import { Button } from "@/components/ui/button";
import { getTeam } from "@/lib/teams";
import { cn, displayDate } from "@/lib/utils";
import type { GameResult, Team, TeamCode } from "@/types";

const mockRecord = {
  game_date: "2026-05-30",
  stadium: "대구삼성라이온즈파크",
  my_team: "lions" as TeamCode,
  opponent_team: "bears" as TeamCode,
  my_score: 5,
  opponent_score: 3,
  result: "win" as const,
  comment: "오늘 경기 미쳤다 🔥 역전승!",
  is_home: true,
};

const mockStats = { totalGames: 18, winRate: 72, wins: 13 };

function ResultBadge({ result }: { result: GameResult }) {
  const label =
    result === "win" ? "승리" : result === "loss" ? "패배" : "무승부";

  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold",
        result === "win" && "bg-[#B8D4F8] text-[#1A56DB]",
        result === "loss" && "bg-slate-200 text-slate-600",
        result === "draw" && "bg-amber-100 text-amber-700"
      )}
    >
      {label}
    </span>
  );
}

/**
 * 직관 카드 미리보기 (/card/preview)
 * 인스타 스토리용 9:16 파스텔 카드 — MVP: 더미 데이터
 */
export default function CardPreviewPage() {
  const myTeam = getTeam(mockRecord.my_team);
  const opponentTeam = getTeam(mockRecord.opponent_team);

  const handleComingSoon = () => {
    alert("준비 중입니다!");
  };

  return (
    <main className="min-h-full bg-[#EBF2FD] pb-10">
      <div className="mx-auto w-full max-w-md px-6 pt-6">
        {/* 상단 헤더 */}
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/card"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1A56DB] shadow-sm transition-colors hover:bg-[#EBF2FD]"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">직관 카드 만들기</h1>
        </header>

        {/* 카드 미리보기 (9:16, 300px) */}
        <div className="flex justify-center">
          <div
            className="flex w-[300px] flex-col overflow-hidden rounded-3xl shadow-lg"
            style={{
              aspectRatio: "9 / 16",
              backgroundColor: myTeam.pastelBg,
            }}
          >
            <div className="flex flex-1 flex-col p-4">
              {/* 상단: 날짜 + 결과 뱃지 */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">
                  {displayDate(mockRecord.game_date)}
                </p>
                <ResultBadge result={mockRecord.result} />
              </div>

              {/* 사진 영역 */}
              <div className="mt-3 flex h-[200px] items-center justify-center rounded-2xl bg-white/70 text-sm text-slate-400">
                📸 사진을 선택하세요
              </div>

              {/* 스코어보드 */}
              <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <ScoreTeam
                    team={myTeam}
                    score={mockRecord.my_score}
                    highlight
                  />
                  <span className="text-lg font-bold text-slate-300">VS</span>
                  <ScoreTeam
                    team={opponentTeam}
                    score={mockRecord.opponent_score}
                  />
                </div>
                <p className="mt-2 text-center text-[10px] text-slate-400">
                  {mockRecord.stadium}
                </p>
              </div>

              {/* 코멘트 */}
              <div
                className="mt-3 rounded-xl bg-white px-3 py-2 italic text-sm leading-relaxed text-slate-600"
                style={{ borderLeft: `4px solid ${myTeam.pastel}` }}
              >
                “{mockRecord.comment}”
              </div>

              {/* 시즌 통계 */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatBox label="직관 승률" value={`${mockStats.winRate}%`} />
                <StatBox label="총 직관" value={`${mockStats.totalGames}회`} />
                <StatBox label="올 시즌 승리" value={`${mockStats.wins}승`} />
              </div>

              {/* 워터마크 */}
              <p className="mt-auto pt-3 text-center text-[10px] font-semibold text-slate-400">
                직관생활 ⚾
              </p>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-6 space-y-3">
          <Button variant="secondary" onClick={handleComingSoon}>
            <Download size={18} className="mr-2" />
            이미지 저장하기
          </Button>
          <button
            type="button"
            onClick={handleComingSoon}
            className="flex h-12 w-full items-center justify-center rounded-2xl border-2 border-[#1A56DB] bg-white text-base font-semibold text-[#1A56DB] transition-colors hover:bg-[#EBF2FD] active:scale-[0.99]"
          >
            <Share2 size={18} className="mr-2" />
            인스타 스토리 공유
          </button>
        </div>
      </div>
    </main>
  );
}

function ScoreTeam({
  team,
  score,
  highlight = false,
}: {
  team: Team;
  score: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <TeamMascot team={team} size="md" className="mb-1" />
      <span
        className={cn(
          "text-[10px] font-semibold",
          highlight ? "text-slate-700" : "text-slate-500"
        )}
      >
        {team.name}
      </span>
      <span
        className={cn(
          "text-2xl font-extrabold",
          highlight ? "text-slate-800" : "text-slate-500"
        )}
      >
        {score}
      </span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/80 px-1 py-2 text-center shadow-sm">
      <p className="text-[9px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-slate-700">{value}</p>
    </div>
  );
}
