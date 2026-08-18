/*
 * The star chart that shares the background with the wood grain.
 *
 * Drawn as ink on paper rather than as a literal night sky. The page is lit
 * like dawn and the flyer is graphite, so a dark sky behind it would make the
 * drawing unreadable - and giving every block an opaque card to sit on would
 * break the one idea the whole design rests on, that the graphite sits directly
 * on the page's own paper. So this is a chart *of* the night sky: filled dots
 * for stars, hairlines between them, the way one is engraved in the endpapers
 * of an old atlas. It sits beside the grain in the same ink.
 *
 * The figures are ours: a zebrafish, a neuron, a bicycle and a cup of coffee.
 *
 * Each is defined in its own unit square - x and y both 0..1 - with a list of
 * stars and a list of edges indexing into them, so a figure can be dropped
 * anywhere at any size without rewriting its geometry.
 */

const FIGURES = {
  zebrafish: {
    label: 'zebrafish',
    stars: [
      [0.03, 0.47], [0.18, 0.28], [0.42, 0.22], [0.57, 0.10],
      [0.71, 0.27], [0.86, 0.06], [1.00, 0.44], [0.86, 0.80],
      [0.71, 0.57], [0.45, 0.68], [0.19, 0.63], [0.13, 0.44],
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
      [6, 7], [7, 8], [8, 9], [9, 10], [10, 0],
    ],
    bright: [0, 3, 6, 11],
  },

  neuron: {
    label: 'neuron',
    stars: [
      [0.30, 0.50],                                   // 0 soma
      [0.14, 0.28], [0.05, 0.50], [0.16, 0.74],       // dendrites
      [0.31, 0.18], [0.34, 0.82],
      [0.50, 0.48], [0.70, 0.45], [0.86, 0.42],       // axon
      [0.98, 0.28], [1.00, 0.55], [0.92, 0.68],       // terminals
    ],
    edges: [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
      [0, 6], [6, 7], [7, 8],
      [8, 9], [8, 10], [8, 11],
    ],
    bright: [0, 8],
  },

  bicycle: {
    label: 'bicycle',
    stars: [
      [0.17, 0.74], [0.83, 0.74],                     // 0,1 hubs
      [0.45, 0.74], [0.42, 0.34], [0.68, 0.36], [0.70, 0.52],  // 2..5 frame
      // rear wheel rim
      [0.17, 0.50], [0.34, 0.60], [0.34, 0.88], [0.17, 0.98], [0.00, 0.88], [0.00, 0.60],
      // front wheel rim
      [0.83, 0.50], [1.00, 0.60], [1.00, 0.88], [0.83, 0.98], [0.66, 0.88], [0.66, 0.60],
    ],
    edges: [
      [0, 2], [2, 3], [3, 0], [2, 5], [5, 4], [4, 3], [5, 1],
      [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 6],
      [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 12],
    ],
    bright: [0, 1],
  },

  coffee: {
    label: 'coffee',
    stars: [
      [0.24, 0.36], [0.64, 0.36], [0.58, 0.74], [0.30, 0.74],  // 0..3 cup
      [0.72, 0.44], [0.80, 0.55], [0.70, 0.66],                // 4..6 handle
      [0.14, 0.86], [0.74, 0.86],                              // 7,8 saucer
      [0.36, 0.16], [0.50, 0.06], [0.60, 0.18],                // 9..11 steam
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [1, 4], [4, 5], [5, 6], [6, 2],
      [7, 8],
      [9, 10], [10, 11],
    ],
    bright: [0, 1, 10],
  },
};

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function star(ctx, x, y, r, bright) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (!bright) return;
  // the four-point flare that marks the brighter stars on an engraved chart
  ctx.save();
  ctx.lineWidth = Math.max(0.6, r * 0.34);
  ctx.beginPath();
  const s = r * 3.4;
  ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
  ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
  ctx.stroke();
  ctx.restore();
}

/*
 * Decide where the four figures go, before anything is drawn.
 *
 * They are placed in the margin beside the content column, alternating sides.
 * The caller feeds these back in as clearings in the grain field, so each
 * constellation ends up in its own window of open paper - you are looking at
 * the sky through a gap in the wood. Drawn straight over the grain instead,
 * they are simply lost in it: the lines are hairlines and the grain is dense.
 *
 * If the margin is too narrow to hold a figure legibly there is nowhere to put
 * them, so they are dropped rather than squashed over the text.
 */
export function planSky(w, h, contentWidth = 760, seed = 987654321, avoid = []) {
  const rand = mulberry32(seed);
  const margin = (w - contentWidth) / 2;
  const size = Math.min(margin * 0.78, 220);
  if (size < 104) return [];

  const hits = (cx, cy) => {
    const r = size * 0.62;
    return avoid.some((a) =>
      cx + r > a.x && cx - r < a.x + a.w && cy + r > a.y && cy - r < a.y + a.h);
  };

  const out = [];
  ['zebrafish', 'neuron', 'bicycle', 'coffee'].forEach((name, i) => {
    const cx = i % 2 === 0 ? margin * 0.5 : w - margin * 0.5;
    const ideal = h * (0.12 + 0.245 * i) + (rand() - 0.5) * h * 0.04;

    // Full-bleed blocks - the photo strip especially - leave no margin at all
    // at their height, so a figure placed there ends up behind them with only
    // its label showing. Walk up and down from the ideal spot for a gap, and
    // give up on the figure rather than draw it somewhere it cannot be seen.
    let cy = null;
    for (let step = 0; step <= 26 && cy === null; step++) {
      for (const dir of step === 0 ? [0] : [-1, 1]) {
        const t = ideal + dir * step * (h * 0.012);
        if (t > size * 0.6 && t < h - size * 0.6 && !hits(cx, t)) { cy = t; break; }
      }
    }
    if (cy !== null) out.push({ name, cx, cy, size });
  });
  return out;
}

/*
 * Draw the chart: loose stars everywhere, then the figures in their windows.
 * Runs after the grain and after the clearings have been punched, so the
 * figures land on clean paper and read at full strength.
 */
export function drawSky(ctx, w, h, placements, opts = {}) {
  const rand = mulberry32((opts.seed ?? 987654321) ^ 0x1234);
  const ink = opts.ink ?? '#14110f';
  const alpha = opts.alpha ?? 0.5;

  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;

  // ── loose stars everywhere ────────────────────────────────────────────
  ctx.globalAlpha = alpha * 0.5;
  const n = Math.round((w * h) / 6500);
  for (let i = 0; i < n; i++) {
    const u = rand();
    star(ctx, rand() * w, rand() * h,
         u > 0.94 ? 1.7 : u > 0.72 ? 1.1 : 0.7, false);
  }

  // ── the figures ───────────────────────────────────────────────────────
  for (const { name, cx, cy, size } of placements) {
    const fig = FIGURES[name];
    const x0 = cx - size / 2;
    const y0 = cy - size / 2;
    const px = (p) => [x0 + p[0] * size, y0 + p[1] * size];

    ctx.globalAlpha = alpha * 0.85;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const [a, b] of fig.edges) {
      const pa = px(fig.stars[a]);
      const pb = px(fig.stars[b]);
      ctx.moveTo(pa[0], pa[1]);
      ctx.lineTo(pb[0], pb[1]);
    }
    ctx.stroke();

    ctx.globalAlpha = Math.min(1, alpha * 1.5);
    fig.stars.forEach((p, k) => {
      const [sx, sy] = px(p);
      const isBright = fig.bright.includes(k);
      star(ctx, sx, sy, isBright ? 3.1 : 2.0, isBright);
    });

    if (opts.labels !== false) {
      ctx.globalAlpha = alpha * 0.9;
      ctx.font = '11px "Special Elite", ui-monospace, monospace';
      ctx.textAlign = 'center';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
      ctx.fillText(fig.label.toUpperCase(), cx, y0 + size + 24);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
  }

  ctx.restore();
}
