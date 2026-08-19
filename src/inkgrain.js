/*
 * The background: wood-grain contours drawn like tattoo linework, over an aged
 * page.
 *
 * This is a port of grain-and-ink-background.html, which is the look we are
 * after. Two knots, each throwing off a stack of concentric rings; the rings
 * are stretched along one axis and rotated, so they read as the grain of a
 * plank rather than as a dartboard. A layered-sine wobble pushes every point
 * off true, a few rings run heavy and the rest hairline, and some are broken
 * as if the ink skipped.
 *
 * It is SVG, not canvas, and that is the whole point:
 *
 *   - the ragged edge comes from one feDisplacementMap over the group. Applied
 *     to a full-page canvas the same filter took so long the page could not be
 *     screenshotted; over ~50 paths it is free.
 *   - the lines draw themselves on with stroke-dashoffset, in CSS, which is
 *     what the reference does and what canvas cannot do without re-compositing
 *     the whole layer every frame.
 *
 * The viewBox is a fixed design space sliced to the viewport, so the drawing is
 * resolution-independent and never needs repainting on resize.
 */

const NS = 'http://www.w3.org/2000/svg';
const W = 1400;
const H = 900;

export function installInkGrain(svg, opts = {}) {
  const ink = opts.ink || '#171410';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  // Seeded, so a reload grows a slightly different tree but the page is stable
  // while you are on it.
  let seed = opts.seed ?? ((Math.random() * 1e9) | 0);
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  // cheap layered-sine noise, in place of a real gradient noise
  const freqs = Array.from({ length: 5 }, () => ({
    a: rnd() * 6.283,
    k: 1 + ((rnd() * 4) | 0),
    k2: 1 + ((rnd() * 3) | 0),
  }));
  const noise = (t, r) =>
    freqs.reduce(
      (s, f, i) => s + Math.sin(t * f.k + f.a + r * 0.012 * f.k2) * (1 / (i + 1)),
      0,
    ) / 2.3;

  const g = document.createElementNS(NS, 'g');
  g.setAttribute('filter', 'url(#roughInk)');
  g.setAttribute('fill', 'none');
  g.setAttribute('stroke', ink);
  g.setAttribute('stroke-linecap', 'round');
  g.setAttribute('stroke-linejoin', 'round');

  // One big knot off towards the left with rings sweeping across like a plank,
  // and a smaller eye to the right - the two-centre arrangement is what stops
  // it reading as a single target.
  const knots = [
    { cx: W * (0.15 + rnd() * 0.2), cy: H * (0.3 + rnd() * 0.4),
      rings: 34, gap: 26, stretch: 1.9, rot: -0.35 + rnd() * 0.7 },
    { cx: W * (0.72 + rnd() * 0.15), cy: H * (0.55 + rnd() * 0.35),
      rings: 16, gap: 22, stretch: 1.25, rot: 0.5 + rnd() * 0.6 },
  ];

  let idx = 0;
  for (const kn of knots) {
    for (let i = 1; i <= kn.rings; i++) {
      const base = i * kn.gap * (1 + i * 0.012);
      const steps = 180;
      const pts = [];
      for (let s = 0; s <= steps; s++) {
        const t = (s / steps) * Math.PI * 2;
        const r = base + noise(t, base) * (18 + i * 2.2);
        const x = Math.cos(t) * r * kn.stretch;
        const y = Math.sin(t) * r;
        const cs = Math.cos(kn.rot);
        const sn = Math.sin(kn.rot);
        pts.push([kn.cx + x * cs - y * sn, kn.cy + x * sn + y * cs]);
      }

      let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
      for (let s = 1; s < pts.length - 1; s++) {
        const [x0, y0] = pts[s];
        const [x1, y1] = pts[s + 1];
        d += `Q${x0.toFixed(1)},${y0.toFixed(1)} ` +
             `${((x0 + x1) / 2).toFixed(1)},${((y0 + y1) / 2).toFixed(1)}`;
      }
      d += 'Z';

      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);

      // the rhythm of the tattoo: every fourth or fifth ring runs heavy, the
      // rest are hairlines, and a few are barely there at all
      const heavy = i % 5 === 0 || i % 7 === 3;
      const width = heavy
        ? 5 + rnd() * 6
        : rnd() < 0.3 ? 0.6 : 1.4 + rnd() * 1.2;
      p.setAttribute('stroke-width', width.toFixed(2));

      // pathLength normalises every ring to 1 so one dash rule fits them all
      p.setAttribute('pathLength', '1');
      p.style.setProperty('--i', idx++);

      // an occasional broken ring, as if the ink skipped
      if (!heavy && rnd() < 0.28) {
        p.setAttribute(
          'stroke-dasharray',
          `${(0.3 + rnd() * 0.5).toFixed(2)} ${(0.02 + rnd() * 0.08).toFixed(2)}`,
        );
        p.classList.add('is-broken');
      }
      g.appendChild(p);
    }
  }

  svg.replaceChildren(g);
  return { count: idx };
}
