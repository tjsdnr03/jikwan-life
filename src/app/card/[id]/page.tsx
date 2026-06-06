"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PastelCard } from "@/components/card/pastel-card";
import { createClient } from "@/lib/supabase";
import { getStadium } from "@/lib/stadiums";
import { getTeam } from "@/lib/teams";
import { displayDate, winRate } from "@/lib/utils";
import type { CardData } from "@/components/card/types";
import type { GameResult, Record as GameRecord } from "@/types";

/**
 * 카드 생성/편집 (/card/[id])
 * - URL의 id로 records 조회 → 로그인 + 본인 기록 확인
 * - 전체 기록으로 시즌 승률 계산
 * - 실제 데이터로 파스텔 카드 렌더링 → html2canvas로 캡처해 저장/공유
 */
export default function CardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const cardRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [gameDateRaw, setGameDateRaw] = useState(""); // 파일명용 'YYYY-MM-DD'
  const [working, setWorking] = useState(false);

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

      // 해당 기록 조회
      const { data: record, error: recordError } = await supabase
        .from("records")
        .select("*")
        .eq("id", id)
        .maybeSingle<GameRecord>();

      if (recordError || !record) {
        setError("기록을 찾을 수 없어요.");
        setLoading(false);
        return;
      }

      // 본인 기록인지 확인
      if (record.user_id !== user.id) {
        setError("내 기록만 카드로 만들 수 있어요.");
        setLoading(false);
        return;
      }

      // 시즌 승률: 본인 전체 기록의 결과 집계 (무승부 제외)
      const { data: allRecords } = await supabase
        .from("records")
        .select("result")
        .eq("user_id", user.id);

      const wins =
        allRecords?.filter((r) => r.result === "win").length ?? 0;
      const losses =
        allRecords?.filter((r) => r.result === "loss").length ?? 0;
      const seasonWinRate = winRate(wins, losses);

      setCardData({
        myTeam: getTeam(record.my_team),
        opponentTeam: getTeam(record.opponent_team),
        myScore: record.my_score ?? 0,
        opponentScore: record.opponent_score ?? 0,
        result: (record.result ?? "draw") as GameResult,
        stadiumName: getStadium(record.stadium).name,
        gameDate: displayDate(record.game_date),
        comment: record.comment ?? undefined,
        photoUrl: record.photos?.[0],
        seasonWinRate,
      });
      setGameDateRaw(record.game_date);
      setLoading(false);
    }

    load();
  }, [id, router]);

  /**
   * 카드 DOM을 캔버스로 캡처 (라이브러리는 동적 import)
   * html2canvas-pro: Tailwind v4의 lab/lch/oklch/color() 등 최신 컬러 함수를
   * 네이티브로 지원하는 html2canvas 드롭인 포크.
   */
  async function captureCard(): Promise<HTMLCanvasElement | null> {
    const source = cardRef.current;
    if (!source) return null;
    const html2canvas = (await import("html2canvas-pro")).default;
    return html2canvas(source, {
      scale: 3, // 인스타 스토리용 고해상도
      backgroundColor: null,
      useCORS: true,
    });
  }

  const fileName = `직관생활_${gameDateRaw}.png`;

  /** 캔버스를 PNG로 다운로드 */
  function downloadCanvas(canvas: HTMLCanvasElement) {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  /** "이미지 저장하기" */
  async function handleDownload() {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      downloadCanvas(canvas);
    } catch (err) {
      console.error("[card] 이미지 저장 실패:", err);
      setError("이미지 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setWorking(false);
    }
  }

  /** "인스타 스토리 공유" — Web Share API, 미지원 시 다운로드로 폴백 */
  async function handleShare() {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const canvas = await captureCard();
      if (!canvas) return;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      const file = new File([blob], fileName, { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "직관생활",
            text: "오늘의 직관 기록 ⚾️",
          });
        } catch {
          // 사용자가 공유를 취소한 경우 — 조용히 무시
        }
      } else {
        // Web Share(파일) 미지원 브라우저 → 다운로드로 대체
        downloadCanvas(canvas);
      }
    } catch (err) {
      console.error("[card] 공유 실패:", err);
      setError("공유에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setWorking(false);
    }
  }

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
          <h1 className="text-xl font-bold text-slate-800">카드 만들기</h1>
        </header>

        {loading ? (
          <p className="mt-20 text-center text-sm text-slate-500">
            불러오는 중...
          </p>
        ) : error && !cardData ? (
          <div className="mt-20 text-center">
            <p className="text-sm font-medium text-rose-500">{error}</p>
            <Link
              href="/home"
              className="mt-4 inline-block text-sm font-semibold text-[#1A56DB]"
            >
              홈으로 돌아가기
            </Link>
          </div>
        ) : cardData ? (
          <>
            {/* 카드 미리보기 — 이 영역을 html2canvas로 캡처 */}
            <div ref={cardRef}>
              <PastelCard data={cardData} />
            </div>

            {error ? (
              <p className="mt-4 text-center text-sm font-medium text-rose-500">
                {error}
              </p>
            ) : null}

            {/* 액션 버튼 */}
            <div className="mt-6 space-y-3">
              <Button onClick={handleShare} disabled={working}>
                <Share2 size={18} className="mr-2" />
                {working ? "처리 중..." : "인스타 스토리 공유"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownload}
                disabled={working}
              >
                <Download size={18} className="mr-2" />
                이미지 저장하기
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
