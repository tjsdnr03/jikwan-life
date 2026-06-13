"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { TeamMascot } from "@/components/team/team-mascot";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { STADIUM_LIST } from "@/lib/stadiums";
import { TEAM_LIST, getTeam } from "@/lib/teams";
import { cn, formatDate, getResult } from "@/lib/utils";
import type { KBOGameResult, StadiumCode, TeamCode } from "@/types";

/** 사진 업로드 제약 */
const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              경기 정보
            </h2>

            {/* KBO 자동 조회 상태 */}
            {autoFetching ? (
              <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                경기 정보 불러오는 중...
              </p>
            ) : autoFilled ? (
              <p className="mb-4 rounded-xl bg-[#EBF2FD] px-3 py-2 text-xs font-medium text-[#1A56DB]">
                경기 정보를 자동으로 가져왔습니다 ✅ (수정할 수 있어요)
              </p>
            ) : null}

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  내 팀
                </p>
                <div className="flex h-12 items-center gap-3 rounded-xl bg-[#EBF2FD] px-4 text-base font-semibold text-[#1A56DB]">
                  {myTeam ? (
                    <TeamMascot team={myTeam} size="md" />
                  ) : null}
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

          {/* 사진 (최대 5장) */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">사진</h2>
              <span className="text-xs text-slate-400">
                {photoFiles.length}/{MAX_PHOTOS}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((url, i) => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"
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
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-[#1A56DB] hover:text-[#1A56DB]"
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
