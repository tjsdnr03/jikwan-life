"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import CardEditor from "@/components/card/CardEditor";
import type { CardData } from "@/components/card/StoryCard";
import { recordToCardData } from "@/lib/cardData";
import { createClient } from "@/lib/supabase";
import type { Record as GameRecord } from "@/types";

/**
 * 카드 에디터 (/card/preview)
 * 로그인 사용자의 가장 최근 직관 기록을 실제 데이터로 불러와
 * CardEditor(모드·배경색·데코·사진)로 카드 미리보기를 조정한다.
 */
export default function CardPreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [recordPhotos, setRecordPhotos] = useState<string[]>([]);

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

      // 가장 최근 직관 기록 1건 → 카드 데이터로 변환 (표시 전용)
      const { data: record } = await supabase
        .from("records")
        .select("*")
        .eq("user_id", user.id)
        .order("game_date", { ascending: false })
        .limit(1)
        .maybeSingle<GameRecord>();

      if (record) {
        setCardData(recordToCardData(record));
        setRecordPhotos(record.photos ?? []);
      }
      setLoading(false);
    }

    load();
  }, [router]);

  return (
    <main className="min-h-full bg-[#EBF2FD] pb-10">
      <div className="mx-auto w-full max-w-md px-6 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/card"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1A56DB] shadow-sm transition-colors hover:bg-[#EBF2FD]"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">카드 에디터</h1>
        </header>

        {loading ? (
          <p className="mt-20 text-center text-sm text-slate-500">
            불러오는 중...
          </p>
        ) : cardData ? (
          <CardEditor data={cardData} recordPhotos={recordPhotos} />
        ) : (
          <div className="mt-20 text-center">
            <p className="text-sm text-slate-500">아직 직관 기록이 없어요.</p>
            <Link
              href="/record/new"
              className="mt-4 inline-block text-sm font-semibold text-[#1A56DB]"
            >
              직관 기록하러 가기
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
