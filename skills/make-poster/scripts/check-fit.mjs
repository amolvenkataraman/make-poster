// Checks that each poster's content fits inside its safe margin (the root element's
// padding). Expects the poster's root element to have class "poster".
//
//   node check-fit.mjs src/*.html
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { load } from "./runtime.mjs";

const { chromium } = load("playwright");
const browser = await chromium.launch();
let failed = 0;
try {
  for (const file of process.argv.slice(2)) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const poster = document.querySelector(".poster");
      if (!poster) return null;
      const box = poster.getBoundingClientRect();
      const cs = getComputedStyle(poster);
      const safe = {
        top: box.top + parseFloat(cs.paddingTop),
        right: box.right - parseFloat(cs.paddingRight),
        bottom: box.bottom - parseFloat(cs.paddingBottom),
        left: box.left + parseFloat(cs.paddingLeft),
      };
      // Every visible element, not just direct children, so nested overflow is caught
      let worst = { over: 0, what: "" };
      for (const el of poster.querySelectorAll("*")) {
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        const over = Math.max(safe.top - b.top, b.right - safe.right, b.bottom - safe.bottom, safe.left - b.left);
        if (over > worst.over) worst = { over, what: `<${el.tagName.toLowerCase()} class="${el.className}">` };
      }
      return { over: worst.over / 96, what: worst.what };
    });
    if (!r) {
      console.log(`${file}: no .poster element`);
      failed++;
    } else if (r.over > 0.01) {
      console.log(`${file}: OVERFLOWS the safe margin by ${r.over.toFixed(2)} in (${r.what})`);
      failed++;
    } else {
      console.log(`${file}: fits`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
