/*
 * Marcy, and the banana she is prepared to do something about.
 *
 * Three states:
 *
 *   snoozing  curled up, eyes shut, small zs. Click her and she wakes.
 *   waiting   sitting up, blinking, doing nothing in particular. Ten seconds
 *             of that and she nods off again.
 *   chasing   travelling to wherever the banana landed. Arrives, purrs,
 *             goes back to waiting.
 *
 * Throwing the banana is what starts a chase, but only if she is awake to see
 * it: throw it while she is snoozing and it simply lands somewhere new.
 *
 * Both of them ride the same hidden railway - a closed Catmull-Rom loop
 * through waypoints scattered round the viewport, rebuilt on resize. It is
 * resampled into an arc-length table so she travels at a constant speed
 * instead of sprinting the tight corners and dawdling on the straights, which
 * is what you get driving a spline by its raw parameter. Because both of them
 * are just a distance along that loop, a chase is one number moving towards
 * another, and she always takes the shorter way round.
 *
 * The noises are text, not audio.
 */

const SPEED = 260;        // px per second, chasing
const WAIT_MS = 10000;    // how long she stays up before nodding off
const SAY_MS = 1600;      // how long a noise stays on screen
const ARRIVE = 6;         // px from the banana that counts as caught

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
  const say = layer.querySelector('[data-say]');
  if (!cat || !banana) return {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let path = [];
  let cum = [];
  let total = 0;

  let state = '';
  let marcyD = 0;
  let bananaD = 0;
  let spin = 0;             // banana tumbles a bit further with every throw

  let raf = 0;
  let last = 0;
  let waitTimer = 0;
  let sayTimer = 0;

  /* ── the railway ──────────────────────────────────────────────────── */

  function build() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = W / 2;
    const cy = H / 2;
    const rx = Math.max(120, W / 2 - 70);
    const ry = Math.max(120, H / 2 - 70);

    // Waypoints on a wobbly ring: some hug the edges, some cut across the
    // middle, so the loop wanders instead of being an obvious oval.
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

  /* The lowest point on the loop - where she starts, and sleeps. */
  function bottomOfLoop() {
    let best = 0;
    let bestY = -Infinity;
    for (let d = 0; d < total; d += 10) {
      const y = at(d)[1];
      if (y > bestY) { bestY = y; best = d; }
    }
    return best;
  }

  /* Signed distance to the banana, taking whichever way round is shorter. */
  function toBanana() {
    let d = ((bananaD - marcyD) % total + total) % total;
    if (d > total / 2) d -= total;
    return d;
  }

  /* ── drawing ──────────────────────────────────────────────────────── */

  function placeCat() {
    const p = at(marcyD);
    const q = at(marcyD + 8);
    let deg = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
    let flip = 1;
    // Facing: mirroring also mirrors the sense of the rotation, so when she is
    // heading left we flip her and take the angle round by 180 - that keeps her
    // upright and pointed the right way instead of running upside down.
    if (deg > 90 || deg < -90) { flip = -1; deg -= 180; }
    // Damp the tilt hard. Her face is drawn front-on, so banking her over to
    // match a steep climb reads as a cat falling sideways; a hint of lean is
    // enough to sell the direction.
    deg *= 0.22;
    // Standing still, she should be level and facing the way she last went.
    if (state !== 'chasing') deg = 0;
    cat.style.transform =
      `translate3d(${p[0]}px, ${p[1]}px, 0) rotate(${deg}deg) scaleX(${flip})`;

    // The bubble rides above her head, unflipped - mirrored text is not a look.
    if (say) say.style.transform = `translate3d(${p[0]}px, ${p[1] - 62}px, 0)`;
  }

  function placeBanana() {
    const p = at(bananaD);
    banana.style.transform =
      `translate3d(${p[0]}px, ${p[1]}px, 0) rotate(${spin}deg)`;
  }

  /* ── noises ───────────────────────────────────────────────────────── */

  function speak(text) {
    if (!say) return;
    const bubble = say.querySelector('span') || say;
    bubble.textContent = text;
    say.classList.add('is-on');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => say.classList.remove('is-on'), SAY_MS);
  }

  /* ── the state machine ────────────────────────────────────────────── */

  function setState(next) {
    state = next;
    layer.classList.toggle('is-snoozing', next === 'snoozing');
    layer.classList.toggle('is-waiting', next === 'waiting');
    layer.classList.toggle('is-chasing', next === 'chasing');
    cat.setAttribute('aria-label',
      next === 'snoozing' ? 'Marcy, asleep. Wake her up.' : 'Marcy, awake.');

    clearTimeout(waitTimer);
    if (next === 'waiting') waitTimer = setTimeout(() => doze(), WAIT_MS);

    if (next !== 'chasing') {
      stopFrames();
    } else if (reduced.matches) {
      arrive();               // no travelling animation: she is simply there
      return;
    } else {
      startFrames();
    }
    placeCat();
  }

  /* Caught it. */
  function arrive() {
    marcyD = bananaD;
    placeCat();
    speak('prrr');
    setState('waiting');
  }

  function doze() {
    if (state !== 'waiting') return;
    setState('snoozing');
  }

  function wake() {
    if (state !== 'snoozing') {
      // already up - just buy her another ten seconds
      if (state === 'waiting') setState('waiting');
      return;
    }
    speak('mrrrp?');
    setState('waiting');
  }

  /*
   * Throw the banana somewhere else on the railway. It only starts a chase if
   * she was awake to watch it go.
   */
  function toss() {
    // Somewhere between a fifth and four fifths of the way round from her, so
    // it never lands on top of her and never needs a full lap to reach.
    const away = total * (0.2 + Math.random() * 0.6);
    bananaD = (marcyD + away) % total;
    spin += 360 + Math.round(Math.random() * 180);
    placeBanana();

    if (state === 'snoozing') return;     // slept right through it
    if (state === 'waiting') speak('mrrp!');
    setState('chasing');
  }

  /* ── the chase ────────────────────────────────────────────────────── */

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;

    const gap = toBanana();
    const step = SPEED * dt;

    if (Math.abs(gap) <= Math.max(step, ARRIVE)) { arrive(); return; }

    marcyD += Math.sign(gap) * step;
    placeCat();
    startFrames();
  }

  /*
   * `last` is cleared by stopFrames, not here. Clearing it on the way into
   * every frame - which is what this used to do, since frame() ends by
   * calling back into it - left dt permanently zero and she never moved.
   * A fresh chase always follows a stopFrames, so it starts at zero anyway,
   * which is what makes the first frame after a pause cost no distance.
   */
  function startFrames() {
    if (raf) return;
    raf = requestAnimationFrame(frame);
  }

  function stopFrames() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }

  /* ── wiring ───────────────────────────────────────────────────────── */

  function clickable(el, fn) {
    el.addEventListener('click', fn);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
    });
  }

  clickable(cat, wake);
  clickable(banana, toss);

  build();
  marcyD = bottomOfLoop();
  bananaD = (marcyD + total * 0.3) % total;
  placeBanana();
  setState('snoozing');

  window.addEventListener('resize', () => {
    // Keep both of them where they were proportionally, or a resize teleports
    // her across the screen.
    const mf = total ? marcyD / total : 0;
    const bf = total ? bananaD / total : 0;
    build();
    marcyD = mf * total;
    bananaD = bf * total;
    placeCat();
    placeBanana();
  }, { passive: true });

  // Nothing to animate while the tab is hidden; also stops the clock handing
  // her a huge dt and teleporting her when you come back.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopFrames();
    else if (state === 'chasing') startFrames();
  });

  return {
    wake,
    toss,
    state: () => state,
  };
}
