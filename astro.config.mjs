// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // The toolbar floats a dark pill over the middle of the page, which lands
  // right on top of the date and ruins every screenshot of the design.
  devToolbar: { enabled: false },

  // Keep the stylesheet a file instead of letting Astro inline small ones.
  // The Content-Security-Policy in netlify.toml allows no inline styles, so
  // an inlined <style> would be blocked and the page would render unstyled.
  build: { inlineStylesheets: 'never' },
});
