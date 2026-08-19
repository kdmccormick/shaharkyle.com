/*
 * The star chart, over the wood grain and under the pools of paper.
 *
 * It scrolls with the page rather than sitting fixed like the grain, for two
 * reasons: the figures are placed in the margins beside the content, which
 * means they have to know where the content actually is; and the pools of
 * paper scroll, so a fixed chart would slide in and out from under them.
 *
 * The whole thing arrives after the grain has finished drawing itself - stars
 * first, all over the page at once, then the figures join themselves up
 * segment by segment. `begin` is where that queue starts, and the caller works
 * it out from how long the grain takes.
 */

import { buildSky, planSky } from './constellations.js';

const CLEAR_PAD = 14;   // matches glow.js: the pools are inset by this much

export function installSky(svg, opts = {}) {
  const host = svg.parentElement;
  let raf = 0;
  let lastW = -1;
  let lastH = -1;
  let settled = false;   // once the intro has run, rebuilds must not replay it

  function draw() {
    raf = 0;
    const w = Math.ceil(host.offsetWidth);
    const h = Math.ceil(host.offsetHeight);
    if (w < 2 || h < 2) return;
    lastW = w;
    lastH = h;

    // Where the content sits, in coordinates local to the host box - the same
    // boxes glow.js lays paper over, so the figures land in the gaps between
    // the pools rather than under them.
    const hostBox = host.getBoundingClientRect();
    const avoid = [];
    for (const node of host.querySelectorAll('[data-clearing]')) {
      const r = node.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      avoid.push({
        x: r.left - hostBox.left - CLEAR_PAD,
        y: r.top - hostBox.top - CLEAR_PAD,
        w: r.width + CLEAR_PAD * 2,
        h: r.height + CLEAR_PAD * 2,
      });
    }

    const seed = opts.seed ?? 987654321;
    const plan = planSky(w, h, opts.contentWidth ?? 760, (seed ^ 0x5eed) >>> 0, avoid);
    const { settleAt } = buildSky(svg, w, h, plan, {
      seed,
      begin: settled ? 0 : (opts.begin ?? 0),
    });

    if (settled) {
      svg.classList.add('is-settled');
    } else {
      // Let the intro finish, then stop replaying it. Rebuilds after this
      // point - a resize, an image landing - come in already drawn.
      setTimeout(() => {
        settled = true;
        svg.classList.add('is-settled');
      }, settleAt * 1000 + 200);
    }
  }

  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };

  schedule();
  window.addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  // Only rebuild when the box actually changed size, or the observer re-fires
  // on its own output and loops.
  const ro = new ResizeObserver(() => {
    if (host.offsetWidth !== lastW || host.offsetHeight !== lastH) schedule();
  });
  ro.observe(host);

  return schedule;
}
