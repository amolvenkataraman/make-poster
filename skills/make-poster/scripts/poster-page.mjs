// Shared by render.mjs and check-fit.mjs: opens a poster HTML file in headless Chromium,
// waits for its fonts, and collects web fonts that failed to load, so a missing font is
// reported instead of silently falling back to a system font.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// The poster's root element: its box is the page, its padding is the safe margin
export const POSTER_SELECTOR = ".poster";

const shortUrl = (url) => (url.startsWith("data:") ? "an embedded data: font" : url.slice(0, 120));
const isFontRequest = (req) => ["font", "stylesheet"].includes(req.resourceType());

export async function openPoster(browser, file, contextOptions = {}) {
  const page = await browser.newPage(contextOptions);
  const failed = new Set();
  page.on("requestfailed", (req) => {
    if (isFontRequest(req)) failed.add(`${shortUrl(req.url())} (${req.failure()?.errorText ?? "failed"})`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && isFontRequest(res.request())) failed.add(`${shortUrl(res.url())} (HTTP ${res.status()})`);
  });

  await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const broken = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === "error").map((f) => `${f.family.replace(/"/g, "")} ${f.weight}`),
  );

  const fontWarnings = [...failed, ...new Set(broken).values()].map((w) => `web font didn't load: ${w}`);
  return { page, fontWarnings };
}

// The poster's box in CSS pixels, or null when the file has no .poster element
export function posterBox(page) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
  }, POSTER_SELECTOR);
}

export function warn(file, messages) {
  for (const m of messages) console.error(`warning: ${file}: ${m}`);
}
