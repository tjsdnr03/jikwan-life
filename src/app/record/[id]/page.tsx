"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { getStadium } from "@/lib/stadiums";
import { getTeam } from "@/lib/teams";
import { getRecordPhotoStoragePath } from "@/lib/utils";
import type { GameResult, Record as GameRecord, StadiumCode, TeamCode } from "@/types";

const TEAM_EMOJI: Record<TeamCode, string> = {
  lions: "💙",
  twins: "❤️",
  tigers: "🧡",
  bears: "🌙",
  eagles: "☀️",
  giants: "🌊",
  dinos: "💚",
  wiz: "✨",
  heroes: "💖",
  landers: "🏟️",
};

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
  const base = "rounded-full px-3 py-1 text-sm font-semibold";
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
 * 기록 상세 (/record/[id])
 * 조회, 수정/삭제, 카드 만들기
 */
export default function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

      const { data, error: fetchError } = await supabase
        .from("records")
        .select("*")
        .eq("id", id)
        .maybeSingle<GameRecord>();

      if (fetchError || !data) {
        setError("기록을 찾을 수 없어요.");
        setLoading(false);
        return;
      }

      if (data.user_id !== user.id) {
        setError("내 기록만 볼 수 있어요.");
        setLoading(false);
        return;
      }

      setRecord(data);
      setLoading(false);
    }

    load();
  }, [id, router]);

  const handleDelete = async () => {
    if (!record) return;
    setDeleting(true);

    const supabase = createClient();

    const paths = (record.photos ?? [])
      .map(getRecordPhotoStoragePath)
      .filter((p): p is string => p !== null);

    if (paths.length > 0) {
      await supabase.storage.from("record-photos").remove(paths);
    }

    const { error: deleteError } = await supabase
      .from("records")
      .delete()
      .eq("id", record.id);

    if (deleteError) {
      setDeleting(false);
      setError("삭제에 실패했어요. 잠시 후 다시 시도해주세요.");
      setDeleteModalOpen(false);
      return;
    }

    router.replace("/record");
  };

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#EBF2FD]">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </main>
    );
  }

  if (error || !record) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#EBF2FD] px-6">
        <p className="text-sm text-slate-500">{error ?? "기록을 찾을 수 없어요."}</p>
        <Link href="/record" className="mt-4 text-sm font-medium text-[#1A56DB]">
          목록으로 돌아가기
        </Link>
      </main>
    );
  }

  const myTeam = getTeam(record.my_team);
  const opponentTeam = getTeam(record.opponent_team);
  const stadium = getStadium(record.stadium as StadiumCode);
  const hasScore =
    record.my_score !== null && record.opponent_score !== null;

  return (
    <main className="min-h-full bg-[#EBF2FD] pb-10">
      <div className="mx-auto w-full max-w-md px-6 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/record"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1A56DB] shadow-sm"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="flex-1 text-xl font-bold text-slate-800">기록 상세</h1>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/record/${id}/edit`}
              className="rounded-xl border border-[#1A56DB] px-3 py-2 text-xs font-semibold text-[#1A56DB] hover:bg-[#EBF2FD]"
            >
              수정
            </Link>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="rounded-xl border border-red-400 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        </header>

        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-800">
                  {formatRecordDate(record.game_date)}
                </p>
                <p className="mt-1 text-sm text-slate-500">{stadium.name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {record.is_home ? "홈" : "원정"} 직관
                </p>
              </div>
              {record.result ? (
                <span className={resultBadgeClass(record.result)}>
                  {resultBadgeText(record.result)}
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl">{TEAM_EMOJI[myTeam.code]}</span>
                <span className="mt-1 text-sm font-semibold text-slate-700">
                  {myTeam.name}
                </span>
                {hasScore ? (
                  <span className="text-3xl font-extrabold text-slate-800">
                    {record.my_score}
                  </span>
                ) : null}
              </div>
              <span className="text-xl font-bold text-slate-300">:</span>
              <div className="flex flex-col items-center">
                <span className="text-2xl">{TEAM_EMOJI[opponentTeam.code]}</span>
                <span className="mt-1 text-sm font-semibold text-slate-700">
                  {opponentTeam.name}
                </span>
                {hasScore ? (
                  <span className="text-3xl font-extrabold text-slate-800">
                    {record.opponent_score}
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          {record.comment ? (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-slate-500">
                한줄 코멘트
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                {record.comment}
              </p>
            </section>
          ) : null}

          {record.photos && record.photos.length > 0 ? (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-500">사진</h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {record.photos.map((url, i) => (
                  <div
                    key={url}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`직관 사진 ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <Link href={`/card/${id}`}>
            <Button variant="secondary">카드 만들기</Button>
          </Link>
        </div>
      </div>

      {deleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">기록 삭제</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              정말 삭제하시겠어요? 이 기록은 복구할 수 없습니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-11 rounded-xl bg-red-500 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
