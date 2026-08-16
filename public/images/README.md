# Images

## `armory.jpg`

The venue — the main hall at Arts at the Armory. Pulled from
artsatthearmory.org, so worth replacing with your own shot (or asking them)
before the site goes public.

## The photo strip

The rest feed the scrolling strip at the top of the page.

### Adding a photo

1. Resize it to 900px tall (any aspect ratio is fine — the strip tiles them
   at equal height and lets the widths fall where they may):

   ```sh
   sips --resampleHeight 900 -s formatOptions 80 <original>.jpg --out <name>.jpg
   ```

2. Add a line to the `photos` array at the top of `src/pages/index.astro`:

   ```js
   { src: '/images/<name>.jpg', alt: 'A short description' },
   ```

Order in the array is left-to-right. Nothing else needs to change — the
markup renders the list twice for a seamless loop, and the scroll duration
is computed from the total width so the drift speed stays constant however
many photos there are.

### Tuning

Both knobs live in `src/pages/index.astro`:

- **Speed** — `PX_PER_SEC` in the script block (currently 22 px/sec).
- **Strip height** — the `height` on `.marquee`.
