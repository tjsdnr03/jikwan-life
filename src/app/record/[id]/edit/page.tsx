"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { createClient } from "@/lib/supabase";
import { STADIUM_LIST } from "@/lib/stadiums";
import { TEAM_LIST, getTeam } from "@/lib/teams";
import { cn, getRecordPhotoStoragePath, getResult } from "@/lib/utils";
import type { Record as GameRecord, StadiumCode, TeamCode } from "@/types";

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
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

/**
 * 직관 기록 수정 (/record/[id]/edit)
 * 기존 데이터 로드 → 폼 수정 → UPDATE
 */
export default function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [myTeamCode, setMyTeamCode] = useState<TeamCode | null>(null);
  const [gameDate, setGameDate] = useState("");
  const [stadium, setStadium] = useState<StadiumCode | null>(null);
  const [opponentTeam, setOpponentTeam] = useState<TeamCode | "">("");
  const [myScore, setMyScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [comment, setComment] = useState("");
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const newPreviewUrls = useMemo(
    () => newPhotoFiles.map((file) => URL.createObjectURL(file)),
    [newPhotoFiles]
  );

  useEffect(() => {
    return () => newPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [newPreviewUrls]);

  const totalPhotos = existingPhotos.length + newPhotoFiles.length;

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

      const { data: record, error: fetchError } = await supabase
        .from("records")
        .select("*")
        .eq("id", id)
        .maybeSingle<GameRecord>();

      if (fetchError || !record) {
        setError("기록을 찾을 수 없어요.");
        setLoading(false);
        return;
      }

      if (record.user_id !== user.id) {
        setError("내 기록만 수정할 수 있어요.");
        setLoading(false);
        return;
      }

      setMyTeamCode(record.my_team);
      setGameDate(record.game_date);
      setStadium(record.stadium as StadiumCode);
      setOpponentTeam(record.opponent_team);
      setMyScore(record.my_score !== null ? String(record.my_score) : "");
      setOpponentScore(
        record.opponent_score !== null ? String(record.opponent_score) : ""
      );
      setIsHome(record.is_home);
      setComment(record.comment ?? "");
      setExistingPhotos(record.photos ?? []);
      setLoading(false);
    }

    load();
  }, [id, router]);

  const myTeam = myTeamCode ? getTeam(myTeamCode) : null;
  const opponentList = TEAM_LIST.filter((team) => team.code !== myTeamCode);

  const handleSelectFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
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

    setNewPhotoFiles((prev) =>
      [...prev, ...valid].slice(0, MAX_PHOTOS - existingPhotos.length)
    );
  };

  const handleRemoveExistingPhoto = (url: string) => {
    setExistingPhotos((prev) => prev.filter((p) => p !== url));
    setRemovedPhotos((prev) => [...prev, url]);
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
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

    // 삭제된 기존 사진 Storage에서 제거
    const removePaths = removedPhotos
      .map(getRecordPhotoStoragePath)
      .filter((p): p is string => p !== null);

    if (removePaths.length > 0) {
      await supabase.storage.from("record-photos").remove(removePaths);
    }

    // 새 사진 업로드
    const newPhotoUrls: string[] = [];
    for (let i = 0; i < newPhotoFiles.length; i++) {
      const file = newPhotoFiles[i];
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
      newPhotoUrls.push(publicUrl);
    }

    const photoUrls = [...existingPhotos, ...newPhotoUrls];

    const { error: updateError } = await supabase
      .from("records")
      .update({
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
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      setError("수정에 실패했어요. 잠시 후 다시 시도해주세요.");
      setSaving(false);
      return;
    }

    router.replace(`/record/${id}`);
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

  if (error && !myTeamCode) {
    return (
      <>
        <main
          className={`page-gradient flex flex-1 flex-col items-center justify-center px-5 ${BOTTOM_NAV_PADDING}`}
        >
          <p className="text-sm text-text-secondary">{error}</p>
          <Link href="/record" className="mt-4 text-sm font-medium text-accent">
            목록으로 돌아가기
          </Link>
        </main>
        <BottomNav variant="glass" />
      </>
    );
  }

  return (
    <>
    <main className={`page-gradient min-h-full ${BOTTOM_NAV_PADDING}`}>
      <div className="mx-auto w-full max-w-md px-5 pt-8">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href={`/record/${id}`}
            className={BACK_LINK}
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">기록 수정</h1>
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
            <div className="space-y-4">
              <div>
                <p className={LABEL_SM}>내 팀</p>
                <div className="flex h-12 items-center rounded-[var(--radius-md)] bg-accent-bg px-4 text-base font-semibold text-accent">
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
                {totalPhotos}/{MAX_PHOTOS}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {existingPhotos.map((url) => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-surface-subtle"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="기존 직관 사진"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingPhoto(url)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                    aria-label="사진 삭제"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {newPreviewUrls.map((url, i) => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-surface-subtle"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`새 직관 사진 ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewPhoto(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                    aria-label={`새 사진 ${i + 1} 삭제`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {totalPhotos < MAX_PHOTOS ? (
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
            {saving ? "저장 중..." : "수정 완료"}
          </button>
        </div>
      </div>
    </main>
    <BottomNav variant="glass" />
    </>
  );
}
