// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // The toolbar floats a dark pill over the middle of the page, which lands
  // right on top of the date and ruins every screenshot of the design.
  devToolbar: { enabled: false },
});
