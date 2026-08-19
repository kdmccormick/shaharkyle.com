"""Draw Marcy, and her banana.

Marcy is a long-haired cat who photographs as black but is really a very dark
warm brown, with brown lights in her coat where the sun gets into it. The
things that actually make her recognisable, from the photographs in marcy/:

  - small, neat, rounded ears set wide apart, with pale tufts inside. Not the
    tall spikes an early version of this had, which read as a fox.
  - narrow amber-green eyes, close together, the upper lid straight and
    slanting down towards the nose. That slant is her whole expression - she
    looks permanently faintly concerned. Big round eyes turn her into a kitten,
    which she is not.
  - a large silver ruff under the chin and down the chest, the one bright thing
    on her.
  - an enormous plumed tail.

The whole character is in the silhouette, so the fur edges are real scalloped
curves rather than circles bolted onto an outline.

Writes three files into src/, which the page inlines so CSS can animate parts of
them. Regenerate with:

    uv run --with numpy python tools/draw_marcy.py
"""
from __future__ import annotations

import math
import os

import numpy as np

SRC = os.path.join(os.path.dirname(__file__), "..", "src")
SEED = 20270605
rng = np.random.default_rng(SEED)

W, H = 200, 148


# ── fur ─────────────────────────────────────────────────────────────────────
def furry_ring(cx, cy, rx, ry, tips=20, depth=0.16, jitter=0.45, lean=0.62,
               rot=0.0):
    """A closed loop edged with pointed fur tufts.

    Each segment runs out to a *point* and back, rather than bulging on a
    single rounded quadratic. Round bulges are what made her look like a
    cloud; long fur ends in tips.

    `lean` swings every tip round by a fraction of a segment, so the whole coat
    sweeps one way instead of radiating evenly - which is the other half of
    reading as fur rather than as a doily.
    """
    step = 2 * math.pi / tips
    base = []
    for i in range(tips):
        a = rot + step * i
        base.append((cx + rx * math.cos(a), cy + ry * math.sin(a), a))

    d = [f"M{base[0][0]:.1f},{base[0][1]:.1f}"]
    for i in range(tips):
        _, _, a0 = base[i]
        x1, y1, _ = base[(i + 1) % tips]
        am = a0 + step / 2
        grow = 1 + depth * (1 + jitter * rng.uniform(-1, 1))
        at = am + lean * step * 0.5                    # the tip leans over

        tx = cx + rx * grow * math.cos(at)
        ty = cy + ry * grow * math.sin(at)
        # controls sit just off the base ring, so the tuft rises steeply from
        # the coat and comes to a point rather than arcing over
        g1 = 1 + depth * 0.30
        g2 = 1 + depth * 0.12
        c1x = cx + rx * g1 * math.cos(a0 + step * 0.30)
        c1y = cy + ry * g1 * math.sin(a0 + step * 0.30)
        c2x = cx + rx * g2 * math.cos(a0 + step * 0.86)
        c2y = cy + ry * g2 * math.sin(a0 + step * 0.86)

        d.append(f"Q{c1x:.1f},{c1y:.1f} {tx:.1f},{ty:.1f}")
        d.append(f"Q{c2x:.1f},{c2y:.1f} {x1:.1f},{y1:.1f}")
    d.append("Z")
    return " ".join(d)


def paw(x, y, w=9.0, h=5.5, toes=3, up=-1):
    """A foot with toes, rather than a blob.

    `up` is which way the toes face: -1 for the top edge, +1 for the bottom.
    """
    parts = [f'<ellipse class="m-fur-fill" cx="{x:.1f}" cy="{y:.1f}" '
             f'rx="{w:.1f}" ry="{h:.1f}"/>']
    for i in range(toes):
        f = (i - (toes - 1) / 2) / max(1, toes - 1)     # -0.5 .. 0.5
        tx = x + f * w * 1.1
        # Toes overlap the pad well past its centre line. Sitting them out on
        # the edge leaves a row of loose beads under the foot rather than a paw.
        ty = y + up * h * 0.34 - abs(f) * h * 0.16
        parts.append(f'<circle class="m-fur-fill" cx="{tx:.1f}" cy="{ty:.1f}" '
                     f'r="{h * 0.62:.1f}"/>')
    # the splits between the toes, scored into the pad rather than drawn on it
    for i in range(toes - 1):
        f = (i + 0.5 - (toes - 1) / 2) / max(1, toes - 1)
        sx = x + f * w * 1.1
        parts.append(f'<path class="m-toe" d="M{sx:.1f},{y + up * h * 0.12:.1f} '
                     f'L{sx:.1f},{y + up * h * 0.92:.1f}"/>')
    return "".join(parts)


def plume(spine, widths, tips=13, depth=0.3):
    """A tapered furry tail.

    The far end is closed with a curve round the tip, not a straight line
    between the two edges. That straight line is what left a hard vertical cut
    down the side of the sleeping loaf - it read as if she had been trimmed out
    with scissors.
    """
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

    def side(pts, sign, idx):
        """One edge of the tail, broken into pointed tufts.

        Each segment runs out to a tip and back, the same as the body's coat -
        a single rounded bulge per segment left the tail a smooth slab sitting
        next to a shaggy cat.
        """
        out = []
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            k = idx[i]
            g = hw[k] * depth * (1 + 0.5 * rng.uniform(-1, 1))
            # the tip sits two thirds along and leans down the tail
            tx = x0 + (x1 - x0) * 0.62 + sign * nx[k] * g
            ty = y0 + (y1 - y0) * 0.62 + sign * ny[k] * g
            out.append(f"Q{x0 + (x1 - x0) * 0.2 + sign * nx[k] * g * 0.35:.1f},"
                       f"{y0 + (y1 - y0) * 0.2 + sign * ny[k] * g * 0.35:.1f} "
                       f"{tx:.1f},{ty:.1f}")
            out.append(f"Q{x0 + (x1 - x0) * 0.86 + sign * nx[k] * g * 0.1:.1f},"
                       f"{y0 + (y1 - y0) * 0.86 + sign * ny[k] * g * 0.1:.1f} "
                       f"{x1:.1f},{y1:.1f}")
        return out

    fwd = list(range(tips))
    d = [f"M{left[0][0]:.1f},{left[0][1]:.1f}"]
    d += side(left, 1, fwd)
    # round the tip: bulge past the end along the spine direction
    tipx = xs[-1] + (dx[-1] / ln[-1]) * hw[-1] * 1.5
    tipy = ys[-1] + (dy[-1] / ln[-1]) * hw[-1] * 1.5
    d.append(f"Q{tipx:.1f},{tipy:.1f} {right[-1][0]:.1f},{right[-1][1]:.1f}")
    d += side(right[::-1], -1, fwd[::-1][:-1])
    d.append("Z")
    return " ".join(d)


def tuft(cx, cy, n=6, length=15, spread=1.5, angle=math.pi / 2, w=2.4):
    """A fan of tapering strands - her ruff, and the wisp on her chest."""
    d = []
    for i in range(n):
        a = angle + (i / max(1, n - 1) - 0.5) * spread
        L = length * rng.uniform(0.6, 1.0)
        tx, ty = cx + L * math.cos(a), cy + L * math.sin(a)
        px, py = -math.sin(a) * w, math.cos(a) * w
        mx, my = (cx + tx) / 2, (cy + ty) / 2
        d.append(
            f"M{cx + px:.1f},{cy + py:.1f} "
            f"Q{mx + px * 0.7:.1f},{my + py * 0.7:.1f} {tx:.1f},{ty:.1f} "
            f"Q{mx - px * 0.7:.1f},{my - py * 0.7:.1f} {cx - px:.1f},{cy - py:.1f} Z"
        )
    return " ".join(d)


# ── features ────────────────────────────────────────────────────────────────
def ear(tipx, tipy, ax, ay, bx, by, round_=0.55):
    """A small ear with a rounded tip, seated on the skull.

    Hers are neat and blunt. Drawn as a sharp triangle they read as a fox's,
    which is what an earlier version of this looked like.
    """
    return (
        f"M{ax:.1f},{ay:.1f} "
        f"C{ax + (tipx - ax) * 0.35:.1f},{ay + (tipy - ay) * 0.8:.1f} "
        f"{tipx - (tipx - ax) * round_ * 0.3:.1f},{tipy:.1f} "
        f"{tipx:.1f},{tipy:.1f} "
        f"C{tipx + (bx - tipx) * round_ * 0.3:.1f},{tipy:.1f} "
        f"{bx - (bx - tipx) * 0.35:.1f},{by + (tipy - by) * 0.8:.1f} "
        f"{bx:.1f},{by:.1f} Z"
    )


def eye(cx, cy, rx, ry):
    """A wide, round-cornered eye.

    Deliberately not slanted. Dropping the inner corner gives a cat a serious,
    slightly worried brow - accurate to some photographs of her, but on a face
    this simplified it just reads as sad. Round and open reads as curious,
    which is the one we want.
    """
    return (
        f"M{cx - rx:.1f},{cy:.1f} "
        f"C{cx - rx:.1f},{cy - ry * 1.35:.1f} {cx + rx:.1f},{cy - ry * 1.35:.1f} "
        f"{cx + rx:.1f},{cy:.1f} "
        f"C{cx + rx:.1f},{cy + ry * 1.3:.1f} {cx - rx:.1f},{cy + ry * 1.3:.1f} "
        f"{cx - rx:.1f},{cy:.1f} Z"
    )


def shut_eye(cx, cy, r=9):
    """A closed eye: a shallow lash line, curving down at both ends."""
    return (f"M{cx - r:.1f},{cy:.1f} "
            f"Q{cx:.1f},{cy + r * 0.85:.1f} {cx + r:.1f},{cy:.1f}")


def face(hx, hy, hr, shut=False):
    """Everything inside the head outline. Shared by both poses so she cannot
    drift into being two different cats."""
    p = []
    ex = hr * 0.42          # eyes sit close together, well inside the skull
    ey = hy - hr * 0.06
    er = hr * 0.30

    if shut:
        p.append(f'<path class="m-shut" d="{shut_eye(hx - ex, ey, er)}"/>')
        p.append(f'<path class="m-shut" d="{shut_eye(hx + ex, ey, er)}"/>')
    else:
        for sx in (-1, 1):
            cx = hx + sx * ex
            p.append(f'<path class="m-eye" d="{eye(cx, ey, er, er * 0.86)}"/>')
            p.append(f'<ellipse class="m-pupil" cx="{cx:.1f}" cy="{ey:.1f}" '
                     f'rx="{er * 0.36:.1f}" ry="{er * 0.74:.1f}"/>')
            p.append(f'<circle class="m-glint" cx="{cx - er * 0.32:.1f}" '
                     f'cy="{ey - er * 0.38:.1f}" r="{er * 0.19:.1f}"/>')

    # muzzle: nose, mouth, and the pale chin under it
    ny = hy + hr * 0.42
    p.append(f'<path class="m-nose" d="M{hx - 4.4:.1f},{ny:.1f} '
             f'q4.4,-2.2 8.8,0 q-4.4,5 -8.8,0 Z"/>')
    p.append(f'<path class="m-mouth" d="M{hx:.1f},{ny + 3.6:.1f} '
             f'c-3,3.4 -7,3.2 -8.6,-0.4 M{hx:.1f},{ny + 3.6:.1f} '
             f'c3,3.4 7,3.2 8.6,-0.4"/>')

    # The ruff: a soft scalloped patch of silver under the chin, with a few
    # strands escaping the bottom of it. Drawn as a bare fan of strands it came
    # out as a spiky starburst - hers is fluff, not a hedgehog.
    p.append(f'<path class="m-bib" '
             f'd="{furry_ring(hx, ny + hr * 0.34, hr * 0.42, hr * 0.34, 10, 0.26, 0.55)}"/>')
    p.append(f'<path class="m-bib" '
             f'd="{tuft(hx, ny + hr * 0.5, 5, hr * 0.3, 1.5, w=3.4)}"/>')
    return p


def whiskers(hx, hy, hr, mirror=True):
    ny = hy + hr * 0.42
    d = []
    # Kept inside the coat. Run out to twice the head radius and they stop
    # looking like whiskers and start looking like antennae.
    reach = hr * 1.32
    for k, dy in enumerate((-3.5, 0.5, 4.5)):
        drop = -3 + k * 4.5                # they fan down as they go out
        for sx in ((-1, 1) if mirror else (-1,)):
            d.append(f'<path d="M{hx + sx * 7:.1f},{ny + dy:.1f} '
                     f'Q{hx + sx * reach * 0.55:.1f},{ny + dy + drop * 0.35:.1f} '
                     f'{hx + sx * reach:.1f},{ny + dy + drop:.1f}"/>')
    return f'<g class="m-whisk">{"".join(d)}</g>'


def head(hx, hy, hr, shut=False):
    """Ruff, ears, skull, then the face on top."""
    p = []
    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(hx, hy + hr * 0.14, hr * 1.34, hr * 1.28, 26, 0.17, 0.5)}"/>')
    # ears: small, blunt, and set wide
    p.append(f'<path class="m-fur-fill" '
             f'd="{ear(hx - hr * 0.82, hy - hr * 1.26, hx - hr * 1.02, hy - hr * 0.42, hx - hr * 0.2, hy - hr * 0.92)}"/>')
    p.append(f'<path class="m-fur-fill" '
             f'd="{ear(hx + hr * 0.82, hy - hr * 1.26, hx + hr * 0.2, hy - hr * 0.92, hx + hr * 1.02, hy - hr * 0.42)}"/>')
    p.append(f'<path class="m-tuft" '
             f'd="{ear(hx - hr * 0.78, hy - hr * 1.02, hx - hr * 0.88, hy - hr * 0.5, hx - hr * 0.34, hy - hr * 0.84)}"/>')
    p.append(f'<path class="m-tuft" '
             f'd="{ear(hx + hr * 0.78, hy - hr * 1.02, hx + hr * 0.34, hy - hr * 0.84, hx + hr * 0.88, hy - hr * 0.5)}"/>')
    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(hx, hy, hr, hr * 0.96, 22, 0.07, 0.3)}"/>')
    p += face(hx, hy, hr, shut)
    return p


# ── the poses ───────────────────────────────────────────────────────────────
def build_awake() -> str:
    """Sitting up, face to the viewer. Used for waiting and for chasing."""
    HX, HY, HR = 130, 58, 30
    p = []

    # The spine starts well inside the body so the plume's closing edge is
    # buried, and tapers to almost nothing at the tip so it ends in a point
    # rather than a flat cap.
    p.append('<g class="m-tail">')
    p.append(f'<path class="m-fur" '
             f'd="{plume([(74, 100), (52, 94), (32, 82), (23, 62), (26, 42), (34, 30), (40, 22)], [8, 15, 19, 20, 16, 10, 4])}"/>')
    p.append('</g>')

    BODY_CY, BODY_RY = 84, 29
    foot = BODY_CY + BODY_RY - 3
    for cls, lx, ly in (("m-leg m-leg-a", 112, foot), ("m-leg m-leg-b", 95, foot + 2),
                        ("m-leg m-leg-c", 76, foot + 2), ("m-leg m-leg-d", 59, foot)):
        p.append(f'<g class="{cls}">'
                 f'<path class="m-fur" d="M{lx},{ly - 10} L{lx},{ly + 2}" '
                 f'stroke-width="13" stroke-linecap="round"/>'
                 f'{paw(lx, ly + 5, 8.5, 5.2, 3, up=1)}</g>')

    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(86, BODY_CY, 45, BODY_RY, 22, 0.11)}"/>')
    p += head(HX, HY, HR)
    p.append(whiskers(HX, HY, HR))

    return svg("marcy-run", p)


def build_sleeping() -> str:
    """Curled into a loaf with her tail round her and her eyes shut.

    One continuous furry outline: the loaf, then the tail laid over its front,
    then the head resting on top. Nothing is closed with a straight edge, so
    there is no cut anywhere in the silhouette.
    """
    HX, HY, HR = 72, 76, 28
    p = []

    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(108, 92, 62, 30, 26, 0.12)}"/>')
    # tail over the front of the loaf, curling round to her chin
    p.append(f'<path class="m-fur" '
             f'd="{plume([(172, 100), (154, 118), (124, 126), (92, 126), (68, 118), (54, 104), (48, 94)], [8, 14, 16, 15, 12, 8, 4])}"/>')
    # No paws. A cat in a loaf has them folded away underneath, and drawing
    # them here put black pads on a black body - all that showed was the scored
    # splits between the toes, floating on her belly like scratches.

    p += head(HX, HY, HR, shut=True)
    p.append(whiskers(HX, HY, HR))

    p.append('<g class="m-zzz">'
             '<path d="M126,44 L142,44 L126,62 L142,62"/>'
             '<path d="M148,22 L160,22 L148,36 L160,36"/>'
             '</g>')
    return svg("marcy-sleep", p)


def build_banana() -> str:
    """A banana: a fat crescent with a stalk at one end and a dark tip at the
    other. The old one was a thin sliver and read as a melon rind."""
    p = [
        # body, thickest in the middle and tapering to both ends
        '<path class="m-banana" d="'
        'M10,10 C9,25 18,36 32,38 C43,39 51,34 55,26 '
        'C49,31 41,33 33,32 C21,30 14,22 14,8 Z"/>',
        # the inner curve catches the light
        '<path class="m-banana-line" d="M17,13 C19,24 26,30 36,31"/>',
        # stalk
        '<path class="m-banana-stem" d="M12,9 L10,2"/>',
        # dried tip
        '<circle class="m-banana-tip" cx="55" cy="26" r="2.6"/>',
    ]
    return (f'<svg class="banana-fly" viewBox="0 0 64 44" '
            f'xmlns="http://www.w3.org/2000/svg">{"".join(p)}</svg>')


def svg(cls, body):
    return (f'<svg class="{cls}" viewBox="0 0 {W} {H}" '
            f'xmlns="http://www.w3.org/2000/svg">{"".join(body)}</svg>')


if __name__ == "__main__":
    for name, markup in (("marcy-run.svg", build_awake()),
                         ("marcy-sleep.svg", build_sleeping()),
                         ("banana.svg", build_banana())):
        path = os.path.abspath(os.path.join(SRC, name))
        with open(path, "w", encoding="utf-8") as f:
            f.write(markup)
        print(f"wrote {name}  {len(markup)} bytes")
