/*
 * Marcy, running laps around the screen after a banana.
 *
 * The loop is a closed Catmull-Rom spline through a handful of waypoints
 * scattered round the viewport, rebuilt whenever the window resizes. It is
 * resampled into an arc-length table so she travels at a constant speed
 * instead of sprinting through the tight corners and dawdling on the straights,
 * which is what you get if you drive a spline by its raw parameter.
 *
 * The layer is fixed to the viewport rather than laid over the document: she
 * should run around the screen you are looking at, not be 4000px up the page.
 * It sits below the content in the stacking order, so she passes *behind* the
 * flyer and the text - and because the flyer is knocked out to transparency,
 * you can see her through the drawing as she goes by.
 *
 * The banana is simply further along the same path, so it leads her round every
 * bend without any chase logic. She never gains on it.
 */

const SPEED = 132;        // px per second
const LEAD = 168;         // how far ahead of her the banana runs
const LEAP_EVERY = 940;   // px of travel between pounces
const LEAP_SPAN = 0.22;   // fraction of that spent in the air
const LEAP_HEIGHT = 30;   // px

function catmullRom(pts, per = 26) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t
          + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
          + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t
          + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
          + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

export function installMarcy(layer, opts = {}) {
  const cat = layer.querySelector('[data-marcy]');
  const banana = layer.querySelector('[data-banana]');
  if (!cat || !banana) return {};

  const bed = opts.bed || null;        // where she goes to sleep once caught
  const hide = opts.hide || null;      // the paw and tail poking in while hiding
  const SETTLE_MS = 1500;
  const THROW_MS = 900;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let path = [];
  let cum = [];
  let total = 0;
  let raf = 0;
  let t0 = 0;
  let mode = 'hiding';                 // hiding | throwing | running | settling | asleep
  let settleFrom = null;
  let settleAt = 0;
  let travelled = 0;
  let throwAt = 0;
  let throwFrom = null;                // where the banana was let go from
  let catFrom = null;                  // where she bursts out of

  function build() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = W / 2;
    const cy = H / 2;
    const rx = Math.max(120, W / 2 - 70);
    const ry = Math.max(120, H / 2 - 70);

    // Waypoints on a wobbly ring: some hug the edges, some cut across the
    // middle, so the lap wanders instead of being an obvious oval.
    const n = 7;
    const way = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - 0.6;
      const k = 0.58 + 0.42 * ((1 + Math.sin(i * 2.4 + 1.1)) / 2);
      way.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }

    path = catmullRom(way);
    cum = [0];
    total = 0;
    for (let i = 1; i <= path.length; i++) {
      const a = path[i - 1];
      const b = path[i % path.length];
      total += Math.hypot(b[0] - a[0], b[1] - a[1]);
      cum.push(total);
    }
  }

  function at(dist) {
    let d = dist % total;
    if (d < 0) d += total;
    // binary search the arc-length table
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= d) lo = mid; else hi = mid;
    }
    const seg = cum[lo + 1] - cum[lo] || 1;
    const f = (d - cum[lo]) / seg;
    const a = path[lo % path.length];
    const b = path[(lo + 1) % path.length];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  function place(el, dist, lift, spin) {
    const p = at(dist);
    const q = at(dist + 8);
    let deg = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
    let flip = 1;
    // Facing: mirroring also mirrors the sense of the rotation, so when she is
    // heading left we flip her and take the angle round by 180 - that keeps her
    // upright and pointed the right way instead of running upside down.
    if (deg > 90 || deg < -90) { flip = -1; deg -= 180; }
    // Damp the tilt hard. Her face is drawn front-on, so banking her over to
    // match a steep climb just reads as a cat falling sideways; a hint of lean
    // is enough to sell the direction.
    deg *= 0.22;
    const s = spin ? ` rotate(${spin}deg)` : '';
    el.style.transform =
      `translate3d(${p[0]}px, ${p[1] + lift}px, 0) rotate(${deg}deg) scaleX(${flip})${s}`;
  }

  /* Where the bed is, in the viewport coordinates the fixed layer uses. */
  function bedPoint() {
    const r = bed.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  function frame(now) {
    if (!t0) t0 = now;

    if (mode === 'throwing') {
      const k = Math.min(1, (now - throwAt) / THROW_MS);
      // The banana arcs out to where it joins the loop; she bursts from her
      // hiding place a beat later and is already at a sprint when she lands on
      // the path, so the handover to the lap is not a visible stop.
      const bTo = at(LEAD);
      const be = 1 - Math.pow(1 - k, 2);
      const bx = throwFrom[0] + (bTo[0] - throwFrom[0]) * be;
      const by = throwFrom[1] + (bTo[1] - throwFrom[1]) * be
        - Math.sin(be * Math.PI) * 120;                 // the lob
      banana.style.transform =
        `translate3d(${bx}px, ${by}px, 0) rotate(${be * 540}deg)`;

      const ck = Math.max(0, Math.min(1, (k - 0.22) / 0.78));
      const ce = 1 - Math.pow(1 - ck, 3);
      const cTo = at(0);
      const cx = catFrom[0] + (cTo[0] - catFrom[0]) * ce;
      const cy = catFrom[1] + (cTo[1] - catFrom[1]) * ce;
      cat.style.transform =
        `translate3d(${cx}px, ${cy}px, 0) scaleX(${cTo[0] < catFrom[0] ? -1 : 1})`;

      if (k >= 1) {
        mode = 'running';
        t0 = now;
        travelled = 0;
      }
      raf = requestAnimationFrame(frame);
      return;
    }

    if (mode === 'settling') {
      const k = Math.min(1, (now - settleAt) / SETTLE_MS);
      // ease-out-cubic: she bolts for the bed then eases into it
      const e = 1 - Math.pow(1 - k, 3);
      const [bx, by] = bedPoint();
      const x = settleFrom[0] + (bx - settleFrom[0]) * e;
      const y = settleFrom[1] + (by - settleFrom[1]) * e;
      // a last little hop into the bed
      const hop = -Math.sin(e * Math.PI) * 26;
      const flip = bx < settleFrom[0] ? -1 : 1;
      cat.style.transform =
        `translate3d(${x}px, ${y + hop}px, 0) scaleX(${flip})`;
      banana.style.transform =
        `translate3d(${x + 26 * flip}px, ${y + hop + 6}px, 0) rotate(${e * 220}deg)`;

      if (k >= 1) {
        mode = 'asleep';
        layer.classList.add('is-asleep');   // hides the runners
        if (bed) bed.classList.add('is-asleep');   // reveals the loaf
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
      return;
    }

    travelled = ((now - t0) / 1000) * SPEED;

    // the pounce: a half-sine hop every so often
    const ph = (travelled % LEAP_EVERY) / LEAP_EVERY;
    const lift = ph < LEAP_SPAN
      ? -Math.sin((ph / LEAP_SPAN) * Math.PI) * LEAP_HEIGHT
      : 0;
    cat.classList.toggle('is-airborne', lift < -2);

    place(cat, travelled, lift, 0);
    place(banana, travelled + LEAD, Math.sin(travelled / 46) * 7,
          (travelled * 0.9) % 360);

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduced.matches) {
      layer.style.display = 'none';
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    layer.style.display = '';
    build();
    if (mode !== 'asleep' && mode !== 'hiding' && !raf) {
      raf = requestAnimationFrame(frame);
    }
  }

  /*
   * Throw the banana. She is watching from behind the edge of the screen, so
   * this is what brings her out: the banana is lobbed from the button towards
   * the loop, and she breaks cover after it.
   */
  function release(fromEl) {
    if (mode !== 'hiding' && mode !== 'asleep') return;
    build();

    if (mode === 'asleep') {
      // already out in the world, just put her back on the path
      mode = 'running';
      layer.classList.remove('is-asleep');
      if (bed) bed.classList.remove('is-asleep');
      t0 = 0;
      if (!raf) raf = requestAnimationFrame(frame);
      return;
    }

    const r = fromEl ? fromEl.getBoundingClientRect() : null;
    throwFrom = r ? [r.left + r.width / 2, r.top + r.height / 2]
                  : [window.innerWidth / 2, window.innerHeight * 0.2];
    // she comes from off the left edge, level with where she was peeking
    const hr = hide ? hide.getBoundingClientRect() : null;
    catFrom = [-140, hr ? hr.top + hr.height / 2 : window.innerHeight * 0.6];

    layer.classList.add('is-out');      // reveals the runners, hides the paw
    mode = 'throwing';
    throwAt = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /*
   * Let her have it. She breaks off the lap, runs to the bed and curls up.
   * The page scrolls there first, because the bed is usually well below the
   * fold and otherwise she would sprint off the bottom of the screen to a
   * destination you cannot see.
   */
  function settle() {
    if (mode !== 'running' || !bed) return;
    bed.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // let the smooth scroll finish, or the bed's coordinates are stale
    setTimeout(() => {
      settleFrom = at(travelled);
      settleAt = performance.now();
      mode = 'settling';
      if (!raf) raf = requestAnimationFrame(frame);
    }, reduced.matches ? 0 : 620);
  }

  start();
  window.addEventListener('resize', () => { build(); }, { passive: true });
  reduced.addEventListener('change', start);

  // Nothing to animate while the tab is hidden; also stops the clock jumping
  // her a lap forward when you come back.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else if (!reduced.matches && mode !== 'asleep' && mode !== 'hiding') {
      t0 = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }
  });

  return {
    settle,
    release,
    isAsleep: () => mode === 'asleep',
    isHiding: () => mode === 'hiding',
  };
}
