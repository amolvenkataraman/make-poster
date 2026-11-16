# Changelog

## 1.1.0

Fixes for problems found while making a gallery of real posters, plus stricter
self-review.

### Fixed

- **Works again on a fresh install.** `setup.sh` used to install the newest Playwright,
  and Playwright 1.62 and later need Node.js 20, so on Node 18 rendering failed with
  Playwright's own error even though the README said Node 18 was enough. The runtime is
  now pinned (Playwright 1.64.0, qrcode 1.5.4, pdf-lib 1.17.1, with a lockfile) and
  installed with `npm ci`. `setup.sh` and the scripts check for Node 20 or newer and
  say how to upgrade. They also notice an outdated runtime and ask you to re-run
  `setup.sh`, which only reinstalls when the pinned versions change.
- **`check-fit.mjs` catches overflow inside the poster**, not only past the safe margin.
  Text running out of a fixed-height card used to pass, as in a stair-step layout where
  a label ran under the next element. It now also fails on:
  - a child element past its parent's edge, or text past its element's edge, reported
    as "clipped" when the box hides it (tightly leaded headlines still pass);
  - siblings that overlap each other.

  Absolutely positioned and transformed elements count as decoration. Anything else
  that overlaps on purpose can opt out with `data-fit="ignore"`.
- **Previews and the fit check measure the same element.** `render.mjs` sized previews
  from the first element in `<body>`, so a `<script>` or wrapper before the poster broke
  them. Both scripts now measure `.poster`.

### Added

- **Warnings for web fonts that fail to load.** `render.mjs` and `check-fit.mjs` report
  failed font files and font stylesheets, for example an offline Google Fonts link,
  instead of silently falling back to a system font.
- **`qr-check.mjs`**, an optional QR decode check. It decodes the codes in the previews
  with OpenCV and, with `--expect <url>`, confirms where they point. Without python3 and
  OpenCV it says "skipped" and exits 0.
- **Tests:** `node --test` runs the scripts against layout fixtures, including the
  stair-step regression. Run `setup.sh` first.
- **A gallery** of five real posters in the README.

### Changed

- Requires Node.js 20 or newer. In practice 1.0.0 already did, because its setup
  installed a Playwright that needs Node 20.

## 1.0.0

First release.

- Gathers the product story from the conversation, README, landing-page copy,
  changelog, recent commits, brand colors, fonts, logo and production URL.
- Asks about audience, paper size, number of designs, color or monochrome, where the
  posters will hang, the QR code target, and what to include or avoid.
- Proposes one distinct concept per design, not recolors.
- Builds each design as HTML/CSS at the exact physical size and renders it to PDF with
  headless Chromium, with PNG and grayscale previews.
- Monochrome variants designed for photocopiers, and QR codes with optional
  per-design UTM tags.
- Self-review: safe-margin fit check, page-size check, and a review checklist covering
  type size, contrast, QR size and unsupported claims, with fix-and-re-render rounds.
- Sizes from Letter and A4 up to 24 × 36 and A1, plus custom sizes and optional bleed.
