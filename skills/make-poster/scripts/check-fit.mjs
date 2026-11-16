// Checks each poster's layout and exits non-zero if anything is wrong:
//   - content outside the safe margin (the .poster element's padding)
//   - content spilling out of (or clipped by) the box that holds it, e.g. text taller
//     than a fixed-height card
//   - sibling elements overlapping each other
// Also warns (without failing) when a web font didn't load.
//
// Absolutely positioned and transformed elements are treated as decoration for the
// spill and overlap checks (not the safe margin). Anything else that overlaps or bleeds
// on purpose can opt out with data-fit="ignore", which covers the element and everything
// inside it.
//
//   node check-fit.mjs src/*.html
import { load } from "./runtime.mjs";
import { POSTER_SELECTOR, openPoster, warn } from "./poster-page.mjs";

const MAX_REPORTED = 8;
const { chromium } = load("playwright");
const browser = await chromium.launch();
let failed = 0;
try {
  for (const file of process.argv.slice(2)) {
    const { page, fontWarnings } = await openPoster(browser, file);
    warn(file, fontWarnings);
    const issues = await page.evaluate(inspect, POSTER_SELECTOR);
    if (issues === null) {
      console.log(`${file}: no ${POSTER_SELECTOR} element`);
      failed++;
    } else if (issues.length) {
      console.log(`${file}: ${issues.length} layout problem${issues.length > 1 ? "s" : ""}`);
      for (const issue of issues.slice(0, MAX_REPORTED)) console.log(`  - ${issue}`);
      if (issues.length > MAX_REPORTED) console.log(`  - … and ${issues.length - MAX_REPORTED} more`);
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

// Runs in the page. Returns a list of problems, or null when there's no poster element.
function inspect(selector) {
  const poster = document.querySelector(selector);
  if (!poster) return null;
  const TOL = 1; // CSS px: ignores sub-pixel rounding for the safe margin
  const SPILL_TOL = 4.8; // CSS px (0.05 in): smaller spills and overlaps don't show in print
  const inches = (px) => `${(px / 96).toFixed(2)} in`;
  const ignored = (el) => el.closest('[data-fit="ignore"]') !== null;
  const describe = (el) => {
    const cls = typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/).join(".")}` : "";
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    return `<${el.tagName.toLowerCase()}${cls}>${text ? ` "${text.length > 40 ? `${text.slice(0, 40)}…` : text}"` : ""}`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  };
  const issues = [];
  const all = [...poster.querySelectorAll("*")].filter((el) => !ignored(el) && visible(el));

  // 1. Safe margin: every visible element stays inside the poster's padding box
  const box = poster.getBoundingClientRect();
  const cs = getComputedStyle(poster);
  const safe = {
    top: box.top + parseFloat(cs.paddingTop),
    right: box.right - parseFloat(cs.paddingRight),
    bottom: box.bottom - parseFloat(cs.paddingBottom),
    left: box.left + parseFloat(cs.paddingLeft),
  };
  let worst = { over: 0, el: null };
  for (const el of all) {
    const b = el.getBoundingClientRect();
    const over = Math.max(safe.top - b.top, b.right - safe.right, b.bottom - safe.bottom, safe.left - b.left);
    if (over > worst.over) worst = { over, el };
  }
  if (worst.over > TOL) issues.push(`outside the safe margin by ${inches(worst.over)}: ${describe(worst.el)}`);

  // 2. Content spilling out of the box that holds it: a child element past its parent's
  //    edge, or text past its element's edge. Text gets an allowance of 0.35em, since glyphs
  //    of tightly leaded headlines overhang their line boxes slightly by design.
  const edgeOverflow = (inner, outer) =>
    Math.max(inner.right - outer.right, inner.bottom - outer.bottom, outer.left - inner.left, outer.top - inner.top);
  const isInline = (el) => getComputedStyle(el).display === "inline";
  for (const el of all) {
    if (!(el instanceof HTMLElement) || isInline(el) || getComputedStyle(el).display === "contents") continue;
    const outer = el.getBoundingClientRect();
    // Largest spill past its allowance; `by` is the spill itself, for the report
    let worstSpill = { excess: 0, by: 0 };
    const note = (by, allowance) => {
      if (by - allowance > worstSpill.excess) worstSpill = { excess: by - allowance, by };
    };
    for (const kid of el.children) {
      if (ignored(kid) || !visible(kid) || isInline(kid)) continue;
      // Positioned and transformed (tilted, scaled) children are visual effects, not flow
      const ks = getComputedStyle(kid);
      if (["absolute", "fixed"].includes(ks.position) || ks.transform !== "none") continue;
      note(edgeOverflow(kid.getBoundingClientRect(), outer), SPILL_TOL);
    }
    // Text laid out by this element itself (including inside inline children like <b>)
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue;
      let host = node.parentElement;
      while (host !== el && isInline(host)) host = host.parentElement;
      if (host !== el) continue;
      const allowance = 0.35 * parseFloat(getComputedStyle(node.parentElement).fontSize);
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) note(edgeOverflow(r, outer), allowance);
    }
    if (worstSpill.excess > 0) {
      const clipped = getComputedStyle(el).overflow !== "visible";
      issues.push(`${clipped ? "content clipped" : "content spills out"} by ${inches(worstSpill.by)}: ${describe(el)}`);
    }
  }

  // 3. Siblings in normal flow overlapping each other
  const inFlow = (el) => {
    const s = getComputedStyle(el);
    return !["absolute", "fixed"].includes(s.position) && s.display !== "inline" && s.float === "none" && s.transform === "none";
  };
  for (const parent of [poster, ...all]) {
    const kids = [...parent.children].filter((el) => !ignored(el) && visible(el) && inFlow(el));
    for (let i = 0; i < kids.length; i++) {
      const a = kids[i].getBoundingClientRect();
      for (let j = i + 1; j < kids.length; j++) {
        const b = kids[j].getBoundingClientRect();
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > SPILL_TOL && h > SPILL_TOL) issues.push(`${describe(kids[i])} overlaps ${describe(kids[j])} (${inches(w)} × ${inches(h)})`);
      }
    }
  }
  return issues;
}
