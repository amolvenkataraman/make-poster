// Merges PDFs into one file, in the order given (the output is skipped if listed).
//
//   node merge.mjs <out.pdf> <in1.pdf> [in2.pdf …]
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { load } from "./runtime.mjs";

const [out, ...inputs] = process.argv.slice(2);
if (!out || inputs.length === 0) {
  console.error("Usage: node merge.mjs <out.pdf> <in1.pdf> [in2.pdf …]");
  process.exit(1);
}
const { PDFDocument } = load("pdf-lib");
const merged = await PDFDocument.create();
for (const file of inputs.filter((f) => resolve(f) !== resolve(out))) {
  const doc = await PDFDocument.load(readFileSync(file));
  for (const page of await merged.copyPages(doc, doc.getPageIndices())) merged.addPage(page);
}
writeFileSync(out, await merged.save());
console.log(`Merged ${merged.getPageCount()} pages → ${out}`);
