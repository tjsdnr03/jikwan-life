"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TeamMascot } from "@/components/team/team-mascot";
import { createClient } from "@/lib/supabase";
import { STADIUM_LIST } from "@/lib/stadiums";
import { TEAM_LIST, getTeam } from "@/lib/teams";
import { cn, formatDate, getResult } from "@/lib/utils";
import type { KBOGameResult, StadiumCode, TeamCode } from "@/types";

/** 사진 업로드 제약 */
const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const SECTION_CLASS = "glass-card p-4";
const LABEL = "mb-2 block text-sm font-semibold text-text-primary";
const LABEL_SM = "mb-2 block text-xs font-medium text-text-tertiary";
const INPUT_CLASS =
  "h-12 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--surface)] px-4 text-base text-text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-[var(--accent-border)]";
const TEXTAREA_CLASS =
  "w-full resize-none rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--surface)] px-4 py-3 text-base text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-[var(--accent-border)]";
const CHIP_SELECTED =
  "border-accent bg-accent-bg ring-2 ring-[var(--accent-border)]";
const CHIP_DEFAULT = "border-transparent bg-surface-subtle";
const TOGGLE_SELECTED = "border-accent bg-accent-bg text-accent";
const TOGGLE_DEFAULT = "border-transparent bg-surface-subtle text-text-secondary";
const PRIMARY_BTN =
  "flex h-14 w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent)] text-base font-semibold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.99] disabled:opacity-60";
const BACK_LINK =
  "glass flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-accent transition-opacity hover:opacity-80";
const BOTTOM_NAV_PADDING =
  "pb-[calc(4rem+max(1.5rem,env(safe-area-inset-bottom))+1rem)]";

/** URL 의 date 파라미터가 유효한 YYYY-MM-DD 면 그 값을, 아니면 오늘 날짜를 반환 */
function initialGameDate(dateParam: string | null): string {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam;
  return formatDate(new Date());
}

/** URL 의 stadium 파라미터가 유효한 구장 코드면 그 값을, 아니면 null 을 반환 */
function initialStadium(stadiumParam: string | null): StadiumCode | null {
  if (stadiumParam && STADIUM_LIST.some((s) => s.code === stadiumParam)) {
    return stadiumParam as StadiumCode;
  }
  return null;
}

/**
 * 직관 기록 작성 (/record/new)
 * 한 화면 스크롤 폼 — records 테이블에 INSERT 후 /card/[id]로 이동
 *
 * 달력 등에서 ?date=YYYY-MM-DD&stadium=<code> 로 진입하면 날짜·구장을 prefill 한다.
 * (상대팀/홈원정은 prefill 하지 않고 날짜+구장 기반 자동매칭에 맡긴다.)
 */
function NewRecordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [myTeamCode, setMyTeamCode] = useState<TeamCode | null>(null);
  const [gameDate, setGameDate] = useState(() =>
    initialGameDate(searchParams.get("date"))
  );
  const [stadium, setStadium] = useState<StadiumCode | null>(() =>
    initialStadium(searchParams.get("stadium"))
  );
  const [opponentTeam, setOpponentTeam] = useState<TeamCode | "">("");
  const [myScore, setMyScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [comment, setComment] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFetching, setAutoFetching] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 선택한 사진의 미리보기 URL (파일 목록이 바뀔 때만 재생성)
  const previewUrls = useMemo(
    () => photoFiles.map((file) => URL.createObjectURL(file)),
    [photoFiles]
  );

  // 미리보기 URL 정리 (메모리 누수 방지)
  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  // 마운트 시 로그인 확인 + 내 팀 가져오기
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

  // 날짜+구장이 정해지면 /api/kbo 로 경기 결과 자동 조회 → 상대팀/스코어 자동 채움
  useEffect(() => {
    if (!myTeamCode || !stadium || !gameDate) return;

    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setAutoFetching(true);
      setAutoFilled(false);
      try {
        const res = await fetch(`/api/kbo?date=${gameDate}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;

        const games = (await res.json()) as KBOGameResult[];
        if (!active) return;

        // 선택 구장 + 내 팀이 출전한 경기 매칭
        const match = games.find(
          (g) =>
            g.stadium === stadium &&
            (g.homeTeam === myTeamCode || g.awayTeam === myTeamCode)
        );
        if (!match) return;

        const home = match.homeTeam === myTeamCode;
        const mine = home ? match.homeScore : match.awayScore;
        const opp = home ? match.awayScore : match.homeScore;

        setOpponentTeam(home ? match.awayTeam : match.homeTeam);
        setIsHome(home);
        setMyScore(mine !== null ? String(mine) : "");
        setOpponentScore(opp !== null ? String(opp) : "");
        setAutoFilled(true);
      } catch {
        // 자동 채우기 실패는 수동 입력으로 대체 가능하므로 조용히 무시
      } finally {
        if (active) setAutoFetching(false);
      }
    };

    run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [gameDate, stadium, myTeamCode]);

  const myTeam = myTeamCode ? getTeam(myTeamCode) : null;
  // 상대팀 선택 목록 (내 팀 제외)
  const opponentList = TEAM_LIST.filter((team) => team.code !== myTeamCode);

  // 파일 선택 → 검증(타입/용량) 후 최대 5장까지 누적
  const handleSelectFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = ""; // 같은 파일 재선택 허용
    if (selected.length === 0) return;

    const valid: File[] = [];
    let rejected = false;
    for (const file of selected) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        setError("JPG, PNG, WebP 이미지만 올릴 수 있어요.");
        rejected = true;
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setError("사진은 한 장당 5MB 이하만 가능해요.");
        rejected = true;
        continue;
      }
      valid.push(file);
    }
    if (!rejected) setError(null);

    setPhotoFiles((prev) => [...prev, ...valid].slice(0, MAX_PHOTOS));
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

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

    // 사진 업로드 — record-photos/{userId}/{timestamp}_{filename}
    const photoUrls: string[] = [];
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      // 파일명 정규화 (한글/공백/특수문자 → _), 같은 ms 충돌 방지로 인덱스 포함
      const safeName = file.name.normalize("NFC").replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${Date.now()}_${i}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("record-photos")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setError("사진 업로드에 실패했어요. 잠시 후 다시 시도해주세요.");
        setSaving(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("record-photos").getPublicUrl(path);
      photoUrls.push(publicUrl);
    }

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
        photos: photoUrls,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      setSaving(false);
      return;
    }

    // 저장 성공 → 기록 상세로 이동 (카드 만들기는 상세 화면에서)
    router.push(`/record/${inserted.id}`);
  };

  return (
    <>
    <main className={`page-gradient min-h-full ${BOTTOM_NAV_PADDING}`}>
      <div className="mx-auto w-full max-w-md px-5 pt-8">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/home" className={BACK_LINK} aria-label="뒤로가기">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">직관 기록하기</h1>
        </header>

        <div className="space-y-3">
          <section className={SECTION_CLASS}>
            <label htmlFor="game-date" className={LABEL}>
              경기 날짜
            </label>
            <input
              id="game-date"
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={`${LABEL} mb-3`}>구장 선택</h2>
            <div className="grid grid-cols-2 gap-2">
              {STADIUM_LIST.map((item) => {
                const selected = stadium === item.code;

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setStadium(item.code)}
                    className={cn(
                      "rounded-[var(--radius-md)] border-2 px-3 py-3 text-left transition-all active:scale-[0.98]",
                      selected ? CHIP_SELECTED : CHIP_DEFAULT
                    )}
                    aria-pressed={selected}
                  >
                    <p className="text-sm font-semibold leading-snug text-text-primary">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {item.city}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={SECTION_CLASS}>
            <h2 className={`${LABEL} mb-3`}>경기 정보</h2>

            {autoFetching ? (
              <p className="mb-4 rounded-[var(--radius-md)] bg-surface-subtle px-3 py-2 text-xs font-medium text-text-secondary">
                경기 정보 불러오는 중...
              </p>
            ) : autoFilled ? (
              <p className="mb-4 rounded-[var(--radius-md)] bg-accent-bg px-3 py-2 text-xs font-medium text-accent">
                경기 정보를 자동으로 가져왔습니다 ✅ (수정할 수 있어요)
              </p>
            ) : null}

            <div className="space-y-4">
              <div>
                <p className={LABEL_SM}>내 팀</p>
                <div className="flex h-12 items-center gap-3 rounded-[var(--radius-md)] bg-accent-bg px-4 text-base font-semibold text-accent">
                  {myTeam ? <TeamMascot team={myTeam} size="md" /> : null}
                  {myTeam?.name ?? "..."}
                </div>
              </div>

              <div>
                <label htmlFor="opponent-team" className={LABEL_SM}>
                  상대팀
                </label>
                <select
                  id="opponent-team"
                  value={opponentTeam}
                  onChange={(e) =>
                    setOpponentTeam(e.target.value as TeamCode | "")
                  }
                  className={INPUT_CLASS}
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
                  <label htmlFor="my-score" className={LABEL_SM}>
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
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="opponent-score" className={LABEL_SM}>
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
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div>
                <p className={LABEL_SM}>홈 / 원정</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHome(true)}
                    className={cn(
                      "h-11 rounded-[var(--radius-md)] border-2 text-sm font-semibold transition-all",
                      isHome ? TOGGLE_SELECTED : TOGGLE_DEFAULT
                    )}
                    aria-pressed={isHome}
                  >
                    홈
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHome(false)}
                    className={cn(
                      "h-11 rounded-[var(--radius-md)] border-2 text-sm font-semibold transition-all",
                      !isHome ? TOGGLE_SELECTED : TOGGLE_DEFAULT
                    )}
                    aria-pressed={!isHome}
                  >
                    원정
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={SECTION_CLASS}>
            <label htmlFor="comment" className={LABEL}>
              한줄 코멘트
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="오늘 경기 한줄평을 남겨보세요"
              rows={3}
              className={TEXTAREA_CLASS}
            />
          </section>

          <section className={SECTION_CLASS}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">사진</h2>
              <span className="text-xs text-text-tertiary">
                {photoFiles.length}/{MAX_PHOTOS}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((url, i) => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-surface-subtle"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`직관 사진 ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                    aria-label={`사진 ${i + 1} 삭제`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {photoFiles.length < MAX_PHOTOS ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--glass-border)] text-text-tertiary transition-colors hover:border-accent hover:text-accent"
                >
                  <ImagePlus size={22} />
                  <span className="text-xs font-medium">추가</span>
                </button>
              ) : null}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleSelectFiles}
              className="hidden"
            />
          </section>

          {error ? (
            <p className="text-center text-sm font-medium text-rose-500">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !myTeamCode}
            className={PRIMARY_BTN}
          >
            {saving ? "저장 중..." : "기록 저장하기"}
          </button>
        </div>
      </div>
    </main>
    <BottomNav variant="glass" />
    </>
  );
}

/**
 * useSearchParams 는 Suspense 경계가 필요(Next App Router)하므로 폼을 감싼다.
 */
export default function NewRecordPage() {
  return (
    <Suspense
      fallback={
        <main className="page-gradient flex flex-1 items-center justify-center">
          <p className="text-sm text-text-tertiary">불러오는 중...</p>
        </main>
      }
    >
      <NewRecordForm />
    </Suspense>
  );
}
