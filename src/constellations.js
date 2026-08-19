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

const ORDER = ['zebrafish', 'neuron', 'bicycle', 'coffee', 'drum', 'headphones'];

const BAND_MIN = 96;    // a band shallower than this cannot hold a figure

/*
 * The narrow-screen fallback.
 *
 * On a phone the content is the full width of the page, so the side margin
 * the figures normally live in does not exist - at 900px across it is 70px,
 * which fits a 55px figure, well under the size one needs to be readable.
 * The width above and below the content is free, though, so the whole set
 * goes into three horizontal bands instead: the heart alone at the head of
 * the page, then three between the form and the credits, then three below.
 *
 * The middle band is found rather than named - it is simply the deepest gap
 * between consecutive blocks - so nothing here knows the order of the page.
 *
 * All three bands are only there because the page is padded and the credits
 * are pushed down on narrow screens. If that spacing goes, the bands come out
 * too shallow, this returns nothing, and the chart is loose stars only.
 */
function planBands(w, h, avoid) {
  if (!avoid.length) return [];

  const boxes = [...avoid].sort((a, b) => a.y - b.y);
  const head = boxes[0].y;
  const foot = boxes.reduce((m, b) => Math.max(m, b.y + b.h), 0);

  let mid = { y0: 0, y1: 0 };
  let seen = boxes[0].y + boxes[0].h;
  for (let i = 1; i < boxes.length; i++) {
    if (boxes[i].y - seen > mid.y1 - mid.y0) mid = { y0: seen, y1: boxes[i].y };
    seen = Math.max(seen, boxes[i].y + boxes[i].h);
  }

  const out = [];
  const row = (names, y0, y1) => {
    const depth = y1 - y0;
    if (depth < BAND_MIN) return;
    // Deep enough to be worth drawing, and narrow enough that a row of them
    // still has air between - a figure spanning its whole share reads as a
    // border rather than a figure.
    const size = Math.min(depth * 0.74, (w / names.length) * 0.86, 190);
    if (size < 70) return;
    names.forEach((name, i) => {
      out.push({
        name,
        cx: (w * (i + 0.5)) / names.length,
        cy: (y0 + y1) / 2,
        size,
      });
    });
  };

  row(['heart'], 0, head);
  row(ORDER.slice(0, 3), mid.y0, mid.y1);
  row(ORDER.slice(3), foot, h);
  return out;
}

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

  /*
   * The lane is the clear strip beside the content, measured from the
   * clearings rather than assumed from contentWidth - the clearings are what a
   * figure has to keep out of, and they are wider than the content by whatever
   * padding the grain leaves round it.
   *
   * It has to be the *widest* block that decides, so take the smallest inset
   * of the centred ones. Full-bleed blocks are skipped: they reach both edges
   * and leave no lane at all, which is a question of where a figure goes, not
   * how big it is - the placement walk moves away from them.
   *
   * Getting this backwards is why figures bunched at the top of the page. The
   * flyer is only 75% of the column, so the most inset clearing was the
   * flyer's, and sizing off that made every figure too wide for the blocks
   * below it. They fitted beside the flyer and collided with everything else,
   * so only the topmost few were ever drawn.
   */
  const columns = avoid.filter((a) => a.x > 4 && a.x + a.w < w - 4);
  const lane = columns.length
    ? Math.min(...columns.map((a) => a.x))
    : Math.max(0, (w - contentWidth) / 2);

  const size = Math.min(lane * 0.742, 220);   // 0.742 leaves 8% either side

  // Too thin to hold one - a phone, or near enough. The open sky above and
  // below the content is the only room left.
  if (size < 104) return planBands(w, h, avoid);

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

  // Centred in the lane, so the slack is shared between the page edge and the
  // content rather than all landing on one side.
  const left = lane * 0.5;
  const right = w - lane * 0.5;

  // The heart is pinned to the top right; the rest fall in around it.
  place('heart', right, size * 0.75);

  const span = 0.86 / ORDER.length;
  ORDER.forEach((name, i) => {
    place(name, i % 2 === 0 ? left : right,
      h * (0.08 + span * (i + 0.5)) + (rand() - 0.5) * h * 0.03);
  });

  return out;
}

/* ══ DRAWING ══════════════════════════════════════════════════════════════
 * The chart is built as SVG rather than painted to a canvas, for the same
 * reason the wood grain is: the lines have to draw themselves on, and
 * stroke-dashoffset does that in CSS. On a canvas every frame of every line
 * would mean recompositing the layer.
 *
 * Each element carries its own delay as --d, worked out here where the counts
 * are known, so the stylesheet holds the shape of the animation and none of
 * the arithmetic. Sparkling stars also carry --t, a phase, so they do not all
 * pulse together.
 * ═══════════════════════════════════════════════════════════════════════ */

const NS = 'http://www.w3.org/2000/svg';

const STAR_WINDOW = 1.0;   // s, over which every star pops in
const EDGE_STEP = 0.06;    // s between one segment of a figure and the next
const FIGURE_STEP = 0.1;   // s between one figure starting and the next

function el(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

/* A star that catches the light: the dot, plus the four-point flare. */
function mark(x, y, r, delay, phase, cls) {
  const g = el('g', { class: cls, transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` });
  const s = (r * 3).toFixed(1);
  g.append(
    el('circle', { class: 's-core', r: r.toFixed(2), style: `--d:${delay}s` }),
    el('path', {
      class: 's-flare',
      d: `M${-s},0H${s}M0,${-s}V${s}`,
      style: `--d:${delay}s;--t:${phase}s`,
    }),
  );
  return g;
}

/*
 * Build the chart into `svg`. Returns when the whole intro finishes, so the
 * caller knows when it is safe to rebuild without replaying it.
 */
export function buildSky(svg, w, h, placements, opts = {}) {
  const rand = mulberry32((opts.seed ?? 987654321) ^ 0x1234);
  const begin = opts.begin ?? 0;          // s, when the first star may appear

  svg.setAttribute('viewBox', `0 0 ${Math.round(w)} ${Math.round(h)}`);
  svg.setAttribute('width', Math.round(w));
  svg.setAttribute('height', Math.round(h));

  const loose = el('g', { class: 's-loose' });
  const figures = el('g', { class: 's-figures' });

  /*
   * ── loose stars everywhere ──────────────────────────────────────────
   * Four sizes on a long tail: mostly faint pinpricks, a scattering of
   * brighter ones, and roughly one in forty bright enough to carry a flare
   * and sparkle. Capped, because these are DOM nodes now rather than pixels
   * on a canvas, and a very tall page would otherwise run to thousands.
   */
  const n = Math.min(560, Math.round((w * h) / 6500));
  for (let i = 0; i < n; i++) {
    const u = rand();
    const x = rand() * w;
    const y = rand() * h;
    const r = u > 0.977 ? 2.2 : u > 0.94 ? 1.7 : u > 0.72 ? 1.2 : 0.85;
    // scattered through the window rather than in painting order, so they
    // arrive all over the page at once instead of sweeping across it
    const d = (begin + rand() * STAR_WINDOW).toFixed(2);

    if (u > 0.977) {
      loose.append(mark(x, y, r, d, (rand() * 4).toFixed(2), 's-mark is-loose'));
    } else {
      loose.append(el('circle', {
        class: 's-dot',
        cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(2),
        style: `--d:${d}s`,
      }));
    }
  }

  // ── the figures ───────────────────────────────────────────────────────
  // Every star is in before any line is drawn, which is the whole effect:
  // the chart appears as dots, then joins itself up.
  const linesAt = begin + STAR_WINDOW + 0.2;
  let longest = 0;

  placements.forEach(({ name, cx, cy, size }, fi) => {
    const fig = FIGURES[name];
    const x0 = cx - size / 2;
    const y0 = cy - size / 2;
    const px = (p) => [x0 + p[0] * size, y0 + p[1] * size];

    const g = el('g', { class: 's-figure' });

    fig.edges.forEach(([a, b], ei) => {
      const [ax, ay] = px(fig.stars[a]);
      const [bx, by] = px(fig.stars[b]);
      const d = linesAt + fi * FIGURE_STEP + ei * EDGE_STEP;
      longest = Math.max(longest, d + 0.45);
      g.append(el('line', {
        class: 's-edge',
        x1: ax.toFixed(1), y1: ay.toFixed(1),
        x2: bx.toFixed(1), y2: by.toFixed(1),
        pathLength: '1',
        style: `--d:${d.toFixed(2)}s`,
      }));
    });

    fig.stars.forEach((p, k) => {
      const [sx, sy] = px(p);
      const d = (begin + rand() * STAR_WINDOW).toFixed(2);
      if (fig.bright.includes(k)) {
        g.append(mark(sx, sy, 3.1, d, (rand() * 4).toFixed(2), 's-mark'));
      } else {
        g.append(el('circle', {
          class: 's-dot is-figure',
          cx: sx.toFixed(1), cy: sy.toFixed(1), r: '2',
          style: `--d:${d}s`,
        }));
      }
    });

    figures.append(g);
  });

  svg.replaceChildren(loose, figures);
  return { settleAt: Math.max(longest, begin + STAR_WINDOW) };
}
