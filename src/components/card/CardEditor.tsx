"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Share2, X } from "lucide-react";
import StoryCard, {
  BG_PRESETS,
  type CardData,
  type CardMode,
} from "@/components/card/StoryCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 정규화된 이미지 결과 (blob URL + 화면 표시 기준 크기) */
interface NormalizedImage {
  url: string;
  width?: number;
  height?: number;
}

/**
 * 업로드 사진의 EXIF 회전을 픽셀에 구워 정규화한다.
 *
 * html2canvas-pro 는 <img> 의 EXIF 회전(imageOrientation)을 추출 결과에
 * 반영하지 못해, 화면엔 바로 보여도 저장된 PNG 에서 사진이 다시 누울 수 있다.
 * 따라서 업로드 시점에 createImageBitmap({imageOrientation:"from-image"})로
 * 올바른 방향의 비트맵을 만든 뒤 canvas 에 그려 회전을 적용한 새 이미지를 만든다.
 * (미지원 환경에서는 원본 object URL 로 폴백)
 */
async function normalizeImage(file: File): Promise<NormalizedImage> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    } as ImageBitmapOptions);

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return { url: URL.createObjectURL(file) };
    }
    ctx.drawImage(bitmap, 0, 0);
    const { width, height } = bitmap;
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    return blob
      ? { url: URL.createObjectURL(blob), width, height }
      : { url: URL.createObjectURL(file), width, height };
  } catch {
    return { url: URL.createObjectURL(file) };
  }
}

/** 기록에 저장된 원격 사진도 동일한 EXIF 정규화 적용 */
async function normalizeImageFromUrl(remoteUrl: string): Promise<NormalizedImage> {
  try {
    const response = await fetch(remoteUrl, { mode: "cors" });
    if (!response.ok) throw new Error("fetch failed");
    const blob = await response.blob();
    const file = new File([blob], "record-photo.jpg", {
      type: blob.type || "image/jpeg",
    });
    return normalizeImage(file);
  } catch {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () =>
        resolve({
          url: remoteUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      img.onerror = () => resolve({ url: remoteUrl });
      img.src = remoteUrl;
    });
  }
}

function revokeIfBlob(url?: string) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

// 로그인/기록 없이 단독 렌더링될 때만 쓰는 폴백 더미 데이터
const MOCK_CARD_DATA: CardData = {
  homeTeam: "삼성",
  awayTeam: "SSG",
  homeScore: 10,
  awayScore: 8,
  date: "2026.06.14",
  stadium: "대구",
  result: "WIN",
  comment: "오늘도 직관 성공!",
};

/** 가로/세로 비율로 추천 모드 결정 */
function recommendMode(width: number, height: number): CardMode {
  const ratio = width / height;
  return ratio < 1 ? "fill" : "matte";
}

interface CardEditorProps {
  /** 실제 직관 기록에서 변환한 카드 데이터 (없으면 더미로 폴백) */
  data?: CardData;
  /** 기록에 저장된 사진 URL 목록 (2장 이상일 때 썸네일 선택 UI 표시) */
  recordPhotos?: string[];
}

/**
 * StoryCard 에디터 (2단계)
 * 실제 기록(data)을 받아 모드 / 배경색 / 데코 / 사진 업로드로 미리보기 조정.
 * 기록 사진 중 선택하거나, 기기에서 새 사진을 올릴 수 있다.
 */
export default function CardEditor({
  data = MOCK_CARD_DATA,
  recordPhotos = [],
}: CardEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<CardMode>("fill");
  const [bgColor, setBgColor] = useState<string>(BG_PRESETS[0].color);
  const [showDeco, setShowDeco] = useState(false);
  /** 기기에서 새로 올린 사진 (우선 적용) */
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | undefined>(
    undefined
  );
  /** 기록 사진 선택 → normalizeImageFromUrl 결과 blob */
  const [recordPhotoBlobUrl, setRecordPhotoBlobUrl] = useState<
    string | undefined
  >(undefined);
  /** 썸네일 강조용 — 선택된 기록 사진 원본 URL */
  const [selectedRemoteUrl, setSelectedRemoteUrl] = useState<
    string | undefined
  >(data.photoUrl);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoUrl = customPhotoUrl ?? recordPhotoBlobUrl;
  const showRecordThumbnails = recordPhotos.length >= 2;

  // 기록 첫 사진(또는 data.photoUrl 변경) → 정규화 후 카드에 반영
  useEffect(() => {
    let cancelled = false;
    const remoteUrl = data.photoUrl;

    if (!remoteUrl) {
      setRecordPhotoBlobUrl(undefined);
      setSelectedRemoteUrl(undefined);
      return;
    }

    setSelectedRemoteUrl(remoteUrl);

    normalizeImageFromUrl(remoteUrl).then(({ url, width, height }) => {
      if (cancelled) {
        revokeIfBlob(url);
        return;
      }
      setRecordPhotoBlobUrl((prev) => {
        revokeIfBlob(prev);
        return url;
      });
      if (width && height) setMode(recommendMode(width, height));
    });

    return () => {
      cancelled = true;
    };
  }, [data.photoUrl]);

  useEffect(() => {
    return () => {
      revokeIfBlob(customPhotoUrl);
      revokeIfBlob(recordPhotoBlobUrl);
    };
  }, [customPhotoUrl, recordPhotoBlobUrl]);

  const cardData: CardData = {
    ...data,
    photoUrl,
  };

  const fileName = `직관생활_${data.date.replace(/\./g, "-")}.png`;

  const handleSelectBgColor = (color: string) => {
    setBgColor(color);
    setMode("matte");
  };

  const handleSelectRecordPhoto = async (remoteUrl: string) => {
    setSelectedRemoteUrl(remoteUrl);
    revokeIfBlob(customPhotoUrl);
    setCustomPhotoUrl(undefined);

    const { url, width, height } = await normalizeImageFromUrl(remoteUrl);
    setRecordPhotoBlobUrl((prev) => {
      revokeIfBlob(prev);
      return url;
    });
    if (width && height) setMode(recommendMode(width, height));
  };

  const handleSelectPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const { url, width, height } = await normalizeImage(file);

    revokeIfBlob(customPhotoUrl);
    setCustomPhotoUrl(url);

    if (width && height) setMode(recommendMode(width, height));
  };

  const handleRemovePhoto = () => {
    revokeIfBlob(customPhotoUrl);
    revokeIfBlob(recordPhotoBlobUrl);
    setCustomPhotoUrl(undefined);
    setRecordPhotoBlobUrl(undefined);
    setSelectedRemoteUrl(undefined);
  };

  /**
   * 카드 DOM을 캔버스로 캡처. html2canvas-pro 는 Tailwind v4 의 oklch 등
   * 최신 컬러 함수를 지원하는 드롭인 포크. useCORS 로 Supabase Storage 원격
   * 사진(crossOrigin)도 추출 가능하게 한다.
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
    <div className="flex flex-col gap-6">
      {/* 미리보기 — 이 영역을 html2canvas로 캡처 */}
      <div className="flex justify-center">
        <div ref={cardRef} className="w-full max-w-[360px]">
          <StoryCard
            data={cardData}
            mode={mode}
            bgColor={bgColor}
            showDeco={showDeco}
          />
        </div>
      </div>

      {/* 컨트롤 */}
      <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
        {/* 사진 */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">사진</h3>

          {showRecordThumbnails ? (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {recordPhotos.map((url, index) => {
                const selected =
                  !customPhotoUrl && selectedRemoteUrl === url;
                return (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => handleSelectRecordPhoto(url)}
                    className={cn(
                      "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                      selected
                        ? "border-[#1A56DB] ring-2 ring-[#1A56DB]/20"
                        : "border-slate-100"
                    )}
                    aria-label={`기록 사진 ${index + 1} 선택`}
                    aria-pressed={selected}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#B8D4F8] bg-[#EBF2FD] text-sm font-semibold text-[#1A56DB] transition-colors hover:border-[#1A56DB] hover:bg-[#dfeafb]"
            >
              <ImagePlus size={18} />
              사진 선택
            </button>
            {photoUrl ? (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="flex h-11 items-center justify-center gap-1 rounded-xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-semibold text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <X size={16} />
                제거
              </button>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleSelectPhoto}
            className="hidden"
          />
          {photoUrl ? (
            <p className="mt-2 text-xs text-slate-400">
              사진 비율에 맞춰 모드를 추천했어요. 필요하면 직접 바꿀 수 있어요.
            </p>
          ) : null}
        </section>

        {/* 모드 */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">모드</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("fill")}
              className={cn(
                "h-11 rounded-xl border-2 text-sm font-semibold transition-all",
                mode === "fill"
                  ? "border-[#1A56DB] bg-[#EBF2FD] text-[#1A56DB]"
                  : "border-slate-100 bg-slate-50 text-slate-500"
              )}
            >
              채우기
            </button>
            <button
              type="button"
              onClick={() => setMode("matte")}
              className={cn(
                "h-11 rounded-xl border-2 text-sm font-semibold transition-all",
                mode === "matte"
                  ? "border-[#1A56DB] bg-[#EBF2FD] text-[#1A56DB]"
                  : "border-slate-100 bg-slate-50 text-slate-500"
              )}
            >
              여백
            </button>
          </div>
        </section>

        {/* 배경색 */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">배경색</h3>
          <div className="flex flex-wrap gap-3">
            {BG_PRESETS.map((preset) => {
              const selected = bgColor === preset.color;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleSelectBgColor(preset.color)}
                  className={cn(
                    "h-10 w-10 rounded-full border-2 transition-all",
                    selected
                      ? "border-[#1A56DB] ring-2 ring-[#1A56DB]/20"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: preset.color }}
                  aria-label={preset.label}
                  title={preset.label}
                />
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            배경색 선택 시 여백 모드로 전환됩니다
          </p>
        </section>

        {/* 데코 */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">데코</h3>
          <button
            type="button"
            onClick={() => setShowDeco((prev) => !prev)}
            className={cn(
              "h-11 w-full rounded-xl border-2 text-sm font-semibold transition-all",
              showDeco
                ? "border-[#1A56DB] bg-[#EBF2FD] text-[#1A56DB]"
                : "border-slate-100 bg-slate-50 text-slate-500"
            )}
          >
            {showDeco ? "데코 끄기" : "데코 켜기"}
          </button>
        </section>
      </div>

      {/* 저장/공유 */}
      {error ? (
        <p className="-mb-2 text-center text-sm font-medium text-rose-500">
          {error}
        </p>
      ) : null}
      <div className="space-y-3">
        <Button onClick={handleShare} disabled={working}>
          <Share2 size={18} className="mr-2" />
          {working ? "처리 중..." : "공유"}
        </Button>
        <Button variant="secondary" onClick={handleDownload} disabled={working}>
          <Download size={18} className="mr-2" />
          이미지 저장하기
        </Button>
      </div>
    </div>
  );
}
