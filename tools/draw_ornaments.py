"""Draw the wood-grain ornaments the site is decorated with.

Modelled on the tattoo references in aesthetic_inspiration/ (DSC00*): grain
lines running roughly parallel down a limb, closing into tight concentric loops
wherever they meet a knot, with the line weight swinging from hairline to heavy
black band. Add the cracks that run across the grain and you have the whole
vocabulary.

How it is drawn
---------------
Grain lines are contours - level sets - of a scalar field:

    f(x, y) = x  +  sum over knots of  A · exp(-½ · elliptical distance²)

Away from the knots f is just `x`, so the contours are near-vertical lines: the
straight run of the grain. Each knot adds a smooth hill, and the contours of a
hill are *closed loops* around its summit - which is exactly what grain does
when it flows round a knot. Before evaluating, x and y are pushed through a
smooth warp, which is what stops the whole thing looking like a contour plot.

Line weight is not random per line. It is driven by a slow noise over the level
index, so heavy lines arrive in bands with fine ones between them, the way they
do in real timber.

Contours come from matplotlib, which is a build-time dependency only - nothing
it produces ships to the browser except path data.

Run it to regenerate public/images/orn-*.svg:

    uv run --with numpy --with matplotlib python tools/draw_ornaments.py

The seed is fixed, so re-running produces the same drawings. Change SEED for a
different set.
"""
from __future__ import annotations

import math
import os

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

SEED = 20270605          # the wedding date, because why not
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "images")

rng = np.random.default_rng(SEED)


# ── the hand ────────────────────────────────────────────────────────────────
def wobble(t, amp, octaves=3, rate=1.0):
    """A smooth meander over t in [0,1]. Low frequencies dominate, so the line
    wanders rather than vibrating."""
    t = np.asarray(t, dtype=float)
    out = np.zeros_like(t)
    for k in range(octaves):
        freq = rate * (1.7 ** k) * rng.uniform(0.8, 1.3)
        out += (amp / (1.9 ** k)) * np.sin(
            2 * math.pi * freq * t + rng.uniform(0, 2 * math.pi))
    return out


def warp2d(X, Y, amp, scale):
    """A smooth 2-D displacement, built from a handful of sine plies. This is
    what turns a tidy contour plot into something that looks grown."""
    D = np.zeros_like(X)
    for _ in range(4):
        fx = rng.uniform(0.4, 1.6) / scale
        fy = rng.uniform(0.4, 1.6) / scale
        D += (amp / 4) * np.sin(2 * math.pi * (fx * X + fy * Y)
                                + rng.uniform(0, 2 * math.pi))
    return D


def decimate(seg, tol=1.6):
    """Drop points that sit within `tol` of the last one kept. Contours come out
    of marching squares far denser than the drawing needs, and the excess is
    most of the file size."""
    out = [seg[0]]
    for p in seg[1:-1]:
        if (p[0] - out[-1][0]) ** 2 + (p[1] - out[-1][1]) ** 2 >= tol * tol:
            out.append(p)
    out.append(seg[-1])
    return out


def path_d(pts, close=False):
    """Points to an SVG path, smoothed with quadratics through the midpoints.
    Coordinates are whole units: these drawings are hundreds of units across and
    every line is hand-warped anyway, so decimals buy nothing visible."""
    if len(pts) < 3:
        return f"M{pts[0][0]:.0f},{pts[0][1]:.0f} L{pts[-1][0]:.0f},{pts[-1][1]:.0f}"
    p = [f"M{pts[0][0]:.0f},{pts[0][1]:.0f}"]
    for i in range(1, len(pts) - 1):
        mx = (pts[i][0] + pts[i + 1][0]) / 2
        my = (pts[i][1] + pts[i + 1][1]) / 2
        p.append(f"Q{pts[i][0]:.0f},{pts[i][1]:.0f} {mx:.0f},{my:.0f}")
    p.append(f"L{pts[-1][0]:.0f},{pts[-1][1]:.0f}")
    if close:
        p.append("Z")
    return " ".join(p)


# ── the grain ───────────────────────────────────────────────────────────────
def grain_field(w, h, knots, along="y", res=260, warp=26, warp_scale=190):
    """Build the scalar field whose contours are the grain lines."""
    nx = res
    ny = max(8, int(res * h / w))
    xs = np.linspace(0, w, nx)
    ys = np.linspace(0, h, ny)
    X, Y = np.meshgrid(xs, ys)

    Xw = X + warp2d(X, Y, warp, warp_scale)
    Yw = Y + warp2d(X, Y, warp * 0.7, warp_scale * 1.3)

    # straight run of the grain, across the short axis
    F = Xw.copy() if along == "y" else Yw.copy()

    for kx, ky, amp, sx, sy, rot in knots:
        dx, dy = Xw - kx, Yw - ky
        ca, sa = math.cos(rot), math.sin(rot)
        u = (dx * ca + dy * sa) / sx
        v = (-dx * sa + dy * ca) / sy
        F = F + amp * np.exp(-0.5 * (u * u + v * v))
    return X, Y, F


def grain_lines(w, h, knots, along="y", spacing=7.0, res=260, warp=26,
                warp_scale=190, heavy=0.3, clip_pad=3):
    """Contour the field and turn each contour into a weighted SVG path."""
    X, Y, F = grain_field(w, h, knots, along, res, warp, warp_scale)
    lo, hi = float(F.min()), float(F.max())
    levels = np.arange(lo + spacing * 0.5, hi, spacing)

    fig = plt.figure()
    cs = plt.contour(X, Y, F, levels=levels)
    plt.close(fig)

    # Weight comes from slow noise over the level index, so heavy lines arrive
    # in bands with fine ones between - as in real timber - rather than
    # speckling at random.
    idx = np.linspace(0, 1, len(levels))
    wgt = (1 + np.sin(idx * 2 * math.pi * rng.uniform(2.5, 4.5)
                      + rng.uniform(0, 6))) / 2
    wgt = 0.5 * wgt + 0.5 * (1 + wobble(idx, 1.0, 3, 2.2)) / 2

    els = []
    for li, segs in enumerate(cs.allsegs):
        t = float(np.clip(wgt[li] if li < len(wgt) else 0.5, 0, 1))
        width = 0.8 + 5.2 * (t ** 2.4) if t > 1 - heavy else 0.8 + 1.5 * t
        for seg in segs:
            if len(seg) < 3:
                continue
            pts = decimate([(float(a), float(b)) for a, b in seg])
            if len(pts) < 2:
                continue
            els.append(f'<path d="{path_d(pts)}" stroke-width="{width:.2f}"/>')
    return els


def checks(w, h, n, along="y"):
    """The cracks that split across the grain - short, jagged, tapering."""
    els = []
    for _ in range(n):
        x0, y0 = rng.uniform(0, w), rng.uniform(0, h)
        L = rng.uniform(0.12, 0.4) * (w if along == "y" else h)
        t = np.linspace(0, 1, 9)
        if along == "y":
            xs = x0 + t * L * rng.choice([-1, 1])
            ys = y0 + wobble(t, L * 0.16, 3, 2.4)
        else:
            ys = y0 + t * L * rng.choice([-1, 1])
            xs = x0 + wobble(t, L * 0.16, 3, 2.4)
        els.append(f'<path d="{path_d(list(zip(xs, ys)))}" '
                   f'stroke-width="{rng.uniform(0.7, 2.1):.2f}" opacity="0.9"/>')
    return els


_uid = [0]


def island(w, h, rough=0.17):
    """An organic closed outline inscribed in the box.

    Grain is clipped to one of these so each decoration reads as an island of
    figured wood, not as a rectangular swatch someone cut out with scissors."""
    t = np.linspace(0, 1, 64)
    a = t * 2 * math.pi
    rx = w * 0.5 * (1 + wobble(t, rough, 3, 1.5))
    ry = h * 0.5 * (1 + wobble(t, rough, 3, 1.7))
    # taper the wobble out at the seam so the ends meet cleanly
    rx = w * 0.5 + (rx - w * 0.5) * np.sin(t * math.pi) ** 0.5
    ry = h * 0.5 + (ry - h * 0.5) * np.sin(t * math.pi) ** 0.5
    return list(zip(w / 2 + rx * 0.94 * np.cos(a), h / 2 + ry * 0.94 * np.sin(a)))


def svg(w, h, body, extra="", clip=None):
    defs = ""
    if clip is not None:
        _uid[0] += 1
        cid = f"i{_uid[0]}"
        defs = f'<defs><clipPath id="{cid}"><path d="{clip}"/></clipPath></defs>'
        body = [f'<g clip-path="url(#{cid})">{"".join(body)}</g>']
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}" fill="none" stroke="currentColor" '
        f'stroke-linecap="round" stroke-linejoin="round" {extra}>'
        f'{defs}<g>{"".join(body)}</g></svg>'
    )


def write(name, markup):
    with open(os.path.abspath(os.path.join(OUT, name)), "w", encoding="utf-8") as f:
        f.write(markup)
    print(f"{name:24} {len(markup) // 1024:>4} KB")


# ── the pieces ──────────────────────────────────────────────────────────────
# Scattered islands of grain rather than a matched pair of borders. They are
# deliberately different sizes and proportions, and get placed asymmetrically
# down the page, so nothing reads as a frame around the flyer.

def patch(w, h, knots, along="y", spacing=9.0, res=170, warp=22,
          warp_scale=190, n_checks=10):
    body = grain_lines(w, h, knots, along=along, spacing=spacing, res=res,
                       warp=warp, warp_scale=warp_scale)
    body += checks(w, h, n_checks, along=along)
    return svg(w, h, body, clip=path_d(island(w, h), close=True))


def grain_knot(w=260, h=260):
    """One tight knot, all the grain wrapping it."""
    return patch(w, h, [(w * 0.5, h * 0.5, 105.0, 30.0, 40.0, 0.4)],
                 spacing=7.5, res=150, warp=13, warp_scale=110, n_checks=6)


def grain_tall(w=210, h=620):
    """A long run of grain with a knot near one end."""
    knots = [(w * 0.55, h * 0.28, 92.0, 27.0, 60.0, -0.3),
             (w * 0.4, h * 0.78, 66.0, 22.0, 48.0, 0.35)]
    return patch(w, h, knots, spacing=8.0, res=140, warp=20, n_checks=10)


def grain_wide(w=460, h=210):
    """Grain running across, two knots pulling it out of true."""
    knots = [(w * 0.32, h * 0.45, 60.0, 62.0, 22.0, 0.15),
             (w * 0.72, h * 0.58, 48.0, 50.0, 18.0, -0.2)]
    return patch(w, h, knots, along="x", spacing=6.0, res=300, warp=15,
                 warp_scale=150, n_checks=8)


def grain_wisp(w=170, h=430):
    """Sparse, knotless - just the straight run of the grain, wandering."""
    return patch(w, h, [], spacing=10.0, res=120, warp=26, warp_scale=210,
                 n_checks=7)


def grain_blob(w=320, h=340):
    """An organic mass, grain swirling through it."""
    knots = [(w * 0.42, h * 0.38, 88.0, 34.0, 44.0, 0.6),
             (w * 0.66, h * 0.72, 62.0, 26.0, 32.0, -0.4)]
    return patch(w, h, knots, spacing=7.5, res=175, warp=17, warp_scale=140,
                 n_checks=9)


def divider(w=900, h=110):
    """A long horizontal run of grain to sit between sections."""
    knots = [
        (w * 0.5, h * 0.5, 54.0, 90.0, 25.0, 0.0),
        (w * 0.17, h * 0.45, 34.0, 58.0, 18.0, 0.2),
        (w * 0.83, h * 0.55, 34.0, 58.0, 18.0, -0.2),
    ]
    body = grain_lines(w, h, knots, along="x", spacing=5.5, res=420, warp=13,
                       warp_scale=150)
    body += checks(w, h, 12, along="x")
    return svg(w, h, body, extra='preserveAspectRatio="none"',
               clip=path_d(island(w, h, rough=0.1), close=True))


def corner(w=150, h=150):
    """A single small knot, for the corner of a box."""
    body = grain_lines(w, h, [(w * 0.52, h * 0.5, 95.0, 26.0, 34.0, 0.5)],
                       spacing=7.0, res=130, warp=11, warp_scale=90)
    return svg(w, h, body, clip=path_d(island(w, h), close=True))


def lozenge(w=280, h=90):
    """A fat capsule, the way a word gets ringed by hand. Stretched to whatever
    it is asked to circle, so it can wrap a line of any length; the squash that
    causes reads as pen pressure."""
    t = np.linspace(0, 1.05, 150)           # >1 so the ends overshoot and cross
    ang = t * 2 * math.pi - 0.4
    rx = w * 0.46 + wobble(t, 5, 2, 1.6)
    ry = h * 0.40 + wobble(t, 4, 2, 1.9)
    pts = list(zip(w / 2 + rx * np.cos(ang), h / 2 + ry * np.sin(ang)))
    return svg(w, h, [f'<path d="{path_d(pts)}" stroke-width="4.5"/>'],
               extra='preserveAspectRatio="none"')


def frame(w=1000, h=1040):
    """A wobbling box, drawn as if by hand."""
    body, m = [], 14
    pts = [(m, m), (w - m, m), (w - m, h - m), (m, h - m)]
    for i in range(4):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % 4]
        t = np.linspace(0, 1, 60)
        px, py = ax + t * (bx - ax), ay + t * (by - ay)
        n = wobble(t, 3.6, 2, 1.4)
        if abs(bx - ax) > abs(by - ay):
            py = py + n
        else:
            px = px + n
        body.append(f'<path d="{path_d(list(zip(px, py)))}" stroke-width="2.2"/>')
    return svg(w, h, body, extra='preserveAspectRatio="none"')


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)

    # The page background is no longer made of these. It is painted at runtime
    # by src/woodgrain.js, which uses the same field-and-contours idea but can
    # part the grain around wherever the content actually landed - something a
    # file generated here cannot know. What is left are the few fixed marks:
    # the ring around the date, and the frame and knot on the password box.
    for dead in ("orn-vine-left.svg", "orn-vine-right.svg", "orn-knot.svg",
                 "orn-tall.svg", "orn-wide.svg", "orn-wisp.svg",
                 "orn-blob.svg", "orn-divider.svg"):
        p = os.path.abspath(os.path.join(OUT, dead))
        if os.path.exists(p):
            os.remove(p)
            print(f"removed {dead}")

    write("orn-corner.svg", corner())
    write("orn-ring.svg", lozenge())
    write("orn-frame.svg", frame())
