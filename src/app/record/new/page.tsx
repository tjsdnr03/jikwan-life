"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { STADIUM_LIST } from "@/lib/stadiums";
import { TEAM_LIST, getTeam } from "@/lib/teams";
import { cn, formatDate, getResult } from "@/lib/utils";
import type { StadiumCode, TeamCode } from "@/types";

/**
 * 직관 기록 작성 (/record/new)
 * 한 화면 스크롤 폼 — records 테이블에 INSERT 후 /card/[id]로 이동
 */
export default function NewRecordPage() {
  const router = useRouter();

  const [myTeamCode, setMyTeamCode] = useState<TeamCode | null>(null);
  const [gameDate, setGameDate] = useState(() => formatDate(new Date()));
  const [stadium, setStadium] = useState<StadiumCode | null>(null);
  const [opponentTeam, setOpponentTeam] = useState<TeamCode | "">("");
  const [myScore, setMyScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 마운트 시 로그인 확인 + 내 팀 가져오기
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
        .select("my_team")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        router.replace("/onboarding");
        return;
      }

      setMyTeamCode(profile.my_team as TeamCode);
    }

    load();
  }, [router]);

  const myTeam = myTeamCode ? getTeam(myTeamCode) : null;
  // 상대팀 선택 목록 (내 팀 제외)
  const opponentList = TEAM_LIST.filter((team) => team.code !== myTeamCode);

  const handleSave = async () => {
    if (!myTeamCode) return;
    if (!stadium) {
      setError("구장을 선택해주세요.");
      return;
    }
    if (!opponentTeam) {
      setError("상대팀을 선택해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const parsedMyScore = myScore === "" ? null : Number(myScore);
    const parsedOpponentScore =
      opponentScore === "" ? null : Number(opponentScore);

    const result =
      parsedMyScore !== null && parsedOpponentScore !== null
        ? getResult(parsedMyScore, parsedOpponentScore)
        : null;

    const { data: inserted, error: insertError } = await supabase
      .from("records")
      .insert({
        user_id: user.id,
        game_date: gameDate,
        stadium,
        my_team: myTeamCode,
        opponent_team: opponentTeam,
        my_score: parsedMyScore,
        opponent_score: parsedOpponentScore,
        result,
        comment: comment.trim() || null,
        is_home: isHome,
        photos: [],
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      setSaving(false);
      return;
    }

    // 저장 성공 → 방금 만든 기록의 카드 페이지로 이동
    router.push(`/card/${inserted.id}`);
  };

  return (
    <main className="min-h-full bg-[#EBF2FD] pb-10">
      <div className="mx-auto w-full max-w-md px-6 pt-6">
        {/* 상단 헤더 */}
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1A56DB] shadow-sm transition-colors hover:bg-[#EBF2FD]"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">직관 기록하기</h1>
        </header>

        <div className="space-y-6">
          {/* 날짜 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <label
              htmlFor="game-date"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              경기 날짜
            </label>
            <input
              id="game-date"
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-800 outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
            />
          </section>

          {/* 구장 선택 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              구장 선택
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {STADIUM_LIST.map((item) => {
                const selected = stadium === item.code;

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setStadium(item.code)}
                    className={cn(
                      "rounded-xl border-2 px-3 py-3 text-left transition-all active:scale-[0.98]",
                      selected
                        ? "border-[#1A56DB] bg-[#EBF2FD] ring-2 ring-[#1A56DB]/20"
                        : "border-slate-100 bg-slate-50"
                    )}
                    aria-pressed={selected}
                  >
                    <p className="text-sm font-semibold leading-snug text-slate-800">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.city}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 경기 정보 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              경기 정보
            </h2>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  내 팀
                </p>
                <div className="flex h-12 items-center rounded-xl bg-[#EBF2FD] px-4 text-base font-semibold text-[#1A56DB]">
                  {myTeam?.name ?? "..."}
                </div>
              </div>

              <div>
                <label
                  htmlFor="opponent-team"
                  className="mb-2 block text-xs font-medium text-slate-500"
                >
                  상대팀
                </label>
                <select
                  id="opponent-team"
                  value={opponentTeam}
                  onChange={(e) =>
                    setOpponentTeam(e.target.value as TeamCode | "")
                  }
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-800 outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
                >
                  <option value="">상대팀을 선택하세요</option>
                  {opponentList.map((team) => (
                    <option key={team.code} value={team.code}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="my-score"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    {myTeam?.name ?? "내 팀"} 점수
                  </label>
                  <input
                    id="my-score"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={myScore}
                    onChange={(e) => setMyScore(e.target.value)}
                    placeholder="0"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-800 outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="opponent-score"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    상대팀 점수
                  </label>
                  <input
                    id="opponent-score"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={opponentScore}
                    onChange={(e) => setOpponentScore(e.target.value)}
                    placeholder="0"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-800 outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  홈 / 원정
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHome(true)}
                    className={cn(
                      "h-11 rounded-xl border-2 text-sm font-semibold transition-all",
                      isHome
                        ? "border-[#1A56DB] bg-[#EBF2FD] text-[#1A56DB]"
                        : "border-slate-100 bg-slate-50 text-slate-500"
                    )}
                    aria-pressed={isHome}
                  >
                    홈
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHome(false)}
                    className={cn(
                      "h-11 rounded-xl border-2 text-sm font-semibold transition-all",
                      !isHome
                        ? "border-[#1A56DB] bg-[#EBF2FD] text-[#1A56DB]"
                        : "border-slate-100 bg-slate-50 text-slate-500"
                    )}
                    aria-pressed={!isHome}
                  >
                    원정
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 한줄 코멘트 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <label
              htmlFor="comment"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              한줄 코멘트
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="오늘 경기 한줄평을 남겨보세요"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
            />
          </section>

          {/* 사진 (준비중) */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">사진</h2>
            <Button variant="secondary" disabled className="opacity-60">
              사진 추가 (준비중)
            </Button>
          </section>

          {/* 저장 */}
          {error ? (
            <p className="text-center text-sm font-medium text-rose-500">
              {error}
            </p>
          ) : null}
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={saving || !myTeamCode}
          >
            {saving ? "저장 중..." : "기록 저장하기"}
          </Button>
        </div>
      </div>
    </main>
  );
}
