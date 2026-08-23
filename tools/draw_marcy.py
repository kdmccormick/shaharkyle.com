"""Draw Marcy, and her banana.

Marcy is a semi-longhaired cat who photographs as black but is really a very
dark warm brown, and the sun finds the brown in her.

The rule that matters most, arrived at the hard way: **she is four components -
a torso, a head, a tail and legs.** Nothing else. Earlier versions gave her a
ruff and a haunch as shapes of their own, and both were mistakes. A ruff hung
under the chin can only be an enormous jaw (too high), an enormous chest (about
right) or a pompom she is holding (too low); there is no good position, because
it should never have been a shape. A separate haunch always poked up above the
line of her back and gave her two summits.

So:

  - the ruff is a *swelling of the head outline at the lower sides* - jowls -
    which is where a long-haired cat's ruff actually lives. Her long silver
    guard hairs grow out of that same edge.
  - the heavy rear is a *swelling of the torso outline*, so there is one back
    line and one body under it.
  - the head simply overlaps the torso. Nothing bridges them, because on a cat
    nothing does.

The rest of what makes her recognisable, from the photographs in marcy/:

  - a small blunt snout. Cats are wide at the cheek and pull in hard to a
    little muzzle; drawn as an oval the lower face becomes all chin.
  - narrow gold-green eyes, close together, the inner corner dropped so the
    upper lid slants down towards the nose. That slant is her expression.
    Round eyes turn her into a kitten, which she is not.
  - small, neat, rounded ears set wide, with pale fur escaping them. Not tall
    spikes: those read as a fox.
  - the cream blaze on her chest. Kept fine and shaded - layered from a dark
    underfur out to a small pale core - so it sits *in* the coat rather than
    on it. A solid white patch reads as a sticker.
  - brown lights along the back, the haunch and the top of the tail.
  - an enormous plumed tail, drawn a shade lighter than the torso so the two
    never fuse into a single hump.

Writes four files into src/, which the page inlines so CSS can animate parts of
them: the sleeping loaf, the cannonball she waits in, the standing pose she
chases in, and the banana. Regenerate with:

    uv run --with numpy python tools/draw_marcy.py
"""
from __future__ import annotations

import math
import os

import numpy as np

SRC = os.path.join(os.path.dirname(__file__), "..", "src")
SEED = 20270605
rng = np.random.default_rng(SEED)

W, H = 210, 168

# The two settled dials. RUFF is how far the head outline swells at the jowls;
# NARROW is how hard it pulls in to the chin.
RUFF = 0.58
NARROW = 0.35


# ── fur ─────────────────────────────────────────────────────────────────────
def furry_ring(cx, cy, rx, ry, tips=34, depth=0.10, jitter=0.45, lean=0.62,
               rot=0.0, warp=None):
    """A closed loop edged with pointed fur tufts.

    Each segment runs out to a *point* and back, rather than bulging on a
    single rounded quadratic. Round bulges are what made her look like a
    cloud; long fur ends in tips.

    `lean` swings every tip round by a fraction of a segment, so the whole coat
    sweeps one way instead of radiating evenly - which is the other half of
    reading as fur rather than as a doily.

    `warp` is a function of the angle returning a multiplier on the radius, for
    shapes that are not ellipses - the skull that is wide at the cheeks and
    narrows to a small chin, the torso that swells over the haunch. Without it
    every shape is an oval, and a cat built out of ovals has no jaw.
    """
    w = warp or (lambda a: 1.0)

    def px(a, g=1.0):
        k = w(a) * g
        return cx + rx * k * math.cos(a), cy + ry * k * math.sin(a)

    step = 2 * math.pi / tips
    base = []
    for i in range(tips):
        a = rot + step * i
        x, y = px(a)
        base.append((x, y, a))

    d = [f"M{base[0][0]:.1f},{base[0][1]:.1f}"]
    for i in range(tips):
        _, _, a0 = base[i]
        x1, y1, _ = base[(i + 1) % tips]
        am = a0 + step / 2
        grow = 1 + depth * (1 + jitter * rng.uniform(-1, 1))
        at = am + lean * step * 0.5                    # the tip leans over

        tx, ty = px(at, grow)
        # controls sit just off the base ring, so the tuft rises steeply from
        # the coat and comes to a point rather than arcing over
        c1x, c1y = px(a0 + step * 0.30, 1 + depth * 0.30)
        c2x, c2y = px(a0 + step * 0.86, 1 + depth * 0.12)

        d.append(f"Q{c1x:.1f},{c1y:.1f} {tx:.1f},{ty:.1f}")
        d.append(f"Q{c2x:.1f},{c2y:.1f} {x1:.1f},{y1:.1f}")
    d.append("Z")
    return " ".join(d)


def lit_arc(cx, cy, rx, ry, a0, a1, inset=0.16, steps=64, warp=None):
    """A crescent of sunlit coat along part of an outline.

    The outer edge follows the shape it sits on; the inner edge runs in fingers
    the depth of the coat, so the light gets *into* the fur instead of being a
    stripe painted along her back. A smooth inner edge is what made an earlier
    version look like she had been dragged through mud.

    Drawn inside the silhouette, so it never spills past her.
    """
    wf = warp or (lambda a: 1.0)
    pts_out, pts_in = [], []
    for i in range(steps + 1):
        t = i / steps
        a = a0 + (a1 - a0) * t
        k0 = wf(a)
        # fade the band away at both ends, or it stops with a blunt edge
        taper = math.sin(math.pi * t) ** 0.7
        # two beats: slow, for where the light pools, and fast, for the fur
        fingers = 0.55 + 0.45 * math.sin(a * 17.0 + 0.7)
        pool = 0.6 + 0.4 * math.sin(a * 3.1 + 2.2)
        k = inset * taper * fingers * pool
        pts_out.append((cx + rx * k0 * 0.995 * math.cos(a),
                        cy + ry * k0 * 0.995 * math.sin(a)))
        pts_in.append((cx + rx * k0 * (1 - k) * math.cos(a),
                       cy + ry * k0 * (1 - k) * math.sin(a)))

    d = [f"M{pts_out[0][0]:.1f},{pts_out[0][1]:.1f}"]
    d += [f"L{x:.1f},{y:.1f}" for x, y in pts_out[1:]]
    d += [f"L{x:.1f},{y:.1f}" for x, y in reversed(pts_in)]
    d.append("Z")
    return " ".join(d)


def guard_hairs(cx, cy, rx, ry, a0, a1, n=10, length=0.13, w=0.85, warp=None):
    """The long silver hairs that spray out of her jowls.

    Thin strokes rather than filled tufts: they are single hairs catching the
    light, and at this size a filled one becomes a spike. Sparse, too - a full
    fringe turns her head into a dandelion clock.
    """
    wf = warp or (lambda a: 1.0)
    d = []
    for i in range(n):
        t = (i + rng.uniform(0.15, 0.85)) / n
        a = a0 + (a1 - a0) * t
        k = wf(a)                       # follow the outline they grow out of
        L = k * (1 + length * rng.uniform(0.45, 1.0))
        x0, y0 = cx + rx * k * 0.94 * math.cos(a), cy + ry * k * 0.94 * math.sin(a)
        x1, y1 = cx + rx * L * math.cos(a), cy + ry * L * math.sin(a)
        # bow each hair slightly, and let them lean the way the coat sweeps
        bend = rng.uniform(-0.16, 0.16)
        mx = (x0 + x1) / 2 - (y1 - y0) * bend
        my = (y0 + y1) / 2 + (x1 - x0) * bend
        d.append(f'<path d="M{x0:.1f},{y0:.1f} Q{mx:.1f},{my:.1f} {x1:.1f},{y1:.1f}" '
                 f'stroke-width="{w * rng.uniform(0.7, 1.25):.2f}"/>')
    return f'<g class="m-guard">{"".join(d)}</g>'


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


def plume(spine, widths, tips=15, depth=0.26):
    """A tapered furry tail.

    The far end is closed with a curve round the tip, not a straight line
    between the two edges. That straight line left a hard vertical cut down the
    side of the sleeping loaf - it read as if she had been trimmed out with
    scissors.
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


def plume_lit(spine, widths, side=1, inset=0.30, steps=48):
    """A band of sun along one edge of the tail, inside its outline.

    Broken into fingers the same way as `lit_arc`, and kept to a fraction of
    the tail's width - the tail is the biggest shape on her, and a wide smooth
    band down it reads as a second, brown tail lying on the first.
    """
    t = np.linspace(0, 1, len(spine))
    ts = np.linspace(0, 1, steps)
    xs = np.interp(ts, t, [p[0] for p in spine])
    ys = np.interp(ts, t, [p[1] for p in spine])
    hw = np.interp(ts, np.linspace(0, 1, len(widths)), widths)

    dx, dy = np.gradient(xs), np.gradient(ys)
    ln = np.hypot(dx, dy)
    ln[ln == 0] = 1
    nx, ny = -dy / ln, dx / ln

    outer, inner = [], []
    for i in range(steps):
        u = i / (steps - 1)
        taper = math.sin(math.pi * u) ** 0.7
        fingers = 0.5 + 0.5 * math.sin(u * 46.0 + 0.4)
        outer.append((xs[i] + side * nx[i] * hw[i] * 0.96,
                      ys[i] + side * ny[i] * hw[i] * 0.96))
        k = hw[i] * (0.96 - inset * taper * fingers)
        inner.append((xs[i] + side * nx[i] * k, ys[i] + side * ny[i] * k))

    d = [f"M{outer[0][0]:.1f},{outer[0][1]:.1f}"]
    d += [f"L{x:.1f},{y:.1f}" for x, y in outer[1:]]
    d += [f"L{x:.1f},{y:.1f}" for x, y in reversed(inner)]
    d.append("Z")
    return " ".join(d)


def tuft(cx, cy, n=6, length=15, spread=1.5, angle=math.pi / 2, w=2.4):
    """A fan of tapering strands - the blaze on her chest, the fuzz in her ears."""
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


# ── the torso ───────────────────────────────────────────────────────────────
def torso_warp(swell=0.18, rear=math.pi):
    """One mass, heavier towards the rear.

    Replaces the separate haunch. A second blob for the back end gave her two
    summits; a swell on the one outline gives her a heavy rear under a single
    back line, which is what a cat has.
    """
    def w(a):
        return 1 + swell * max(0.0, math.cos(a - rear)) ** 1.4
    return w


# ── the head ────────────────────────────────────────────────────────────────
def skull_warp(narrow=NARROW, ruff=RUFF):
    """Wide at the cheeks, fuller still at the jowls, narrowing to a small chin.

    The `ruff` term is where her mane lives: a swelling of the head outline
    down at the lower sides. It falls away to nothing at the chin, so the
    muzzle still comes to a point.

    In SVG angles +y is down, so sin(a) > 0 is the lower half of the head.
    """
    def w(a):
        down = max(0.0, math.sin(a))
        side = abs(math.cos(a))
        return 1 - narrow * down ** 2.2 + 0.08 * side + ruff * down * side
    return w


def ear(tipx, tipy, ax, ay, bx, by, round_=0.55):
    """A small ear with a rounded tip, seated on the skull.

    Hers are neat and blunt. Drawn as a sharp triangle they read as a fox's.
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


def eye(cx, cy, rx, ry, sx=1, slant=0.30):
    """A narrow almond eye, with the inner corner dropped.

    `sx` is which side of the face this eye is on: +1 for the viewer's right,
    -1 for the left. The corner nearest the nose sits lower than the outer one,
    which gives her the faintly concerned look she actually has. Fully round
    reads as a kitten; a hard slant reads as a villain.
    """
    ix, iy = cx - sx * rx, cy + ry * slant          # inner corner, dropped
    ox, oy = cx + sx * rx, cy - ry * slant          # outer corner, lifted
    return (
        f"M{ix:.1f},{iy:.1f} "
        f"C{ix + sx * rx * 0.45:.1f},{iy - ry * 1.35:.1f} "
        f"{ox - sx * rx * 0.32:.1f},{oy - ry * 1.15:.1f} {ox:.1f},{oy:.1f} "
        f"C{ox - sx * rx * 0.34:.1f},{oy + ry * 1.18:.1f} "
        f"{ix + sx * rx * 0.46:.1f},{iy + ry * 1.02:.1f} {ix:.1f},{iy:.1f} Z"
    )


def shut_eye(cx, cy, r=9, sx=1):
    """A closed eye: a shallow lash line, following the same slant as the open
    one so she does not change face when she falls asleep."""
    return (f"M{cx - sx * r:.1f},{cy + r * 0.22:.1f} "
            f"Q{cx:.1f},{cy + r * 0.86:.1f} {cx + sx * r:.1f},{cy - r * 0.2:.1f}")


def muzzle(hx, hy, hr):
    """The snout: two whisker pads, a shade off the coat.

    Just the pads. An earlier version added a third lobe below them for the
    chin, and on a black cat that reads as a goatee.
    """
    py = hy + hr * 0.40
    return "".join(
        f'<ellipse class="m-muzzle" cx="{hx + sx * hr * 0.17:.1f}" '
        f'cy="{py:.1f}" rx="{hr * 0.20:.1f}" ry="{hr * 0.155:.1f}"/>'
        for sx in (-1, 1))


def face(hx, hy, hr, shut=False):
    """Eyes, muzzle, nose, mouth. Shared by every pose so she cannot drift into
    being three different cats. The muzzle goes down before the nose so the
    nose sits on it rather than floating on the coat."""
    p = []
    ex = hr * 0.44          # eyes sit close together, well inside the skull
    ey = hy - hr * 0.10
    er = hr * 0.32

    for sx in (-1, 1):
        cx = hx + sx * ex
        if shut:
            p.append(f'<path class="m-shut" d="{shut_eye(cx, ey, er, sx)}"/>')
            continue
        p.append(f'<path class="m-eye" d="{eye(cx, ey, er, er * 0.72, sx)}"/>')
        p.append(f'<ellipse class="m-pupil" cx="{cx:.1f}" cy="{ey + er * 0.05:.1f}" '
                 f'rx="{er * 0.27:.1f}" ry="{er * 0.56:.1f}"/>')
        p.append(f'<circle class="m-glint" cx="{cx - sx * er * 0.30:.1f}" '
                 f'cy="{ey - er * 0.30:.1f}" r="{er * 0.15:.1f}"/>')

    p.append(muzzle(hx, hy, hr))

    ny = hy + hr * 0.30
    p.append(f'<path class="m-nose" d="M{hx - 3.4:.1f},{ny:.1f} '
             f'q3.4,-1.8 6.8,0 q-3.4,4.0 -6.8,0 Z"/>')
    p.append(f'<path class="m-mouth" d="M{hx:.1f},{ny + 2.8:.1f} '
             f'c-2.3,2.8 -5.4,2.6 -6.6,-.4 M{hx:.1f},{ny + 2.8:.1f} '
             f'c2.3,2.8 5.4,2.6 6.6,-.4"/>')
    return p


def whiskers(hx, hy, hr):
    """Off the whisker pads, not off the middle of her face."""
    ny = hy + hr * 0.40
    reach = hr * 1.46
    d = []
    for k, dy in enumerate((-2.8, 0.4, 3.6)):
        drop = -3 + k * 4.0                # they fan down as they go out
        for sx in (-1, 1):
            d.append(f'<path d="M{hx + sx * hr * 0.30:.1f},{ny + dy:.1f} '
                     f'Q{hx + sx * reach * 0.55:.1f},{ny + dy + drop * 0.35:.1f} '
                     f'{hx + sx * reach:.1f},{ny + dy + drop:.1f}"/>')
    return f'<g class="m-whisk">{"".join(d)}</g>'


def head(hx, hy, hr, shut=False, floof=1.0):
    """One fluffy mass with ears on it and a face in it. No collar, no neck.

    Sits straight on top of the torso and overlaps it; nothing joins them.
    """
    warp = skull_warp()
    p = []

    # ears: small, blunt, set wide, with pale fur escaping them
    p.append(f'<path class="m-fur-fill" '
             f'd="{ear(hx - hr * .84, hy - hr * 1.34, hx - hr * 1.04, hy - hr * .44, hx - hr * .20, hy - hr * .98)}"/>')
    p.append(f'<path class="m-fur-fill" '
             f'd="{ear(hx + hr * .84, hy - hr * 1.34, hx + hr * .20, hy - hr * .98, hx + hr * 1.04, hy - hr * .44)}"/>')
    p.append(f'<path class="m-tuft" '
             f'd="{ear(hx - hr * .80, hy - hr * 1.08, hx - hr * .90, hy - hr * .52, hx - hr * .34, hy - hr * .90)}"/>')
    p.append(f'<path class="m-tuft" '
             f'd="{ear(hx + hr * .80, hy - hr * 1.08, hx + hr * .34, hy - hr * .90, hx + hr * .90, hy - hr * .52)}"/>')
    p.append(f'<path class="m-fuzz" d="{tuft(hx - hr * .70, hy - hr * .84, 4, hr * .32, 1.1, -2.5, w=1.4)}"/>')
    p.append(f'<path class="m-fuzz" d="{tuft(hx + hr * .70, hy - hr * .84, 4, hr * .32, 1.1, -0.7, w=1.4)}"/>')

    # the head itself - jowls and all
    p.append(f'<path class="m-fur-fill" '
             f'd="{furry_ring(hx, hy, hr, hr * 1.02, 30, .10 * floof, .45, .45, warp=warp)}"/>')
    # her long silver hairs, growing out of the jowls where the ruff is
    p.append(guard_hairs(hx, hy, hr, hr * 1.02, .45, math.pi - .45, 10,
                         .13 * floof, .85, warp=warp))

    p += face(hx, hy, hr, shut)
    return p


def blaze(hx, hy, hr, dx=-0.14, dy=0.98, scale=1.0):
    """The cream spray on her chest.

    In the photographs this is *big* - a fan of long pale hairs starting under
    the chin and spreading down and out across a good third of her chest,
    brightest up the middle and feathering into black at the edges. It is the
    only pale marking on her and it is not subtle.

    So: three fans of long strands, dark to pale, each shorter and narrower
    than the last. The layering is what integrates it - the dark underfur shows
    between the pale strands, the way it does on her, instead of the whole
    thing being one solid patch pressed onto a black cat.

    It is a marking, not a body part, so it has to land on the torso: pulled
    back towards the body rather than sitting straight below the chin, or on a
    side-on pose it floats in the air off her front.
    """
    bx, by = hx + hr * dx, hy + hr * dy
    s = hr * scale

    # Each layer grows from several roots spread along a short arc, not from one
    # point. A single origin fans out as a starburst; hers hangs like a curtain,
    # widest at the bottom, because the hairs start across the whole width of
    # the patch and all fall the same way.
    out = []
    for cls, roots, half, length, spread, w in (
            ("m-blaze-under", 5, .40, .86, 1.35, 2.3),
            ("m-blaze-mid",   4, .28, .64, 1.15, 1.8),
            ("m-blaze",       3, .17, .46, 0.95, 1.4)):
        d = []
        for i in range(roots):
            f = (i - (roots - 1) / 2) / max(1, roots - 1)      # -0.5 .. 0.5
            ox = bx + f * s * half * 2
            oy = by - abs(f) * s * .05          # the roots arch up at the edges
            L = s * length * (1 - .30 * abs(f) * 2)   # and their hair is shorter
            d.append(tuft(ox, oy, 4, L, spread, w=w))
        out.append(f'<path class="{cls}" d="{" ".join(d)}"/>')
    return "".join(out)


# ── the poses ───────────────────────────────────────────────────────────────
def build_waiting() -> str:
    """The cannonball: nearly spherical, head sunk into the coat, tail wrapped
    round the base, only the toes showing. This is her at rest, waiting for
    someone to throw the banana."""
    rng_reset()
    F = 1.45
    HX, HY, HR = 128, 64, 30
    p = []

    T = [(72, 144), (46, 148), (28, 136), (24, 114), (34, 96), (46, 86)]
    TW = [6, 13, 16, 15, 11, 4]
    p.append('<g class="m-tail">')
    p.append(f'<path class="m-fur-tail" d="{plume(T, TW, 15, .26 * F)}"/>')
    p.append(f'<path class="m-lit" d="{plume_lit(T, TW, side=-1)}"/>')
    p.append('</g>')

    p.append(f'<path class="m-fur-fill" d="{furry_ring(94, 112, 48, 44, 40, .11 * F)}"/>')
    p.append(f'<path class="m-lit" d="{lit_arc(94, 112, 48, 44, -math.pi, -math.pi * .32, .24)}"/>')

    for lx in (84, 108):
        p.append(f'<g class="m-leg">{paw(lx, 154, 9, 5, 3, up=1)}</g>')

    p += head(HX, HY, HR, floof=F)
    p.append(blaze(HX, HY, HR))
    p.append(whiskers(HX, HY, HR))

    return svg("marcy-wait", p)


def build_running() -> str:
    """On her feet, tail high and clear of her back.

    The legs are evenly spaced rather than staggered: the stagger reads as a
    stride in a still drawing, but it fights the CSS that lifts the paws in
    turn, and the animation is what has to sell the trot here.
    """
    rng_reset()
    F = 1.3
    # Sunk down into the shoulders, and pulled back from the very front of the
    # torso. At (134, 68) her chin cleared the torso by a good ten pixels and
    # she read as a head floating above a body: out at that end the torso has
    # already curved away, so there was nothing under her. Here the chin lands
    # just inside the outline and the two masses actually meet.
    HX, HY, HR = 128, 76, 27
    p = []

    T = [(44, 110), (28, 102), (20, 86), (20, 64), (28, 44), (38, 30)]
    TW = [7, 12, 15, 15, 11, 4]
    p.append('<g class="m-tail">')
    p.append(f'<path class="m-fur-tail" d="{plume(T, TW, 15, .26 * F)}"/>')
    p.append(f'<path class="m-lit" d="{plume_lit(T, TW, side=1)}"/>')
    p.append('</g>')

    warp = torso_warp(.18)
    p.append(f'<path class="m-fur-fill" d="{furry_ring(90, 110, 48, 28, 36, .10 * F, warp=warp)}"/>')
    p.append(f'<path class="m-lit" '
             f'd="{lit_arc(90, 110, 48, 28, -math.pi * .92, -math.pi * .12, .22, warp=warp)}"/>')

    for cls, lx, dy in (("m-leg-a", 122, 0), ("m-leg-b", 104, 2),
                        ("m-leg-c", 74, 2), ("m-leg-d", 54, 0)):
        ly = 134 + dy
        p.append(f'<g class="m-leg {cls}">'
                 f'<path class="m-fur" d="M{lx},{ly - 9} L{lx},{ly + 2}" '
                 f'stroke-width="14" stroke-linecap="round"/>'
                 f'{paw(lx, ly + 5, 8.5, 5.2, 3, up=1)}</g>')

    p += head(HX, HY, HR, floof=F)
    p.append(blaze(HX, HY, HR, -.30, 1.05))
    p.append(whiskers(HX, HY, HR))

    return svg("marcy-run", p)


def build_sleeping() -> str:
    """Curled into a loaf with her tail round her and her eyes shut.

    Same four parts, minus the legs - a cat in a loaf has them folded away
    underneath. Drawing them here put black pads on a black body and all that
    showed was the scored splits between the toes, floating on her belly.
    """
    rng_reset()
    F = 1.35
    HX, HY, HR = 62, 88, 26
    p = []

    warp = torso_warp(.14, rear=0.0)
    p.append(f'<path class="m-fur-fill" d="{furry_ring(116, 112, 56, 30, 38, .10 * F, warp=warp)}"/>')
    p.append(f'<path class="m-lit" '
             f'd="{lit_arc(116, 112, 56, 30, -math.pi * .88, -math.pi * .10, .26, warp=warp)}"/>')

    # tail over the front of the loaf, curling round towards her chin
    T = [(168, 114), (158, 136), (132, 148), (102, 150), (78, 144)]
    TW = [6, 12, 15, 13, 6]
    p.append(f'<path class="m-fur-tail" d="{plume(T, TW, 15, .26 * F)}"/>')
    p.append(f'<path class="m-lit" d="{plume_lit(T, TW, side=-1)}"/>')

    p += head(HX, HY, HR, shut=True, floof=F)
    p.append(blaze(HX, HY, HR, .32, .74, .85))
    p.append(whiskers(HX, HY, HR))

    p.append('<g class="m-zzz">'
             '<path d="M120,44 L136,44 L120,62 L136,62"/>'
             '<path d="M144,20 L156,20 L144,34 L156,34"/>'
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


def rng_reset():
    """Every pose draws from the same seed, so her coat is the same coat in all
    three rather than three different cats' worth of random tufts."""
    global rng
    rng = np.random.default_rng(SEED)


def svg(cls, body):
    return (f'<svg class="{cls}" viewBox="0 0 {W} {H}" '
            f'xmlns="http://www.w3.org/2000/svg">{"".join(body)}</svg>')


if __name__ == "__main__":
    for name, markup in (("marcy-run.svg", build_running()),
                         ("marcy-wait.svg", build_waiting()),
                         ("marcy-sleep.svg", build_sleeping()),
                         ("banana.svg", build_banana())):
        path = os.path.abspath(os.path.join(SRC, name))
        with open(path, "w", encoding="utf-8") as f:
            f.write(markup)
        print(f"wrote {name}  {len(markup)} bytes")
