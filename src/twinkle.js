/*
 * The flares on the brighter chart stars, breathing.
 *
 * These live on their own canvas over the grain rather than in it. The grain
 * canvas costs a marching-squares pass over the whole page, so it is painted
 * once and left alone; this one holds a couple of dozen short lines and can be
 * cleared and redrawn every frame for nothing. drawSky() returns where the
 * flares belong and declines to draw them, so the two never double up.
 *
 * Each flare gets its phase and its rate from its own position, so they drift
 * apart instead of pulsing in unison, and they land in the same place on every
 * reload. No two neighbours share a period, which is what stops the field
 * looking like it is blinking on a metronome.
 */

const BASE = 0.42;      // alpha floor - never fully out
const SWING = 0.34;     // how much of the alpha breathes
const REACH = 3.0;      // flare length, in multiples of the star's radius
const STRETCH = 1.1;    // extra reach at full brightness

export function installTwinkle(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let flares = [];
  let w = 0;
  let h = 0;
  let raf = 0;

  /*
   * Position decides both the phase and the rate. Scaled by irrational-ish
   * factors so that two stars an even distance apart do not come out in step.
   */
  function seed(f) {
    f.phase = (f.x * 0.0173 + f.y * 0.0291) % (Math.PI * 2);
    f.rate = 0.5 + ((f.x * 0.7 + f.y * 1.3) % 100) / 145;   // ~0.5..1.2 rad/s
  }

  function paint(now) {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = opts.ink ?? '#14110f';
    ctx.lineCap = 'round';

    const t = now / 1000;
    for (const f of flares) {
      // still is the same code path, just frozen part-way up
      const k = reduced.matches ? 0.5 : 0.5 + 0.5 * Math.sin(t * f.rate + f.phase);
      const reach = f.r * (REACH + STRETCH * k);

      ctx.globalAlpha = (BASE + SWING * k) * (opts.alpha ?? 1);
      ctx.lineWidth = Math.max(0.6, f.r * 0.32);
      ctx.beginPath();
      ctx.moveTo(f.x - reach, f.y); ctx.lineTo(f.x + reach, f.y);
      ctx.moveTo(f.x, f.y - reach); ctx.lineTo(f.x, f.y + reach);
      ctx.stroke();
    }
  }

  function frame(now) {
    paint(now);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function run() {
    stop();
    if (!flares.length) {
      ctx.clearRect(0, 0, w, h);
      return;
    }
    if (reduced.matches) paint(0);          // draw the resting state, once
    else raf = requestAnimationFrame(frame);
  }

  /*
   * Hand over a fresh set of flares. Called after every grain repaint, since
   * a resize moves every figure and changes the canvas size underneath us.
   */
  function set(next, geom) {
    const dpr = geom.dpr ?? 1;
    w = geom.w;
    h = geom.h;
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    flares = next.map((f) => ({ ...f }));
    flares.forEach(seed);
    run();
  }

  reduced.addEventListener('change', run);

  // No sense animating a tab nobody is looking at.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else run();
  });

  return { set };
}
