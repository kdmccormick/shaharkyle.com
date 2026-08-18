/*
 * Paints the whole page background as wood grain that flows around the content.
 *
 * Same idea as the tattoo references: grain lines are contours - level sets -
 * of a scalar field.
 *
 *     f(x, y) = x  +  knots  +  clearings
 *
 * Away from everything f is just `x`, so contours are near-vertical lines: the
 * straight run of the grain. A knot adds a smooth hill, and the contours of a
 * hill are closed loops around its summit - which is what grain does around a
 * knot. A clearing is the same trick at a larger scale: a plateau standing over
 * each block of content, whose contours are offset curves of that block's
 * outline. That is what makes the grain appear to part and flow around the
 * flyer and the text instead of running underneath them.
 *
 * This runs in the browser rather than shipping a generated SVG because the
 * clearings have to sit exactly where the content actually landed, and that
 * depends on viewport width, font loading and image size - none of which are
 * known at build time. It also costs a few KB instead of about a megabyte.
 *
 * Contours are extracted with marching squares. Each cell is visited once and
 * only the levels that actually cross it are considered, so cost tracks the
 * length of the lines drawn rather than cell-count times level-count.
 */

import { drawSky, planSky } from './constellations.js';

const SPACING = 16;       // px between grain lines
const CELL = 5;           // marching-squares cell size
const CLEAR_PAD = 14;     // px of clear paper around each block of content
const CLEAR_FEATHER = 9;  // px of soft edge on the clearing
const MAX_DPR = 2;

/* ── a small seeded RNG, so the grain is the same on every reload ─────── */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── the field ────────────────────────────────────────────────────────── */
function buildField(rand, w, h, clearings) {
  // A handful of sine plies. Summed, they warp the grain off true; this is
  // what separates a piece of timber from a contour plot.
  const plies = [];
  for (let i = 0; i < 4; i++) {
    plies.push({
      fx: (rand() * 1.2 + 0.4) / 210,
      fy: (rand() * 1.2 + 0.4) / 210,
      ph: rand() * Math.PI * 2,
      amp: 26 / 4,
    });
  }
  const pliesY = [];
  for (let i = 0; i < 3; i++) {
    pliesY.push({
      fx: (rand() * 1.1 + 0.4) / 280,
      fy: (rand() * 1.1 + 0.4) / 280,
      ph: rand() * Math.PI * 2,
      amp: 20 / 3,
    });
  }

  // Knots, kept out of the middle where the content lives.
  const knots = [];
  const n = Math.max(4, Math.round((w * h) / 420000));
  for (let i = 0; i < n; i++) {
    const side = rand() < 0.5 ? 0 : 1;
    knots.push({
      x: side ? w * (0.82 + rand() * 0.16) : w * (0.02 + rand() * 0.16),
      y: h * ((i + 0.5) / n) + (rand() - 0.5) * h * 0.1,
      amp: 70 + rand() * 70,
      sx: 26 + rand() * 20,
      sy: 48 + rand() * 60,
      rot: (rand() - 0.5) * 1.1,
    });
  }

  return function f(x, y) {
    let wx = x;
    let wy = y;
    for (const p of plies) wx += p.amp * Math.sin(2 * Math.PI * (p.fx * x + p.fy * y) + p.ph);
    for (const p of pliesY) wy += p.amp * Math.sin(2 * Math.PI * (p.fx * x + p.fy * y) + p.ph);

    let v = wx;

    for (const k of knots) {
      const dx = wx - k.x;
      const dy = wy - k.y;
      const ca = Math.cos(k.rot);
      const sa = Math.sin(k.rot);
      const u = (dx * ca + dy * sa) / k.sx;
      const t = (-dx * sa + dy * ca) / k.sy;
      const e = u * u + t * t;
      if (e < 18) v += k.amp * Math.exp(-0.5 * e);
    }

    // Each clearing is a plateau over its block of content. Distance is
    // measured to the *rectangle*, not to its centre, so the contours come out
    // as rounded-rectangle offsets hugging the block rather than as circles.
    for (const c of clearings) {
      const dx = Math.max(c.x - wx, 0, wx - (c.x + c.w));
      const dy = Math.max(c.y - wy, 0, wy - (c.y + c.h));
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < c.sigma * 4) {
        const s = d / c.sigma;
        v += c.amp * Math.exp(-0.5 * s * s);
      }
    }
    return v;
  };
}

/* ── marching squares ─────────────────────────────────────────────────── */
function contourInto(buckets, F, cols, rows, cell, lo, step, nLevels) {
  const at = (i, j) => F[j * (cols + 1) + i];

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i + 1, j + 1);
      const d = at(i, j + 1);

      let mn = a, mx = a;
      if (b < mn) mn = b; else if (b > mx) mx = b;
      if (c < mn) mn = c; else if (c > mx) mx = c;
      if (d < mn) mn = d; else if (d > mx) mx = d;

      let k0 = Math.ceil((mn - lo) / step);
      let k1 = Math.floor((mx - lo) / step);
      if (k0 < 0) k0 = 0;
      if (k1 >= nLevels) k1 = nLevels - 1;
      if (k1 < k0) continue;

      const x0 = i * cell;
      const y0 = j * cell;

      for (let k = k0; k <= k1; k++) {
        const L = lo + k * step;
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
        if (idx === 0 || idx === 15) continue;

        // edge crossings, linearly interpolated
        const top = () => [x0 + cell * ((L - a) / (b - a)), y0];
        const right = () => [x0 + cell, y0 + cell * ((L - b) / (c - b))];
        const bottom = () => [x0 + cell * ((L - d) / (c - d)), y0 + cell];
        const left = () => [x0, y0 + cell * ((L - a) / (d - a))];

        let segs;
        switch (idx) {
          case 1: case 14: segs = [[left(), bottom()]]; break;
          case 2: case 13: segs = [[bottom(), right()]]; break;
          case 3: case 12: segs = [[left(), right()]]; break;
          case 4: case 11: segs = [[top(), right()]]; break;
          case 6: case 9:  segs = [[top(), bottom()]]; break;
          case 7: case 8:  segs = [[left(), top()]]; break;
          case 5:  segs = [[left(), top()], [bottom(), right()]]; break;
          default: segs = [[left(), bottom()], [top(), right()]]; break; // 10
        }

        let bucket = buckets[k];
        if (!bucket) bucket = buckets[k] = [];
        for (const s of segs) {
          bucket.push(s[0][0], s[0][1], s[1][0], s[1][1]);
        }
      }
    }
  }
}

/* ── the paint ────────────────────────────────────────────────────────── */
export function paintWoodGrain(canvas, opts = {}) {
  const seed = opts.seed ?? 20270605;
  const ink = opts.ink ?? '#14110f';
  const alpha = opts.alpha ?? 0.55;

  const host = canvas.parentElement;
  const w = Math.ceil(host.offsetWidth);
  const h = Math.ceil(host.offsetHeight);
  if (w < 2 || h < 2) return;

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Where the content sits, in coordinates local to the host box.
  const hostBox = host.getBoundingClientRect();
  const clearings = [];
  const phase = mulberry32(seed ^ 0x9e37);
  const rand2 = () => phase() * Math.PI * 2;
  for (const el of host.querySelectorAll('[data-clearing]')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const pad = CLEAR_PAD;
    clearings.push({
      x: r.left - hostBox.left - pad,
      y: r.top - hostBox.top - pad,
      w: r.width + pad * 2,
      h: r.height + pad * 2,
      // Enough amplitude for a good many lines to wrap the block, but a tight
      // falloff - a wide sigma pushes the grain right away and leaves the
      // content sitting in a bald halo instead of in a clearing.
      amp: 150,
      sigma: 62,
      wob: [rand2(), rand2(), rand2()],
    });
  }

  // Each constellation gets a clearing too, so the grain parts round it and the
  // figure sits in its own window of open paper. Rounder and shallower than a
  // content clearing - it should look like a gap in the wood, not a hole.
  const sky = planSky(w, h, opts.contentWidth ?? 760, (seed ^ 0x5eed) >>> 0,
                      clearings);
  const skyClearings = sky.map((s) => ({
    x: s.cx - s.size * 0.56,
    y: s.cy - s.size * 0.56,
    w: s.size * 1.12,
    h: s.size * 1.12,
    amp: 120,
    sigma: 52,
    wob: [rand2(), rand2(), rand2()],
    round: true,
  }));

  const rand = mulberry32(seed);
  const f = buildField(rand, w, h, clearings.concat(skyClearings));

  // sample the field on a grid
  const cols = Math.ceil(w / CELL);
  const rows = Math.ceil(h / CELL);
  const F = new Float32Array((cols + 1) * (rows + 1));
  let mn = Infinity;
  let mx = -Infinity;
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const v = f(i * CELL, j * CELL);
      F[j * (cols + 1) + i] = v;
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
  }

  const lo = mn + SPACING * 0.5;
  const nLevels = Math.max(1, Math.floor((mx - lo) / SPACING));
  const buckets = new Array(nLevels);
  contourInto(buckets, F, cols, rows, CELL, lo, SPACING, nLevels);

  // Weight comes from slow noise over the level index, so heavy lines arrive in
  // bands with fine ones between - as in real timber - rather than speckling.
  const wPh = rand() * Math.PI * 2;
  const wFreq = 2.5 + rand() * 2;
  const wPh2 = rand() * Math.PI * 2;

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';

  for (let k = 0; k < nLevels; k++) {
    const seg = buckets[k];
    if (!seg || !seg.length) continue;
    const u = k / nLevels;
    // One slow swell along the level index, raised to a power so most lines
    // stay hairline and the few near a crest go properly heavy. Blending two
    // sines here instead just keeps everything near the middle weight, and the
    // whole thing flattens into an even hatch.
    const band = (1 + Math.sin(u * Math.PI * 2 * wFreq + wPh)) / 2;
    const swell = (1 + Math.sin(u * Math.PI * 2 * 0.7 + wPh2)) / 2;
    ctx.lineWidth = 0.45 + 7.0 * Math.pow(band, 2.6) * (0.45 + 0.55 * swell);

    ctx.beginPath();
    for (let i = 0; i < seg.length; i += 4) {
      ctx.moveTo(seg[i], seg[i + 1]);
      ctx.lineTo(seg[i + 2], seg[i + 3]);
    }
    ctx.stroke();
  }

  // Punch the clearings out. The field already bent the grain around them, but
  // the plateau itself still carries stray contours; this leaves clean paper
  // under the content, with a feathered edge so nothing ends on a hard line.
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-out';
  if (typeof ctx.filter === 'string') ctx.filter = `blur(${CLEAR_FEATHER}px)`;
  for (const c of clearings.concat(skyClearings)) {
    organicBlob(ctx, c);
    ctx.fill();
  }
  if (typeof ctx.filter === 'string') ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';

  // The chart goes on last, onto the windows just cleared for it, so the stars
  // read at full strength instead of competing with the grain. It is drawn in
  // its own ink: the chart is off-white, the grain is graphite.
  const flares = drawSky(ctx, w, h, sky, {
    seed: (seed ^ 0x5eed) >>> 0,
    ink: opts.skyInk ?? ink,
    alpha: opts.skyAlpha ?? Math.min(1, alpha * 1.15),
  });

  // The flares are left undrawn above; hand them to whoever animates them,
  // along with the geometry they were measured in.
  opts.onSky?.(flares, { w, h, dpr });
}

/*
 * The clearing outline: a superellipse fitted to the block - so it stays a
 * rounded rectangle rather than an oval, and does not crop the corners of wide
 * content - with a slow radial wobble on top so no edge of it is truly
 * straight.
 */
function organicBlob(ctx, c) {
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  const a = c.w / 2;
  const b = c.h / 2;
  // Superellipse exponent: 2 is an oval, larger tends to a rounded rectangle.
  // Content blocks want the rectangle so their corners are not cropped; a
  // constellation window wants the oval, so it reads as a gap in the wood.
  const N = c.round ? 2.2 : 4;
  const STEPS = 128;

  ctx.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const th = (i / STEPS) * Math.PI * 2;
    const ct = Math.abs(Math.cos(th));
    const st = Math.abs(Math.sin(th));
    let r = Math.pow(Math.pow(ct / a, N) + Math.pow(st / b, N), -1 / N);
    r *= 1
      + 0.055 * Math.sin(3 * th + c.wob[0])
      + 0.035 * Math.sin(5 * th + c.wob[1])
      + 0.02 * Math.sin(8 * th + c.wob[2]);
    const x = cx + r * Math.cos(th);
    const y = cy + r * Math.sin(th);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/* ── keep it in step with the page ────────────────────────────────────── */
export function installWoodGrain(canvas, opts) {
  let raf = 0;
  let lastW = -1;
  let lastH = -1;

  const draw = () => {
    raf = 0;
    const host = canvas.parentElement;
    lastW = host.offsetWidth;
    lastH = host.offsetHeight;
    paintWoodGrain(canvas, opts);
  };
  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };

  schedule();
  window.addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  // Only repaint when the box actually changed size. Without this the observer
  // re-fires on its own output and loops.
  const ro = new ResizeObserver(() => {
    const host = canvas.parentElement;
    if (host.offsetWidth !== lastW || host.offsetHeight !== lastH) schedule();
  });
  ro.observe(canvas.parentElement);

  return schedule;
}
