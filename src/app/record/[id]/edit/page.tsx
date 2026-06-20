"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { STADIUM_LIST } from "@/lib/stadiums";
import { TEAM_LIST, getTeam } from "@/lib/teams";
import { cn, getRecordPhotoStoragePath, getResult } from "@/lib/utils";
import type { Record as GameRecord, StadiumCode, TeamCode } from "@/types";

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
      <main className="flex flex-1 items-center justify-center bg-[#EBF2FD]">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </main>
    );
  }

  if (error && !myTeamCode) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#EBF2FD] px-6">
        <p className="text-sm text-slate-500">{error}</p>
        <Link href="/record" className="mt-4 text-sm font-medium text-[#1A56DB]">
          목록으로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-[#EBF2FD] pb-10">
      <div className="mx-auto w-full max-w-md px-6 pt-6">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href={`/record/${id}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1A56DB] shadow-sm"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">기록 수정</h1>
        </header>

        <div className="space-y-6">
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
                    <p className="mt-0.5 text-xs text-slate-500">{item.city}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">
              경기 정보
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">내 팀</p>
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

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">사진</h2>
              <span className="text-xs text-slate-400">
                {totalPhotos}/{MAX_PHOTOS}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {existingPhotos.map((url) => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"
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
                  className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"
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
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#1A56DB] hover:text-[#1A56DB]"
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

          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={saving || !myTeamCode}
          >
            {saving ? "저장 중..." : "수정 완료"}
          </Button>
        </div>
      </div>
    </main>
  );
}
