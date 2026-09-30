// Writes a QR code for a URL as an SVG (black on white, with the standard quiet zone).
//
//   node qr.mjs <url> <out.svg>
import { writeFileSync } from "node:fs";
import { load } from "./runtime.mjs";

const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error("Usage: node qr.mjs <url> <out.svg>");
  process.exit(1);
}
const QRCode = load("qrcode");
// Error correction "M" balances density and resilience to smudges on paper
const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 4 });
writeFileSync(out, svg);
console.log(`QR: ${out} → ${url}`);
