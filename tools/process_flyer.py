"""Turn the phone photo of the pencil flyer into web assets.

Deliberately conservative. The drawing is left at the angle it was
photographed at - no deskewing, no perspective correction - because the tilt is
part of how it reads as a real sheet of paper someone drew on. All this does is
knock the table out from behind it, even out the desk lamp, crop to the
drawing, and drop the paper so the graphite can sit on the page's own stock.

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
SRC = os.path.join(HERE, "..", "PXL_20260817_030859046.jpg")
OUT = os.path.join(HERE, "..", "public", "images")

EDGE_INSET = 26       # px pulled back from each paper edge, to lose its shadow
BG_BLUR = 90          # radius used to model the uneven lighting
PAPER_PCT = 80        # luminance percentile treated as bare paper
PAPER_KNEE = 0.86     # anything lighter than this is called bare paper
INK_LEVEL = 0.32      # relative luminance treated as fully opaque ink
NOISE_FLOOR = 0.10    # alpha below this is bare paper, not graphite
MARGIN = 90           # px of paper left around the drawing
WIDTH = 1500          # widest output


def fit_edge(a: np.ndarray, thr: float, from_top: bool):
    """Fit a straight line to one edge of the sheet.

    The table is far darker than the paper, so walking in from the frame until
    the brightness crosses `thr` finds the edge. Fitted robustly, because a few
    columns land on a shadow or a fold."""
    xs, ys = [], []
    for x in range(0, a.shape[1], 12):
        idx = np.nonzero(a[:, x] > thr)[0]
        if idx.size:
            xs.append(x)
            ys.append(idx[0] if from_top else idx[-1])
    xs = np.asarray(xs, float)
    ys = np.asarray(ys, float)
    for _ in range(3):                       # refit without the outliers
        m, b = np.polyfit(xs, ys, 1)
        keep = np.abs(ys - (m * xs + b)) < max(8.0, 2.5 * (ys - (m * xs + b)).std())
        xs, ys = xs[keep], ys[keep]
    return np.polyfit(xs, ys, 1)


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    g = np.asarray(src.convert("L"), dtype=np.float32)
    H, W = g.shape
    print(f"source {W}x{H}")

    # ── 1. find the sheet, leave it where it lies ────────────────────────
    dark = np.percentile(g[:200, :], 50)
    light = np.percentile(g[H // 2 : H // 2 + 400, :], 50)
    thr = (dark + light) / 2
    mt, bt = fit_edge(g, thr, from_top=True)
    mb, bb = fit_edge(g, thr, from_top=False)
    print(f"top edge    y = {mt:.5f}x + {bt:.0f}")
    print(f"bottom edge y = {mb:.5f}x + {bb:.0f}")

    xx = np.arange(W)[None, :]
    yy = np.arange(H)[:, None]
    valid = (yy > (mt * xx + bt) + EDGE_INSET) & (yy < (mb * xx + bb) - EDGE_INSET)
    print(f"sheet is {valid.mean():.0%} of the frame")

    # ── 2. even out the lamp gradient ────────────────────────────────────
    # Model the illumination as a heavily blurred copy of the page and divide
    # it out. Cheap flat-field correction: kills the shadow across the corner
    # without touching the fine graphite texture. Off-sheet pixels are filled
    # with the page median first so the table cannot drag the model down.
    fill = np.where(valid, g, np.median(g[valid]))
    bg = np.asarray(
        Image.fromarray(fill.astype(np.uint8)).filter(ImageFilter.GaussianBlur(BG_BLUR)),
        dtype=np.float32,
    )
    flat = fill / np.maximum(bg, 1.0)        # ~1.0 on bare paper, <1 on the ink
    norm = np.clip(flat / np.percentile(flat[valid], PAPER_PCT), 0.0, 1.4)
    norm[~valid] = 1.0                       # off-sheet is "paper", i.e. nothing

    # ── 3. crop to the drawing ───────────────────────────────────────────
    # Taking the outermost inked line would catch the shadow along the sheet's
    # own edge, so group the inked lines into runs and keep the longest: the
    # drawing is one big block, an edge is a thin stripe beyond blank paper.
    inked = (norm < 0.60) & valid

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

    # ── 4. ink on transparency ───────────────────────────────────────────
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
