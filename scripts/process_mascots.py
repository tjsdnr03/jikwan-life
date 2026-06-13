#!/usr/bin/env python3
"""
public/mascots/ 의 모든 PNG를 일괄 처리한다.

  1. rembg 로 배경 제거
  2. 투명이 아닌(알파>0) 영역의 bounding box 로 crop (trim)
  3. 360x360 투명 캔버스 중앙에, 캐릭터가 캔버스의 80%(=288px)를 차지하도록
     비율 유지 리사이즈 후 배치
  4. 원본 덮어쓰기
  5. 처리 전/후 크기 출력
"""

import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

CANVAS = 360          # 최종 캔버스 한 변
CHAR_RATIO = 0.80     # 캐릭터가 차지할 비율
CHAR_MAX = int(CANVAS * CHAR_RATIO)  # 288px

MASCOTS_DIR = Path(__file__).resolve().parent.parent / "public" / "mascots"


def process(path: Path, session) -> None:
    original = Image.open(path)
    orig_size = original.size  # (w, h)

    # 1. 배경 제거 (RGBA)
    cut = remove(original.convert("RGBA"), session=session).convert("RGBA")

    # 2. 알파 채널 기준으로 trim
    alpha = cut.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        print(f"  ⚠️  {path.name}: 배경 제거 후 남은 픽셀이 없어 건너뜀")
        return
    trimmed = cut.crop(bbox)
    tw, th = trimmed.size

    # 3. 캐릭터를 긴 변 기준 288px 에 맞춰 비율 유지 리사이즈
    scale = CHAR_MAX / max(tw, th)
    new_w = max(1, round(tw * scale))
    new_h = max(1, round(th * scale))
    resized = trimmed.resize((new_w, new_h), Image.LANCZOS)

    # 360x360 투명 캔버스 중앙에 배치
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    offset = ((CANVAS - new_w) // 2, (CANVAS - new_h) // 2)
    canvas.paste(resized, offset, resized)

    # 4. 원본 덮어쓰기
    canvas.save(path, "PNG")

    # 5. 크기 출력
    print(
        f"  {path.name}: 원본 {orig_size[0]}x{orig_size[1]}"
        f" → trim {tw}x{th}"
        f" → 캐릭터 {new_w}x{new_h}"
        f" → 캔버스 {CANVAS}x{CANVAS}"
    )


def main() -> int:
    if not MASCOTS_DIR.is_dir():
        print(f"폴더를 찾을 수 없습니다: {MASCOTS_DIR}")
        return 1

    pngs = sorted(MASCOTS_DIR.glob("*.png"))
    if not pngs:
        print(f"PNG 파일이 없습니다: {MASCOTS_DIR}")
        return 1

    print(f"대상 {len(pngs)}개 — {MASCOTS_DIR}")
    print("배경 제거 모델 로딩 중... (최초 실행 시 모델 다운로드)")
    session = new_session("u2net")

    for path in pngs:
        process(path, session)

    print("완료 ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
