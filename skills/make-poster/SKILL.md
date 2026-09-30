---
name: make-poster
description: Design printable posters advertising the current project, exported as PDF at the user's chosen size. Use when someone says "/make-poster", "make a poster", "design a flyer", "posters for campus", or wants print material promoting what they built. Reads the chat history, README and codebase for the product story and brand, asks about audience, size, number of designs and color mode, then designs, renders and self-reviews the posters.
version: 1.0.0
author: Amol Venkataraman
---

# /make-poster

Turn the project into print-ready posters: real claims from the codebase, the
project's own brand, sized exactly for the paper they'll be printed on.

`<skill>` below means this skill's base directory. Requires Node 18+.

## 0. Parse the invocation

The user may pass options or plain language:

```
/make-poster
/make-poster --size tabloid --count 3 --color both
/make-poster for CS students, 2 designs, black and white
```

| Option | Values | Default |
|---|---|---|
| `--size` | preset from `references/design-guide.md` (`letter`, `a4`, `tabloid`, `a3`, `18x24`, `24x36`, …) or `WxH` with units (`11x17in`, `420x594mm`) | ask |
| `--orientation` | `portrait`, `landscape` | `portrait` |
| `--count` | number of distinct designs, 1–6 | ask |
| `--color` | `color`, `mono`, `both` | ask |
| `--audience` | freeform | ask |
| `--out` | output directory | ask (suggest `~/Posters/<project>-<date>/`) |
| `--bleed` | flag: add 0.125in bleed for professional printers | off |

Anything answered by the invocation is not asked again.

## 1. Gather the product story (before asking anything)

Read, don't guess. Collect:

- **This conversation.** What was built, changed or shipped in this session is often
  the freshest and most specific material. Prefer it for "what's new".
- **README, CLAUDE.md, package.json** (name, description), docs/.
- **User-facing copy**: the landing page, headings, CTAs, onboarding text, changelog or
  blog entries (`data/`, `content/`, `CHANGELOG*`). Reuse the project's own voice.
- **Brand**: CSS variables and theme tokens (e.g. `app/globals.css`, Tailwind config),
  fonts (e.g. `next/font` imports), logo and icon files (`public/`, `app/icon.*`).
- **Where to send people**: the production URL (README, deploy config such as
  `wrangler.jsonc` routes, `vercel.json`, `homepage` in package.json).
- **Facts worth printing**: real numbers only (e.g. listings count, supported
  schools), with where they came from. Read-only queries are fine; never write.
- **Recent history**: `git log --oneline -30` for what shipped lately.

Write a short **product brief** for yourself: one-line pitch, 3–5 concrete benefits
(each traced to code or copy), audience hints, brand colors and fonts, URL, logo
path. Show the user a 3–5 line summary of it before the questions, so they can
correct anything.

## 2. Ask the user

Use AskUserQuestion (at most 4 questions per call; skip anything already known).
Put a recommended option first, based on the brief.

**Round 1 (always):**
1. **Audience**: who should stop and read it (e.g. first-year students, grads
   job hunting, a specific club or campus). Offer 2–3 options from the brief.
2. **Size**: common presets (Letter/A4 flyer, Tabloid 11×17 / A3, 18×24, 24×36),
   with where each is typically used. "Other" covers custom sizes.
3. **Number of designs**: 1, 2, 3 (Recommended), 4. Each is a different concept,
   not a recolor.
4. **Color**: Color, Monochrome (for photocopying and cheap printing), Both.

**Round 2 (one call):**
- **Where it will hang** and the viewing distance (bulletin board, dorm, career
  fair booth, handout). This drives type sizes.
- **Goal / call to action**: visit the site (with QR code), sign up, attend
  something. Confirm the URL for the QR code.
- **Must-include or must-avoid**: features, logos, event details, sponsor lines,
  claims to leave out.
- **Output folder** (suggest `~/Posters/<project>-<YYYY-MM-DD>/`). Never write
  posters into the project repo unless asked.

## 3. Concepts

Plan one distinct concept per design: a different angle, headline and layout
(e.g. a bold question headline; a "before/after" contrast; a feature checklist;
a big real stat). Present them in a compact table (concept, headline, layout,
what makes it different) and continue unless the user objects.

Copy rules:
- Every claim must come from the brief. No invented stats, testimonials, awards,
  prices or partner logos. Volatile numbers get rounded down ("8,000+ jobs").
- One headline, one supporting line, at most 3 short points, one CTA.
- Write for the audience's situation, in the project's voice.

## 4. Build

Follow `references/design-guide.md` for print rules (sizes, margins, type scale,
QR codes, monochrome, bleed).

- Work in the output folder: `src/<design-slug>[-mono].html`, `pdf/`, `preview/`.
- One self-contained HTML file per design and color variant, sized with
  `@page { size: <W> <H>; margin: 0 }` and a root element of exactly that size in
  physical units. Inline all CSS. Fonts: the project's fonts (copy the files or use
  Google Fonts links), falling back to system fonts.
- Brand: use the project's colors and fonts; logo from the repo (inline the SVG or
  embed as a data URI).
- Layout skeleton (it avoids both overflow and lopsided spacing): the root
  `.poster` is a flex column with the safe margin as its padding; header (logo,
  optional badge) at the top, `<div class="content">` with `margin: auto 0` (so spare
  height splits evenly above and below it), and the CTA card last. `check-fit.mjs`
  relies on the root having class `poster`.
- QR code for the CTA URL: `node <skill>/scripts/qr.mjs <url> <out.svg>`, then
  inline the SVG. If the user wants to measure scans, make one code per variant
  (`?utm_source=poster&utm_campaign=<design>` and `<design>-mono`); keep the
  printed URL short and clean.
- Generating several variants from one small script (shared logo, CTA, fonts) keeps
  them consistent; each output file must still be self-contained.
- **Monochrome variants are designed, not filtered**: pure black on white, no
  large solid fills, no meaning carried by color alone.

## 5. Render and self-review

One-time setup (installs Playwright's Chromium and helpers into
`~/.cache/make-poster`; ask before running it the first time, it downloads
~150 MB):

```bash
bash <skill>/scripts/setup.sh
```

Render each HTML file to a PDF at its exact size plus a PNG preview:

```bash
node <skill>/scripts/render.mjs src/<file>.html pdf/<file>.pdf --preview preview/<file>.png
# add --grayscale-preview preview/<file>-gray.png for color designs,
# to check they still read when photocopied
```

Check that nothing overflows the safe margin (exits non-zero if something does;
previews alone make small overflows easy to miss):

```bash
node <skill>/scripts/check-fit.mjs src/*.html
```

**Look at every preview** (Read the PNG) and check against the review list in
`references/design-guide.md`: nothing clipped or overflowing, margins safe,
hierarchy readable at a glance, contrast, QR code large with quiet zone,
correct URL, no leftover placeholder text, matches the chosen size. Fix and
re-render; up to 3 rounds per design. Also confirm each PDF's page size:

```bash
node <skill>/scripts/pdf-info.mjs pdf/*.pdf
```

Then merge everything into one file for easy printing:

```bash
node <skill>/scripts/merge.mjs pdf/all-posters.pdf pdf/*.pdf
```

## 6. Deliver

Report:
- the output folder, with each design's PDF (and mono/color variants), the merged
  PDF and previews;
- per design: concept, headline, and where it works best;
- print notes: paper size, "print at 100% / actual size", home printers can't print
  to the edge (the design keeps a safe margin), bleed on or off, and suggested
  paper (matte, 100 lb / 150 gsm for posters);
- anything assumed that the user should check (e.g. a stat's date).

Offer follow-ups: another size, more designs, a variant for a different audience,
or social-media crops of the same designs.
