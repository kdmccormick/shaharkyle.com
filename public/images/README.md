# Images

## `armory.jpg`

The venue — the main hall at Arts at the Armory. Pulled from
artsatthearmory.org, so worth replacing with your own shot (or asking them)
before the site goes public.

## The photo strip

`marquee/` holds the photos that feed the scrolling strip at the top of the
page.

### Adding a photo

1. Crop it however looks good, then resize to 900px tall and save as WebP
   (any aspect ratio is fine — the strip tiles them at equal height and lets
   the widths fall where they may):

   ```sh
   magick <original>.jpg -auto-orient -colorspace sRGB \
     -resize 'x900>' -strip -define webp:method=6 -quality 78 \
     marquee/<name>.webp
   ```

   Skip the sharpening step you might reach for — the strip displays these at
   about a third of their pixel height, so it buys nothing and costs ~17% more
   bytes. For a panorama wider than about 2:1, cap the width instead
   (`-resize '1600x900>'`) or it lands far heavier than everything else.

2. Add a line to the `photos` array at the top of `src/pages/index.astro`:

   ```js
   { src: '/images/marquee/<name>.webp', alt: 'A short description' },
   ```

Order in the array is left-to-right. Nothing else needs to change — the
markup renders the list twice for a seamless loop, and the scroll duration
is computed from the total width so the drift speed stays constant however
many photos there are.

### Tuning

Both knobs live in `src/pages/index.astro`:

- **Speed** — `PX_PER_SEC` in the script block (currently 22 px/sec).
- **Strip height** — the `height` on `.marquee`.
