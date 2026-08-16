# Images

These feed the scrolling photo strip in the hero.

## Adding a photo

1. Resize it to 900px tall (any aspect ratio is fine — the strip tiles them
   at equal height and lets the widths fall where they may):

   ```sh
   sips --resampleHeight 900 -s formatOptions 80 <original>.jpg --out <name>.jpg
   ```

2. Add a line to the `photos` array at the top of `src/pages/index.astro`:

   ```js
   { src: '/images/<name>.jpg', alt: 'A short description' },
   ```

Order in the array is left-to-right in the strip. Nothing else needs to
change — the markup renders the list twice for a seamless loop, and the
scroll duration is computed from the total width so the drift speed stays
constant however many photos there are.

## Tuning

Both knobs live in `src/pages/index.astro`:

- **Speed** — `PX_PER_SEC` in the script block (currently 22 px/sec).
- **Strip height** — the `height` on `.marquee`.
