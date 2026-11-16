# Poster design guide

## Size presets

| Preset | Size | Typical use |
|---|---|---|
| `letter` | 8.5 × 11 in | Flyers, handouts, small boards (US/Canada) |
| `a4` | 210 × 297 mm | Flyers, handouts (elsewhere) |
| `tabloid` | 11 × 17 in | Campus bulletin boards (US/Canada) |
| `a3` | 297 × 420 mm | Bulletin boards (elsewhere) |
| `18x24` | 18 × 24 in | Hallway posters, print shops |
| `a2` | 420 × 594 mm | Hallway posters |
| `24x36` | 24 × 36 in | Large posters, career fair booths |
| `a1` | 594 × 841 mm | Large posters |

Landscape swaps width and height. Custom sizes: `WxH` plus `in` or `mm`.

## Margins and bleed

- **Safe margin**: keep all text, QR codes and logos at least 0.5 in (12 mm) from
  the edge on Letter/A4/Tabloid, 0.75 in on larger sizes. Home and office printers
  can't print to the edge.
- **Bleed** (`--bleed`, for print shops): extend the page by 0.125 in (3 mm) on every
  side, run backgrounds into it, and keep the safe margin measured from the trim
  line. Say in the delivery notes that the PDF includes bleed.

## Type scale by size (minimums)

Readable from distance: about 1 in of letter height per 10 ft of viewing distance.

| Size | Headline | Supporting line | Body / points | Fine print |
|---|---|---|---|---|
| Letter / A4 | 54 pt | 24 pt | 16 pt | 10 pt |
| Tabloid / A3 | 80 pt | 32 pt | 22 pt | 12 pt |
| 18 × 24 / A2 | 120 pt | 48 pt | 32 pt | 16 pt |
| 24 × 36 / A1 | 160 pt | 64 pt | 44 pt | 20 pt |

Use pt in CSS (1 pt = 1/72 in). Headlines: tight leading (1.0–1.1), 2–7 words.
Body: 1.3–1.4 leading, short lines.

## Hierarchy (the 3-second test)

A passer-by should get, in order: **what it is → why they'd care → what to do**.
- One dominant element (headline or big visual) taking ~30–40% of the height.
- One supporting line, at most 3 points, one CTA with the QR code.
- Generous empty space; left-aligned or strictly centered, not mixed.
- The product name and URL appear in text, not only in the logo or QR code.

## QR codes

- At least 1 in (25 mm) on Letter/A4, 1.5 in on Tabloid/A3, 2.5 in+ on larger sizes.
- Keep a white quiet zone of 4 modules around it (the script includes it); never
  place it on a busy or dark background without a white plate.
- Label it with an action ("Scan to find your co-op") and print the URL next to it.
- Use the shortest URL that works; long URLs make dense, harder-to-scan codes.

## Color

- Use the project's brand colors; one accent color plus neutrals is usually enough.
- Text contrast of at least 4.5:1, and 7:1 for small text.
- Check the grayscale preview of color designs: many are photocopied.

## Monochrome

- Designed for black toner on white paper: pure black (#000) on white.
- Avoid large solid black areas (streaky and toner-heavy); use outlines, bold type
  and hatching instead of fills.
- No meaning carried by color; no gray text lighter than 60% black.

## Gotchas

- No frames or borders at the page edge: most printers can't print there, so they
  come out clipped or uneven. Keep decorative edges inside the safe margin.
- Full-bleed color backgrounds get a thin white border on home printers; mention it
  in the print notes (or use `--bleed` for a print shop).
- Underlined headline words: set `text-decoration-skip-ink: none`, or the line breaks
  around descenders and looks dashed.
- Read badges and slogans out of context: "100% free" on its own looks like a food
  label. Say what's free ("Free for students", "Free to use").

## Truthful copy

- Every claim comes from the codebase, its copy, or the conversation.
- No invented numbers, testimonials, awards, prices or partner logos.
- Round volatile numbers down and prefer durable phrasing ("thousands of jobs").

## Review checklist (for every preview)

- [ ] Page size matches the request (check with `pdf-info.mjs`).
- [ ] `check-fit.mjs` passes with no font warnings; nothing clipped or hidden; spare space is balanced,
      not piled into one gap.
- [ ] Headline readable from across a room; hierarchy passes the 3-second test.
- [ ] QR code big enough, with a quiet zone, pointing at the right URL; URL printed.
      `qr-check.mjs` decodes it from the preview when OpenCV is available.
- [ ] Brand colors and fonts are the project's; the logo isn't distorted.
- [ ] Contrast is fine, including in the grayscale preview.
- [ ] No placeholder text, typos, or claims not backed by the brief.
- [ ] Designs are genuinely different concepts, not recolors.
