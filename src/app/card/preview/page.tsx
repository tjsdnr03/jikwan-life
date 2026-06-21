"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import CardEditor from "@/components/card/CardEditor";
import type { CardData } from "@/components/card/StoryCard";
import { BottomNav } from "@/components/layout/bottom-nav";
import { recordToCardData } from "@/lib/cardData";
import { createClient } from "@/lib/supabase";
import type { Record as GameRecord } from "@/types";

const BACK_LINK =
  "glass flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-accent transition-opacity hover:opacity-80";
const BOTTOM_NAV_PADDING =
  "pb-[calc(4rem+max(1.5rem,env(safe-area-inset-bottom))+1rem)]";

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
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

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
    <>
      <main className={`page-gradient min-h-full ${BOTTOM_NAV_PADDING}`}>
        <div className="mx-auto w-full max-w-md px-5 pt-8">
          <header className="mb-6 flex items-center gap-3">
            <Link href="/card" className={BACK_LINK} aria-label="뒤로가기">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="text-xl font-bold text-text-primary">카드 에디터</h1>
          </header>

          {loading ? (
            <p className="mt-20 text-center text-sm text-text-tertiary">
              불러오는 중...
            </p>
          ) : cardData ? (
            <CardEditor data={cardData} recordPhotos={recordPhotos} />
          ) : (
            <div className="mt-20 text-center">
              <p className="text-sm text-text-secondary">
                아직 직관 기록이 없어요.
              </p>
              <Link
                href="/record/new"
                className="mt-4 inline-block text-sm font-semibold text-accent"
              >
                직관 기록하러 가기
              </Link>
            </div>
          )}
        </div>
      </main>
      <BottomNav variant="glass" />
    </>
  );
}
