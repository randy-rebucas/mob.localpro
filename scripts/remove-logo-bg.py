#!/usr/bin/env python3
"""
Remove outer white/light background from localpro-logo.png by flood-filling
from image edges through light neutral pixels only (preserves interior whites
inside the artwork as long as they are not connected to the border).
"""
from __future__ import annotations

import shutil
import sys
from collections import deque
from pathlib import Path

from PIL import Image


def is_bg_like(r: int, g: int, b: int) -> bool:
    lum = (r + g + b) / 3.0
    chroma = max(r, g, b) - min(r, g, b)
    return lum >= 205 and chroma <= 42


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    path = root / "assets" / "images" / "localpro-logo.png"
    if not path.exists():
        print("Missing", path, file=sys.stderr)
        return 1

    backup = path.with_name("localpro-logo-backup.png")
    shutil.copy2(path, backup)

    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()

    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def push(y: int, x: int) -> None:
        if not (0 <= y < h and 0 <= x < w) or seen[y][x]:
            return
        r, g, b, _a = px[x, y]  # PIL uses (x,y)
        if not is_bg_like(r, g, b):
            return
        seen[y][x] = True
        q.append((y, x))

    for x in range(w):
        push(0, x)
        push(h - 1, x)
    for y in range(h):
        push(y, 0)
        push(y, w - 1)

    while q:
        y, x = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny][nx]:
                r, g, b, _a = px[nx, ny]
                if is_bg_like(r, g, b):
                    seen[ny][nx] = True
                    q.append((ny, nx))

    # Clear flood region
    for y in range(h):
        for x in range(w):
            if seen[y][x]:
                pr, pg, pb, _ = px[x, y]
                px[x, y] = (pr, pg, pb, 0)

    # Soften one-pixel halos next to transparency (very light fringe only)
    neighbors = ((-1, 0), (1, 0), (0, -1), (0, 1))
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or not is_bg_like(r, g, b):
                continue
            touches_transparent = False
            for dy, dx in neighbors:
                nx, ny = x + dx, y + dy
                if 0 <= ny < h and 0 <= nx < w:
                    if px[nx, ny][3] == 0:
                        touches_transparent = True
                        break
            if touches_transparent and (r + g + b) / 3 >= 198:
                px[x, y] = (r, g, b, int(a * 0.35))

    im.save(path, optimize=True)
    print(f"Wrote {path} (backup: {backup})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
