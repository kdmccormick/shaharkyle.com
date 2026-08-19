/*
 * The pools of clean paper the content is read on.
 *
 * The wood grain runs across the whole page. Left alone it would run straight
 * through the words, so every block marked `data-clearing` gets a pool of
 * paper laid over the grain, and the text sits on that. It is the same idea as
 * a card behind the text, but with no edge to it: four passes, widening and
 * thinning as they go, so the paper fades back into the grain over a couple of
 * hundred pixels rather than stopping at a line. How far it reaches is per
 * block - see REACH - because a narrow column of text wants a tighter pool
 * than a full-bleed strip of photographs.
 *
 * The core has to cover its block outright - the text above it is near-black
 * and the grain behind it is heavy - so it is inflated well past the block and
 * then blurred, putting the blur's soft edge outside the block rather than
 * across it. Each pad is comfortably larger than its blur, which is what
 * guarantees that.
 */

const CLEAR_PAD = 14;     // px of clear paper around each block of content
const MAX_DPR = 2;

/*
 * Four passes rather than three, and the outer two reach further and blur
 * harder than they used to: the light gives out over a couple of hundred
 * pixels now instead of ending in a visible ring. The core is unchanged - it
 * is the part the text sits on and it only has to cover the block.
 */
const PASSES = [
  { pad: 236, blur: 132, key: 'outer', fallback: 'rgba(190,140,70,0.16)' },
  { pad: 150, blur: 84,  key: 'halo',  fallback: 'rgba(210,164,94,0.28)' },
  { pad: 84,  blur: 46,  key: 'mid',   fallback: 'rgba(224,188,126,0.54)' },
  { pad: 42,  blur: 22,  key: 'core',  fallback: 'rgba(234,207,148,0.94)' },
];

/*
 * How far a block's light reaches, as a multiple of the pads above. Blocks
 * marked `data-clearing="snug"` get a tighter pool: the text sections sit in a
 * narrow column, so the default reach leaves them in a pool half again as wide
 * as they are. Pad and blur scale together, so the core still covers its block.
 */
const REACH = { snug: 0.6 };

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * The pool outline: a superellipse fitted to the block - so it stays a rounded
 * rectangle rather than an oval, and does not crop the corners of wide content
 * - with a slow radial wobble on top so no edge of it is truly straight.
 */
function organicBlob(ctx, c) {
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  const a = c.w / 2;
  const b = c.h / 2;
  const N = 4;
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

export function paintGlow(canvas, opts = {}) {
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

  const hostBox = host.getBoundingClientRect();
  const phase = mulberry32(opts.seed ?? 20270605);
  const rand2 = () => phase() * Math.PI * 2;

  const clearings = [];
  for (const el of host.querySelectorAll('[data-clearing]')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    clearings.push({
      x: r.left - hostBox.left - CLEAR_PAD,
      y: r.top - hostBox.top - CLEAR_PAD,
      w: r.width + CLEAR_PAD * 2,
      h: r.height + CLEAR_PAD * 2,
      wob: [rand2(), rand2(), rand2()],
      reach: REACH[el.dataset.clearing] ?? 1,
    });
  }

  const soft = typeof ctx.filter === 'string';
  const inflate = (c, pad) => ({
    ...c, x: c.x - pad, y: c.y - pad, w: c.w + pad * 2, h: c.h + pad * 2,
  });

  /*
   * The pads are in pixels, which is right on a wide screen and far too much on
   * a narrow one: at 390px across, a 168px halo runs 182px off each edge, so
   * one block floods the whole screen and no grain shows anywhere. Scaling them
   * with the width keeps the paper close to its block instead.
   *
   * Pad and blur scale together, so the core still covers its block: that only
   * needs pad > blur, which the ratio preserves.
   */
  const tight = Math.min(1, Math.max(0.3, (w - 360) / 640));

  /*
   * Each block is painted on its own rather than the whole pass at once,
   * because the blur has to change per block now that they reach different
   * distances. Setting ctx.filter is cheap next to the blur itself.
   */
  for (const pass of PASSES) {
    ctx.fillStyle = opts[pass.key] || pass.fallback;
    for (const c of clearings) {
      const k = tight * c.reach;
      // Without filter support the shape is drawn hard-edged; it still gives
      // the text clean paper, it just does not feather.
      if (soft) ctx.filter = `blur(${(pass.blur * k).toFixed(1)}px)`;
      organicBlob(ctx, inflate(c, pass.pad * k));
      ctx.fill();
    }
    if (soft) ctx.filter = 'none';
  }
}

/* ── keep it in step with the page ────────────────────────────────────── */
export function installGlow(canvas, opts) {
  let raf = 0;
  let lastW = -1;
  let lastH = -1;

  const draw = () => {
    raf = 0;
    const host = canvas.parentElement;
    lastW = host.offsetWidth;
    lastH = host.offsetHeight;
    paintGlow(canvas, opts);
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
