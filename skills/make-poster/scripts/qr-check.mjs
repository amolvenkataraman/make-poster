// Optional check: decodes the QR codes in poster previews with OpenCV (Python's cv2) and
// confirms they point where they should. Skips without failing when python3 or OpenCV
// isn't installed (python3 -m pip install opencv-python-headless adds it).
// Decoding a preview is a good sign, not a guarantee: still scan one printed copy.
//
//   node qr-check.mjs preview/*.png [--expect https://example.com]
//
// --expect passes when every code found starts with that URL (so UTM variants match).
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const at = args.indexOf("--expect");
const expect = at === -1 ? undefined : args[at + 1];
const files = args.filter((_, i) => at === -1 || (i !== at && i !== at + 1));
if (!files.length) {
  console.error("Usage: node qr-check.mjs <preview.png> [more.png …] [--expect <url>]");
  process.exit(1);
}

// Tries the image as is, then scaled, since small codes in a large preview can be missed
// (the current directory is dropped from sys.path so a stray cv2.py or json.py there can't load)
const PY = `
import sys
sys.path = [p for p in sys.path if p not in ("", ".")]
import json
try:
    import cv2
except ImportError:
    sys.exit(3)
detector = cv2.QRCodeDetector()
for path in sys.argv[1:]:
    img = cv2.imread(path)
    codes = []
    if img is not None:
        for scale in (1.0, 1.5, 0.5):
            frame = img if scale == 1.0 else cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            ok, found, _, _ = detector.detectAndDecodeMulti(frame)
            codes = [c for c in (found if ok else []) if c]
            if codes:
                break
    print(json.dumps({"file": path, "codes": codes, "readable": img is not None}))
`;

const run = spawnSync("python3", ["-c", PY, ...files], { encoding: "utf8" });
if (run.error || run.status === 3) {
  console.log("QR check skipped: needs python3 with OpenCV (python3 -m pip install opencv-python-headless).");
  process.exit(0);
}
if (run.status !== 0) {
  console.error(`QR check failed to run:\n${run.stderr}`);
  process.exit(1);
}

let failed = 0;
for (const line of run.stdout.trim().split("\n")) {
  const { file, codes, readable } = JSON.parse(line);
  if (!readable) {
    console.log(`${file}: can't read the image`);
    failed++;
  } else if (!codes.length) {
    console.log(`${file}: no QR code could be decoded`);
    failed++;
  } else if (expect && !codes.every((c) => c.startsWith(expect))) {
    console.log(`${file}: QR code points to ${codes.join(", ")}, expected ${expect}`);
    failed++;
  } else {
    console.log(`${file}: QR → ${codes.join(", ")}`);
  }
}
process.exit(failed ? 1 : 0);
