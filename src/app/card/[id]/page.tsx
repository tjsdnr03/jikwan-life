"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import CardEditor from "@/components/card/CardEditor";
import type { CardData } from "@/components/card/StoryCard";
import { recordToCardData } from "@/lib/cardData";
import { createClient } from "@/lib/supabase";
import type { Record as GameRecord } from "@/types";

/**
 * 카드 생성/편집 (/card/[id])
 * - URL의 id로 records 조회 → 로그인 + 본인 기록 확인
 * - recordToCardData 로 변환해 CardEditor(신버전 StoryCard)에 전달
 * - 모드/배경색/데코/사진 조정 + PNG 저장·공유는 CardEditor 내부에서 처리
 */
export default function CardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [recordPhotos, setRecordPhotos] = useState<string[]>([]);

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

      // 해당 기록 조회 (기존 쿼리 재사용)
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

      setCardData(recordToCardData(record));
      setRecordPhotos(record.photos ?? []);
      setLoading(false);
    }

    load();
  }, [id, router]);

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
        ) : error || !cardData ? (
          <div className="mt-20 text-center">
            <p className="text-sm font-medium text-rose-500">
              {error ?? "기록을 찾을 수 없어요."}
            </p>
            <Link
              href="/home"
              className="mt-4 inline-block text-sm font-semibold text-[#1A56DB]"
            >
              홈으로 돌아가기
            </Link>
          </div>
        ) : (
          <CardEditor data={cardData} recordPhotos={recordPhotos} />
        )}
      </div>
    </main>
  );
}
