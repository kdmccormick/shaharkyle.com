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
 * The figures are ours. They are deliberately unlabelled: working out what
 * each one is meant to be is the point.
 *
 * Each is defined in its own unit square - x and y both 0..1 - with a list of
 * stars and a list of edges indexing into them, so a figure can be dropped
 * anywhere at any size without rewriting its geometry. `bright` lists the
 * stars that carry a flare; those are the ones that twinkle.
 */

const FIGURES = {
  zebrafish: {
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

  // a snare seen from above the rim, sticks crossed over the head
  drum: {
    stars: [
      [0.08, 0.50], [0.28, 0.40], [0.72, 0.40],       // 0..2 head, back edge
      [0.92, 0.50], [0.72, 0.60], [0.28, 0.60],       // 3..5 head, front edge
      [0.10, 0.72], [0.30, 0.84],                     // 6,7 shell, left and front
      [0.70, 0.84], [0.90, 0.72],                     // 8,9 shell, front and right
      [0.14, 0.10], [0.62, 0.45],                     // 10,11 one stick
      [0.86, 0.10], [0.38, 0.45],                     // 12,13 the other
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],   // the head
      [0, 6], [3, 9],                                   // down the sides
      [6, 7], [7, 8], [8, 9],                           // round the shell
      [10, 11], [12, 13],                               // the sticks, crossed
    ],
    bright: [8, 10, 12],
  },

  headphones: {
    stars: [
      [0.16, 0.26], [0.34, 0.10], [0.50, 0.06],       // 0..2 band
      [0.66, 0.10], [0.84, 0.26],                     // 3,4 band
      [0.10, 0.44], [0.04, 0.58], [0.11, 0.77],       // 5..7 left cup
      [0.25, 0.79], [0.30, 0.60],                     // 8,9 left cup
      [0.90, 0.44], [0.96, 0.58], [0.89, 0.77],       // 10..12 right cup
      [0.75, 0.79], [0.70, 0.60],                     // 13,14 right cup
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 4],                   // the headband
      [0, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 5],   // left earcup
      [4, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 10],
    ],
    bright: [2, 7, 12],
  },

  heart: {
    stars: [
      [0.50, 0.26],                                   // 0 the dip
      [0.32, 0.08], [0.12, 0.20], [0.06, 0.44],       // 1..3 left lobe
      [0.28, 0.72], [0.50, 0.94],                     // 4,5 down to the point
      [0.72, 0.72], [0.94, 0.44],                     // 6,7 back up the right
      [0.88, 0.20], [0.68, 0.08],                     // 8,9 right lobe
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
      [5, 6], [6, 7], [7, 8], [8, 9], [9, 0],
    ],
    bright: [0, 5],
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

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

const ORDER = ['zebrafish', 'neuron', 'bicycle', 'coffee', 'drum', 'headphones'];

/*
 * Decide where the figures go, before anything is drawn.
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

  const out = [];

  // Content blocks to keep off, plus every figure already placed.
  const hits = (cx, cy) => {
    const r = size * 0.62;
    if (avoid.some((a) =>
      cx + r > a.x && cx - r < a.x + a.w && cy + r > a.y && cy - r < a.y + a.h)) return true;
    return out.some((o) =>
      Math.abs(o.cx - cx) < size * 1.05 && Math.abs(o.cy - cy) < size * 1.05);
  };

  /*
   * Walk up and down from the ideal height looking for a gap. Full-bleed
   * blocks - the photo strip especially - leave no margin at all at their
   * height, so a figure placed there ends up hidden behind them. Give up on
   * the figure rather than draw it somewhere it cannot be seen.
   */
  const place = (name, cx, ideal) => {
    for (let step = 0; step <= 26; step++) {
      for (const dir of step === 0 ? [0] : [-1, 1]) {
        const cy = ideal + dir * step * (h * 0.012);
        if (cy > size * 0.6 && cy < h - size * 0.6 && !hits(cx, cy)) {
          out.push({ name, cx, cy, size });
          return;
        }
      }
    }
  };

  // The heart is pinned to the top right; the rest fall in around it.
  place('heart', w - margin * 0.5, size * 0.75);

  const span = 0.86 / ORDER.length;
  ORDER.forEach((name, i) => {
    const cx = i % 2 === 0 ? margin * 0.5 : w - margin * 0.5;
    place(name, cx, h * (0.08 + span * (i + 0.5)) + (rand() - 0.5) * h * 0.03);
  });

  return out;
}

/*
 * Draw the chart: loose stars everywhere, then the figures in their windows.
 * Runs after the grain and after the clearings have been punched, so the
 * figures land on clean paper and read at full strength.
 *
 * Everything here is painted once and left alone. The four-point flares on the
 * brighter stars are the exception - they twinkle - so they are not drawn:
 * their positions are returned instead, for the twinkle layer to animate on a
 * canvas of its own. Repainting this one every frame would mean re-running the
 * marching squares over the whole page sixty times a second.
 */
export function drawSky(ctx, w, h, placements, opts = {}) {
  const rand = mulberry32((opts.seed ?? 987654321) ^ 0x1234);
  const ink = opts.ink ?? '#14110f';
  const alpha = opts.alpha ?? 0.5;

  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;

  const flares = [];

  // ── loose stars everywhere ────────────────────────────────────────────
  ctx.globalAlpha = alpha * 0.5;
  const n = Math.round((w * h) / 6500);
  for (let i = 0; i < n; i++) {
    const u = rand();
    dot(ctx, rand() * w, rand() * h, u > 0.94 ? 1.7 : u > 0.72 ? 1.1 : 0.7);
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
      dot(ctx, sx, sy, isBright ? 3.1 : 2.0);
      if (isBright) flares.push({ x: sx, y: sy, r: 3.1 });
    });
  }

  ctx.restore();
  return flares;
}
