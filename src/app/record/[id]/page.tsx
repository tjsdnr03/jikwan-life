"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TeamMascot } from "@/components/team/team-mascot";
import { createClient } from "@/lib/supabase";
import { getStadium } from "@/lib/stadiums";
import { getTeam } from "@/lib/teams";
import { getRecordPhotoStoragePath, resultLabel } from "@/lib/utils";
import type { GameResult, Record as GameRecord, StadiumCode } from "@/types";

const SECTION_CLASS = "glass-card p-5";
const BACK_LINK =
  "glass flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-accent transition-opacity hover:opacity-80";
const PRIMARY_BTN =
  "flex h-14 w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent)] text-base font-semibold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.99]";
const BOTTOM_NAV_PADDING =
  "pb-[calc(4rem+max(1.5rem,env(safe-area-inset-bottom))+1rem)]";

function formatRecordDate(isoDate: string): string {
  const date = new Date(isoDate);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d} ${days[date.getDay()]}`;
}

function resultBadgeClass(result: GameResult): string {
  const base =
    "shrink-0 inline-block rounded-full px-2.5 py-1 text-xs font-semibold";
  switch (result) {
    case "win":
      return `${base} bg-accent-bg text-accent`;
    case "loss":
      return `${base} bg-surface-subtle text-text-secondary`;
    case "draw":
      return `${base} bg-surface-subtle text-text-tertiary`;
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
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

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
      <>
        <main
          className={`page-gradient flex flex-1 items-center justify-center ${BOTTOM_NAV_PADDING}`}
        >
          <p className="text-sm text-text-tertiary">불러오는 중...</p>
        </main>
        <BottomNav variant="glass" />
      </>
    );
  }

  if (error || !record) {
    return (
      <>
        <main
          className={`page-gradient flex flex-1 flex-col items-center justify-center px-5 ${BOTTOM_NAV_PADDING}`}
        >
          <p className="text-sm text-text-secondary">
            {error ?? "기록을 찾을 수 없어요."}
          </p>
          <Link href="/record" className="mt-4 text-sm font-medium text-accent">
            목록으로 돌아가기
          </Link>
        </main>
        <BottomNav variant="glass" />
      </>
    );
  }

  const myTeam = getTeam(record.my_team);
  const opponentTeam = getTeam(record.opponent_team);
  const stadium = getStadium(record.stadium as StadiumCode);
  const hasScore =
    record.my_score !== null && record.opponent_score !== null;

  return (
    <>
    <main className={`page-gradient min-h-full ${BOTTOM_NAV_PADDING}`}>
      <div className="mx-auto w-full max-w-md px-5 pt-8">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/record"
            className={BACK_LINK}
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="flex-1 text-xl font-bold text-text-primary">
            기록 상세
          </h1>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/record/${id}/edit`}
              className="rounded-[var(--radius-md)] border border-accent bg-accent-bg px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent-bg-strong"
            >
              수정
            </Link>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="rounded-[var(--radius-md)] border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-50"
            >
              삭제
            </button>
          </div>
        </header>

        <div className="space-y-3">
          <section className={SECTION_CLASS}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {formatRecordDate(record.game_date)}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {stadium.name}
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  {record.is_home ? "홈" : "원정"} 직관
                </p>
              </div>
              {record.result ? (
                <span className={resultBadgeClass(record.result)}>
                  {resultLabel(record.result)}
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <TeamMascot team={myTeam} size="xl" />
                <span className="mt-1 text-sm font-semibold text-text-primary">
                  {myTeam.name}
                </span>
                {hasScore ? (
                  <span className="text-3xl font-extrabold text-text-primary">
                    {record.my_score}
                  </span>
                ) : null}
              </div>
              <span className="text-xl font-bold text-text-tertiary">:</span>
              <div className="flex flex-col items-center">
                <TeamMascot team={opponentTeam} size="xl" />
                <span className="mt-1 text-sm font-semibold text-text-primary">
                  {opponentTeam.name}
                </span>
                {hasScore ? (
                  <span className="text-3xl font-extrabold text-text-primary">
                    {record.opponent_score}
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          {record.comment ? (
            <section className={SECTION_CLASS}>
              <h2 className="mb-2 text-sm font-semibold text-text-secondary">
                한줄 코멘트
              </h2>
              <p className="text-sm leading-relaxed text-text-primary">
                {record.comment}
              </p>
            </section>
          ) : null}

          {record.photos && record.photos.length > 0 ? (
            <section className={SECTION_CLASS}>
              <h2 className="mb-3 text-sm font-semibold text-text-secondary">
                사진
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {record.photos.map((url, i) => (
                  <div
                    key={url}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-subtle"
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

          <Link href={`/card/${id}`} className={PRIMARY_BTN}>
            카드 만들기
          </Link>
        </div>
      </div>

      {deleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card w-full max-w-sm p-5 shadow-[var(--shadow-glass-lg)]">
            <h2 className="text-lg font-bold text-text-primary">기록 삭제</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              정말 삭제하시겠어요? 이 기록은 복구할 수 없습니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="h-11 rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-11 rounded-[var(--radius-md)] bg-rose-500 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
    <BottomNav variant="glass" />
    </>
  );
}
