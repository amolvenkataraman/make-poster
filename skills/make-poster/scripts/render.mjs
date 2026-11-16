// Renders a poster HTML file to a PDF at the size set by its CSS @page rule, plus
// optional PNG previews of the .poster element.
//
//   node render.mjs <in.html> <out.pdf> [--preview out.png] [--grayscale-preview out.png]
//                   [--preview-width 1600]
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { load } from "./runtime.mjs";
import { POSTER_SELECTOR, openPoster, posterBox, warn } from "./poster-page.mjs";

const args = process.argv.slice(2);
const [input, output] = args;
if (!input || !output) {
  console.error("Usage: node render.mjs <in.html> <out.pdf> [--preview out.png] [--grayscale-preview out.png]");
  process.exit(1);
}
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const previewPath = opt("--preview");
const grayPath = opt("--grayscale-preview");
const previewWidth = Number(opt("--preview-width") ?? 1600);

const { chromium } = load("playwright");
const browser = await chromium.launch();
try {
  const { page, fontWarnings } = await openPoster(browser, input);
  warn(input, fontWarnings);

  mkdirSync(dirname(resolve(output)), { recursive: true });
  // preferCSSPageSize: the HTML's @page size is the single source of truth
  await page.pdf({ path: output, printBackground: true, preferCSSPageSize: true });
  console.log(`PDF: ${output}`);

  if (previewPath || grayPath) {
    // The same element check-fit.mjs measures
    const box = await posterBox(page);
    if (!box) {
      console.error(`${input}: no ${POSTER_SELECTOR} element to preview; give the poster's root element class "poster".`);
      process.exit(1);
    }
    const viewport = { width: Math.ceil(box.x + box.width), height: Math.ceil(box.y + box.height) };
    const shot = async (path, gray) => {
      // Loaded from the file itself so relative fonts and images still resolve
      const { page: p } = await openPoster(browser, input, { viewport, deviceScaleFactor: previewWidth / box.width });
      if (gray) await p.addStyleTag({ content: "html { filter: grayscale(1); }" });
      mkdirSync(dirname(resolve(path)), { recursive: true });
      await p.screenshot({ path, clip: box });
      await p.close();
      console.log(`Preview${gray ? " (grayscale)" : ""}: ${path}`);
    };
    if (previewPath) await shot(previewPath, false);
    if (grayPath) await shot(grayPath, true);
  }
} finally {
  await browser.close();
}
