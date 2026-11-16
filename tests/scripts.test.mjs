// Tests for the skill's scripts. They drive the real runtime, so run setup first:
//
//   bash skills/make-poster/scripts/setup.sh
//   node --test tests/
//
// Without the runtime installed, the tests are skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const scripts = join(root, "skills/make-poster/scripts");
const fixture = (name) => join(root, "tests/fixtures", name);
const runtime = process.env.MAKE_POSTER_HOME ?? join(homedir(), ".cache", "make-poster");
const skip = existsSync(join(runtime, "node_modules", "playwright")) ? false : "runtime not installed (run setup.sh)";

const run = (script, ...args) => {
  const r = spawnSync(process.execPath, [join(scripts, script), ...args], { encoding: "utf8" });
  return { status: r.status, out: r.stdout, err: r.stderr };
};

// PNG width and height from the IHDR chunk
const pngSize = (path) => {
  const b = readFileSync(path);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

test("check-fit passes a poster that fits, including tightly leaded headlines", { skip }, () => {
  const r = run("check-fit.mjs", fixture("fits.html"));
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /fits/);
});

test("check-fit flags content outside the safe margin", { skip }, () => {
  const r = run("check-fit.mjs", fixture("safe-margin.html"));
  assert.equal(r.status, 1);
  assert.match(r.out, /outside the safe margin by 0\.40 in/);
});

test("check-fit flags text running out of a card (AllTheCareers stairs regression)", { skip }, () => {
  const r = run("check-fit.mjs", fixture("stairs-overflow.html"));
  assert.equal(r.status, 1);
  assert.match(r.out, /content spills out by [\d.]+ in: <div\.step\.s1>/);
});

test("check-fit flags content clipped by overflow: hidden", { skip }, () => {
  const r = run("check-fit.mjs", fixture("clipped.html"));
  assert.equal(r.status, 1);
  assert.match(r.out, /content clipped by [\d.]+ in: <div\.card>/);
});

test("check-fit flags overlapping siblings", { skip }, () => {
  const r = run("check-fit.mjs", fixture("sibling-overlap.html"));
  assert.equal(r.status, 1);
  assert.match(r.out, /<h1> "Overlappingblocks\." overlaps <div\.pull>/);
});

test("check-fit skips elements marked data-fit=\"ignore\"", { skip }, () => {
  const r = run("check-fit.mjs", fixture("ignored.html"));
  assert.equal(r.status, 0, r.out);
});

test("check-fit fails when there's no .poster element", { skip }, () => {
  const r = run("check-fit.mjs", fixture("no-poster.html"));
  assert.equal(r.status, 1);
  assert.match(r.out, /no \.poster element/);
});

test("check-fit and render.mjs warn about a font that didn't load, without failing", { skip }, () => {
  const fit = run("check-fit.mjs", fixture("missing-font.html"));
  assert.equal(fit.status, 0, fit.out);
  assert.match(fit.err, /warning: .*web font didn't load: .*does-not-exist\.woff2/);
  const out = mkdtempSync(join(tmpdir(), "make-poster-test-"));
  const render = run("render.mjs", fixture("missing-font.html"), join(out, "p.pdf"));
  assert.equal(render.status, 0, render.err);
  assert.match(render.err, /web font didn't load/);
});

test("render.mjs sizes previews from .poster, even when another element comes first", { skip }, () => {
  const out = mkdtempSync(join(tmpdir(), "make-poster-test-"));
  const r = run("render.mjs", fixture("script-first.html"), join(out, "p.pdf"), "--preview", join(out, "p.png"));
  assert.equal(r.status, 0, r.err);
  assert.deepEqual(pngSize(join(out, "p.png")), { width: 1600, height: Math.round((1600 * 11) / 8.5) });
  const info = run("pdf-info.mjs", join(out, "p.pdf"));
  assert.match(info.out, /1 page\(s\), 8\.50 × 11\.00 in/);
});

test("qr-check decodes a rendered QR code, or skips without OpenCV", { skip }, () => {
  const out = mkdtempSync(join(tmpdir(), "make-poster-test-"));
  const url = "https://example.com/make-poster";
  assert.equal(run("qr.mjs", url, join(out, "qr.svg")).status, 0);
  const svg = readFileSync(join(out, "qr.svg"), "utf8");
  writeFileSync(
    join(out, "qr.html"),
    readFileSync(fixture("fits.html"), "utf8").replace("example.com</div>", `<div style="width:1.2in">${svg}</div></div>`),
  );
  assert.equal(run("render.mjs", join(out, "qr.html"), join(out, "qr.pdf"), "--preview", join(out, "qr.png")).status, 0);

  const ok = run("qr-check.mjs", join(out, "qr.png"), "--expect", url);
  assert.equal(ok.status, 0, ok.out);
  if (/skipped/.test(ok.out)) return;
  assert.match(ok.out, /QR → https:\/\/example\.com\/make-poster/);
  const wrong = run("qr-check.mjs", join(out, "qr.png"), "--expect", "https://elsewhere.example");
  assert.equal(wrong.status, 1);
  const none = run("qr-check.mjs", join(out, "p-missing.png"));
  assert.equal(none.status, 1);
});
