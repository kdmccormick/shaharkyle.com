# Fonts

Self-hosted rather than loaded from Google, for two reasons: their copy costs
two extra connections (`fonts.googleapis.com` for the CSS, then
`fonts.gstatic.com` for the files) before any text can paint, and it reports
every visitor to Google — on a page whose visitors are a wedding guest list.

| file | family | licence |
| --- | --- | --- |
| `permanent-marker-latin.woff2` | Permanent Marker | Apache License 2.0 |
| `special-elite-latin.woff2` | Special Elite | Apache License 2.0 |
| `special-elite-latin-ext.woff2` | Special Elite (latin-ext) | Apache License 2.0 |

Both faces are Apache-2.0, which permits redistribution — that is what makes
serving them from this domain allowed, not just convenient.

The files are exactly what Google serves; the `@font-face` rules at the top of
the stylesheet in `src/pages/index.astro` carry the same `unicode-range`
values their CSS uses, so the browser still skips the latin-ext file unless a
character needs it.

## Updating them

Fetch their stylesheet with a browser user-agent (with anything else you get
older `woff` instead of `woff2`), then download whatever URLs it names:

```sh
curl -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
  AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' \
  'https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Special+Elite&display=swap'
```

Keep the `unicode-range` values in sync with whatever that CSS returns.
