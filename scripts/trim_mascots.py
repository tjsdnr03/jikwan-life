#!/usr/bin/env python3
"""public/mascots PNG trim + 400x400 center resize (transparent padding)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

MASCOTS_DIR = Path(__file__).resolve().parent.parent / "public" / "mascots"
OUTPUT_SIZE = 400
# 흰색 배경도 여백으로 간주 (RGB 근접값)
WHITE_THRESHOLD = 245


def trim_image(img: Image.Image) -> Image.Image:
    """투명/흰색 여백 제거 후 캐릭터 영역만 남김."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()

    def is_background(r: int, g: int, b: int, a: int) -> bool:
        if a < 10:
            return True
        return r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD

    min_x, min_y = w, h
    max_x, max_y = 0, 0
    found = False

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if not is_background(r, g, b, a):
                found = True
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if not found:
        return rgba

    return rgba.crop((min_x, min_y, max_x + 1, max_y + 1))


def resize_centered(img: Image.Image, size: int = OUTPUT_SIZE) -> Image.Image:
    """캐릭터 비율 유지하며 size x size 캔버스 중앙 배치."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    w, h = img.size
    scale = min(size / w, size / h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    offset_x = (size - new_w) // 2
    offset_y = (size - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)
    return canvas


def process_file(path: Path) -> None:
    with Image.open(path) as src:
        trimmed = trim_image(src)
        result = resize_centered(trimmed)
        result.save(path, format="PNG", optimize=True)
    print(f"OK  {path.name}: {src.size} -> trim {trimmed.size} -> {OUTPUT_SIZE}x{OUTPUT_SIZE}")


def main() -> None:
    files = sorted(MASCOTS_DIR.glob("*.png"))
    if not files:
        raise SystemExit(f"No PNG files in {MASCOTS_DIR}")

    print(f"Processing {len(files)} files in {MASCOTS_DIR}")
    for path in files:
        process_file(path)
    print("Done.")


if __name__ == "__main__":
    main()
