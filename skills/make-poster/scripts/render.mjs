// Renders a poster HTML file to a PDF at the size set by its CSS @page rule, plus
// optional PNG previews.
//
//   node render.mjs <in.html> <out.pdf> [--preview out.png] [--grayscale-preview out.png]
//                   [--preview-width 1600]
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "./runtime.mjs";

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
const url = pathToFileURL(resolve(input)).href;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  mkdirSync(dirname(resolve(output)), { recursive: true });
  // preferCSSPageSize: the HTML's @page size is the single source of truth
  await page.pdf({ path: output, printBackground: true, preferCSSPageSize: true });
  console.log(`PDF: ${output}`);

  if (previewPath || grayPath) {
    // Size the viewport to the poster's root element, scaled to the preview width
    const { width, height } = await page.evaluate(() => {
      const el = document.body.firstElementChild ?? document.body;
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    const viewport = { width: Math.ceil(width), height: Math.ceil(height) };
    const shot = async (path, gray) => {
      // Loaded from the file itself so relative fonts and images still resolve
      const p = await browser.newPage({ viewport, deviceScaleFactor: previewWidth / width });
      await p.goto(url, { waitUntil: "networkidle" });
      if (gray) await p.addStyleTag({ content: "html { filter: grayscale(1); }" });
      await p.evaluate(() => document.fonts.ready);
      mkdirSync(dirname(resolve(path)), { recursive: true });
      await p.screenshot({ path });
      await p.close();
      console.log(`Preview${gray ? " (grayscale)" : ""}: ${path}`);
    };
    if (previewPath) await shot(previewPath, false);
    if (grayPath) await shot(grayPath, true);
  }
} finally {
  await browser.close();
}
