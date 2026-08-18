"""Draw Marcy.

She is a long-haired black cat: a round floof with an enormous ruff round her
face, tufted ears, a huge plumed tail, big gold-green eyes and a small white
wisp on her chest. The whole character is in the silhouette, so the fur edges
have to be actual scalloped curves - hand-placed circles bolted onto a body
outline read as lumps or as spikes, which is exactly how the first attempt at
this went wrong.

Proportions are pushed for cuteness rather than accuracy: head about half the
body length, eyes large and low, legs short. She is drawn in profile with her
face turned to the viewer, which keeps her readable while she is running in any
direction - flipping her horizontally is all that direction needs.

Writes src/marcy-run.svg, which the page inlines (so CSS can animate the tail
and paws). Regenerate with:

    uv run --with numpy python tools/draw_marcy.py
"""
from __future__ import annotations

import math
import os

import numpy as np

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "marcy-run.svg")
SEED = 20270605
rng = np.random.default_rng(SEED)

W, H = 200, 148


def fmt(pts):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def furry_ring(cx, cy, rx, ry, tips=20, depth=0.13, jitter=0.35, rot=0.0):
    """A closed loop whose edge is a ring of outward fur tips.

    Between each pair of base points the path bulges outward on a quadratic,
    with the bulge length varied per tip so the fur is uneven the way fur is.
    """
    d = []
    base = []
    for i in range(tips):
        a = rot + 2 * math.pi * i / tips
        base.append((cx + rx * math.cos(a), cy + ry * math.sin(a), a))

    d.append(f"M{base[0][0]:.1f},{base[0][1]:.1f}")
    for i in range(tips):
        x0, y0, a0 = base[i]
        x1, y1, a1 = base[(i + 1) % tips]
        am = a0 + (2 * math.pi / tips) / 2
        grow = 1 + depth * (1 + jitter * rng.uniform(-1, 1))
        cxp = cx + rx * grow * math.cos(am)
        cyp = cy + ry * grow * math.sin(am)
        d.append(f"Q{cxp:.1f},{cyp:.1f} {x1:.1f},{y1:.1f}")
    d.append("Z")
    return " ".join(d)


def plume(spine, widths, tips=13, depth=0.3):
    """A tapered furry tail: a spine walked with a varying half-width, both
    edges broken into fur tips."""
    t = np.linspace(0, 1, len(spine))
    ts = np.linspace(0, 1, tips)
    xs = np.interp(ts, t, [p[0] for p in spine])
    ys = np.interp(ts, t, [p[1] for p in spine])
    hw = np.interp(ts, np.linspace(0, 1, len(widths)), widths)

    dx = np.gradient(xs)
    dy = np.gradient(ys)
    ln = np.hypot(dx, dy)
    ln[ln == 0] = 1
    nx, ny = -dy / ln, dx / ln

    left = [(xs[i] + nx[i] * hw[i], ys[i] + ny[i] * hw[i]) for i in range(tips)]
    right = [(xs[i] - nx[i] * hw[i], ys[i] - ny[i] * hw[i]) for i in range(tips)]

    def side(pts, sign):
        out = []
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            mx, my = (x0 + x1) / 2, (y0 + y1) / 2
            g = hw[i] * depth * (1 + 0.5 * rng.uniform(-1, 1))
            out.append(f"Q{mx + sign * nx[i] * g:.1f},{my + sign * ny[i] * g:.1f} "
                       f"{x1:.1f},{y1:.1f}")
        return out

    d = [f"M{left[0][0]:.1f},{left[0][1]:.1f}"]
    d += side(left, 1)
    d.append(f"L{right[-1][0]:.1f},{right[-1][1]:.1f}")
    d += side(right[::-1], -1)
    d.append("Z")
    return " ".join(d)


def ear(tipx, tipy, ax, ay, bx, by, curl=0.28):
    """A tufted ear: outer edge bows out, inner edge bows in."""
    mx1 = (ax + tipx) / 2 + (tipx - ax) * curl
    my1 = (ay + tipy) / 2 - abs(tipy - ay) * curl
    mx2 = (tipx + bx) / 2 + (bx - tipx) * curl
    my2 = (tipy + by) / 2 - abs(by - tipy) * curl
    return (f"M{ax:.1f},{ay:.1f} Q{mx1:.1f},{my1:.1f} {tipx:.1f},{tipy:.1f} "
            f"Q{mx2:.1f},{my2:.1f} {bx:.1f},{by:.1f} Z")


def eye(cx, cy, rx, ry):
    """A big round-almond eye, wider at the outer corner."""
    return (f"M{cx - rx:.1f},{cy:.1f} "
            f"C{cx - rx:.1f},{cy - ry * 1.25:.1f} {cx + rx:.1f},{cy - ry * 1.25:.1f} "
            f"{cx + rx:.1f},{cy:.1f} "
            f"C{cx + rx:.1f},{cy + ry * 1.15:.1f} {cx - rx:.1f},{cy + ry * 1.15:.1f} "
            f"{cx - rx:.1f},{cy:.1f} Z")


def tuft(cx, cy, n=6, length=15, spread=1.5, angle=math.pi / 2, w=2.4):
    """A few tapering strands fanning out from a point.

    This is the wisp on her chest. Drawn as one rounded blob it reads as an egg
    stuck to her front; as separate pointed strands it reads as fur.
    """
    d = []
    for i in range(n):
        a = angle + (i / (n - 1) - 0.5) * spread
        L = length * rng.uniform(0.55, 1.0)
        tx, ty = cx + L * math.cos(a), cy + L * math.sin(a)
        px, py = -math.sin(a) * w, math.cos(a) * w
        mx, my = (cx + tx) / 2, (cy + ty) / 2
        d.append(
            f"M{cx + px:.1f},{cy + py:.1f} "
            f"Q{mx + px * 0.7:.1f},{my + py * 0.7:.1f} {tx:.1f},{ty:.1f} "
            f"Q{mx - px * 0.7:.1f},{my - py * 0.7:.1f} {cx - px:.1f},{cy - py:.1f} Z"
        )
    return " ".join(d)


def shut_eye(cx, cy, r=9):
    """A closed eye: a lash-line curving down at the outer end."""
    return (f"M{cx - r:.1f},{cy:.1f} Q{cx:.1f},{cy + r * 0.75:.1f} "
            f"{cx + r:.1f},{cy - r * 0.15:.1f}")


def build() -> str:
    HX, HY, HR = 132, 60, 30          # head
    p = []

    # ── tail: up and over behind her ────────────────────────────────────
    tail_spine = [(64, 96), (46, 92), (30, 80), (24, 62), (28, 42), (38, 28)]
    p.append('<g class="m-tail">')
    p.append(f'<path class="m-fur" d="{plume(tail_spine, [9, 15, 19, 20, 17, 11])}"/>')
    p.append('</g>')

    # ── legs: short and stubby, which is most of the cuteness ───────────
    # Only the paws and a little ankle clear the floof. Longer legs make her
    # leggy and lanky, and she is neither.
    BODY_CY, BODY_RY = 84, 29
    foot = BODY_CY + BODY_RY - 3
    legs = [("m-leg m-leg-a", 112, foot), ("m-leg m-leg-b", 95, foot + 2),
            ("m-leg m-leg-c", 76, foot + 2), ("m-leg m-leg-d", 59, foot)]
    for cls, lx, ly in legs:
        p.append(f'<g class="{cls}">'
                 f'<path class="m-fur" d="M{lx},{ly - 10} L{lx},{ly + 3}" '
                 f'stroke-width="13" stroke-linecap="round"/>'
                 f'<ellipse class="m-fur-fill" cx="{lx}" cy="{ly + 5}" '
                 f'rx="8.5" ry="5.5"/></g>')

    # ── body ────────────────────────────────────────────────────────────
    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(86, BODY_CY, 45, BODY_RY, 22, 0.11)}"/>')

    # ── ruff, then head on top of it ────────────────────────────────────
    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(HX, HY + 4, HR + 11, HR + 9, 26, 0.16, 0.5)}"/>')
    p.append(f'<path class="m-fur-fill" d="{ear(104, 18, 104, 44, 124, 30)}"/>')
    p.append(f'<path class="m-fur-fill" d="{ear(158, 16, 142, 28, 160, 44)}"/>')
    p.append(f'<path class="m-tuft" d="{ear(107, 27, 108, 41, 120, 32, 0.18)}"/>')
    p.append(f'<path class="m-tuft" d="{ear(154, 25, 144, 31, 156, 42, 0.18)}"/>')
    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(HX, HY, HR, HR - 1, 20, 0.07, 0.3)}"/>')

    # ── the white wisp on her chest ─────────────────────────────────────
    p.append(f'<path class="m-bib" d="{tuft(117, 84, 6, 16, 1.5)}"/>')

    # ── face ────────────────────────────────────────────────────────────
    for ex, ey in ((119, 60), (145, 57)):
        p.append(f'<path class="m-eye" d="{eye(ex, ey, 10, 9)}"/>')
        p.append(f'<ellipse class="m-pupil" cx="{ex + 1}" cy="{ey}" rx="4" ry="7"/>')
        p.append(f'<circle class="m-glint" cx="{ex - 2.5}" cy="{ey - 3.5}" r="2.2"/>')

    p.append('<path class="m-nose" d="M127,76 l10,0 l-5,6 z"/>')
    p.append('<path class="m-mouth" d="M132,82 c-3,3 -7,3 -9,0 M132,82 '
             'c3,3 7,3 9,0"/>')
    p.append('<g class="m-whisk">'
             '<path d="M120,80 C106,78 96,79 90,82"/>'
             '<path d="M120,84 C107,85 98,88 93,92"/>'
             '<path d="M145,79 C158,76 168,77 174,80"/>'
             '<path d="M145,83 C158,84 167,87 172,91"/>'
             '</g>')

    return (f'<svg class="marcy-run" viewBox="0 0 {W} {H}" '
            f'xmlns="http://www.w3.org/2000/svg">{"".join(p)}</svg>')


def build_sleeping() -> str:
    """The same cat, curled into a loaf with her tail round her and her eyes
    shut. This is where she ends up once you let her catch the banana."""
    HX, HY, HR = 74, 74, 29
    p = []

    # the loaf
    p.append(f'<path class="m-fur-fill" d="{furry_ring(108, 92, 60, 33, 24, 0.1)}"/>')

    # Tail drawn *over* the loaf, sweeping round its front to the chin - which
    # is where a sleeping cat actually puts it. Behind the body it is invisible
    # except for one blocky wedge poking out of the side.
    tail_spine = [(166, 100), (152, 118), (122, 126), (90, 126), (66, 118),
                  (54, 104)]
    p.append(f'<path class="m-fur" d="{plume(tail_spine, [9, 14, 16, 15, 12, 8])}"/>')

    # head resting on it
    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(HX, HY + 4, HR + 11, HR + 8, 24, 0.16, 0.5)}"/>')
    p.append(f'<path class="m-fur-fill" d="{ear(48, 32, 48, 58, 66, 44)}"/>')
    p.append(f'<path class="m-fur-fill" d="{ear(100, 30, 84, 42, 102, 58)}"/>')
    p.append(f'<path class="m-tuft" d="{ear(51, 41, 52, 55, 63, 46, 0.18)}"/>')
    p.append(f'<path class="m-tuft" d="{ear(96, 39, 87, 45, 98, 56, 0.18)}"/>')
    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(HX, HY, HR, HR - 1, 20, 0.07, 0.3)}"/>')

    p.append(f'<path class="m-bib" d="{tuft(96, 100, 5, 13, 1.4)}"/>')

    # shut eyes, and a contented face
    p.append(f'<path class="m-shut" d="{shut_eye(61, 74)}"/>')
    p.append(f'<path class="m-shut" d="{shut_eye(87, 72)}"/>')
    p.append('<path class="m-nose" d="M69,88 l10,0 l-5,6 z"/>')
    p.append('<path class="m-mouth" d="M74,94 c-3,3 -7,3 -9,0 M74,94 c3,3 7,3 9,0"/>')
    p.append('<g class="m-whisk">'
             '<path d="M62,92 C48,90 38,91 32,94"/>'
             '<path d="M62,96 C49,97 40,100 35,104"/>'
             '<path d="M87,91 C100,88 110,89 116,92"/>'
             '<path d="M87,95 C100,96 109,99 114,103"/>'
             '</g>')

    # her banana, tucked in beside her
    p.append('<g class="m-banana">'
             '<path d="M150,120 Q160,104 178,110 Q162,113 152,125 Z"/>'
             '<path class="m-banana-stem" d="M178,110 l5,-3"/></g>')

    p.append('<g class="m-zzz">'
             '<path d="M126,44 L142,44 L126,62 L142,62"/>'
             '<path d="M148,22 L160,22 L148,36 L160,36"/>'
             '</g>')

    return (f'<svg class="marcy-sleep" viewBox="0 0 {W} {H}" '
            f'xmlns="http://www.w3.org/2000/svg">{"".join(p)}</svg>')


def build_peek() -> str:
    """Just enough of her to give her away while she is hiding: one paw and the
    tip of her tail, poking out from behind the left edge of the screen. Drawn
    anchored at x=0 so it can be flush against the viewport edge."""
    p = []

    # tail tip curling out and up
    tail_spine = [(-6, 96), (14, 92), (30, 78), (34, 56), (28, 38)]
    p.append(f'<path class="m-fur" d="{plume(tail_spine, [13, 14, 13, 10, 6])}"/>')

    # a paw braced against the edge, toes showing
    p.append('<path class="m-fur" d="M-8,150 L26,150" stroke-width="26" '
             'stroke-linecap="round"/>')
    p.append(f'<path class="m-fur-fill" d="{furry_ring(30, 150, 15, 13, 12, 0.13)}"/>')
    for i, ty in enumerate((142, 150, 158)):
        p.append(f'<ellipse class="m-toe" cx="{40 + (i == 1) * 2}" cy="{ty}" '
                 f'rx="3.6" ry="3" />')

    # a few loose whisker-fine hairs, so the edge is not a clean cut
    p.append('<g class="m-whisk">'
             '<path d="M30,116 C40,112 48,112 54,114"/>'
             '<path d="M30,126 C40,126 47,129 52,133"/>'
             '</g>')

    return (f'<svg class="marcy-peek" viewBox="-10 20 90 160" '
            f'xmlns="http://www.w3.org/2000/svg">{"".join(p)}</svg>')


if __name__ == "__main__":
    for name, markup in (("marcy-run.svg", build()),
                         ("marcy-sleep.svg", build_sleeping()),
                         ("marcy-peek.svg", build_peek())):
        path = os.path.join(os.path.dirname(OUT), name)
        with open(os.path.abspath(path), "w", encoding="utf-8") as f:
            f.write(markup)
        print(f"wrote {name}  {len(markup)} bytes")
