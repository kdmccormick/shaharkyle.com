"""Turn the phone photo of the pencil flyer into web assets.

Deliberately conservative. The drawing is left exactly as photographed - no
deskewing, no perspective correction - because any wobble in it is part of how
it reads as a real sheet of paper someone drew on. All this does is even out
what is left of the lighting, crop to the drawing, and drop the paper so the
graphite can sit on the page's own stock.

No vectorising and no posterising: every smudge and paper fibre survives, which
is the whole point.

Run it to regenerate the flyer assets:

    uv run --with pillow --with numpy python tools/process_flyer.py

Outputs into public/images/
  flyer-ink-900.webp   phone-sized
  flyer-ink-1500.webp  retina
  flyer-ink.png        fallback for anything without WebP alpha
"""
from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "..", "PXL_20260819_125700004-EDIT.jpg")
OUT = os.path.join(HERE, "..", "public", "images")

BG_BLUR = 90          # radius used to model the uneven lighting
PAPER_PCT = 80        # luminance percentile treated as bare paper
PAPER_KNEE = 0.86     # anything lighter than this is called bare paper
INK_LEVEL = 0.32      # relative luminance treated as fully opaque ink
NOISE_FLOOR = 0.10    # alpha below this is bare paper, not graphite
MARGIN = 90           # px of paper left around the drawing
WIDTH = 1500          # widest output


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    g = np.asarray(src.convert("L"), dtype=np.float32)
    H, W = g.shape
    print(f"source {W}x{H}")

    # ── 1. even out what is left of the lighting ─────────────────────────
    # Model the illumination as a heavily blurred copy of the page and divide
    # it out. Cheap flat-field correction: evens up the last of the falloff
    # without touching the fine graphite texture.
    bg = np.asarray(
        Image.fromarray(g.astype(np.uint8)).filter(ImageFilter.GaussianBlur(BG_BLUR)),
        dtype=np.float32,
    )
    flat = g / np.maximum(bg, 1.0)           # ~1.0 on bare paper, <1 on the ink
    norm = np.clip(flat / np.percentile(flat, PAPER_PCT), 0.0, 1.4)

    # ── 2. crop to the drawing ───────────────────────────────────────────
    # Group the inked lines into runs and keep the longest, so a stray mark or
    # a scanner artefact out at the edge cannot stretch the box.
    inked = norm < 0.60

    def span(counts, gap=120):
        hits = np.nonzero(counts > 20)[0]
        runs, start, prev = [], hits[0], hits[0]
        for h in hits[1:]:
            if h - prev > gap:
                runs.append((start, prev))
                start = h
            prev = h
        runs.append((start, prev))
        return max(runs, key=lambda r: r[1] - r[0])

    cx0, cx1 = span(inked.sum(axis=0))
    cy0, cy1 = span(inked.sum(axis=1))
    x0, y0 = max(0, cx0 - MARGIN), max(0, cy0 - MARGIN)
    x1, y1 = min(W - 1, cx1 + MARGIN), min(H - 1, cy1 + MARGIN)
    print(f"content box x {x0}..{x1}  y {y0}..{y1}")
    norm = norm[y0 : y1 + 1, x0 : x1 + 1]

    # ── 3. ink on transparency ───────────────────────────────────────────
    # Luminance becomes alpha, so a light pencil stroke stays a light pencil
    # stroke - it just sits on the page's paper instead of the photo's. The
    # knee clamps the shadow haze to nothing while leaving graphite alone.
    a = np.clip((PAPER_KNEE - norm) / (PAPER_KNEE - INK_LEVEL), 0.0, 1.0) ** 1.05
    # Bare paper is forced fully clear. The page supplies its own grain, and
    # leaving the photo's fibres in as 2%-alpha speckle triples the file size
    # for texture nobody can see.
    a[a < NOISE_FLOOR] = 0.0
    print(f"clear pixels: {(a == 0).mean():.0%}")

    ink = np.zeros((*a.shape, 4), dtype=np.uint8)
    ink[..., 0], ink[..., 1], ink[..., 2] = 26, 22, 20   # graphite, faintly warm
    ink[..., 3] = (a * 255).astype(np.uint8)
    full = Image.fromarray(ink, "RGBA")

    os.makedirs(OUT, exist_ok=True)
    for w in (900, WIDTH):
        im = full.resize((w, round(w / full.width * full.height)), Image.LANCZOS)
        im.save(os.path.join(OUT, f"flyer-ink-{w}.webp"), "WEBP", quality=84, method=6)
        print(f"flyer-ink-{w}.webp {im.size}")
        if w == WIDTH:
            im.save(os.path.join(OUT, "flyer-ink.png"))
            print(f"flyer-ink.png {im.size}   <- use these numbers for width/height")


if __name__ == "__main__":
    main()
