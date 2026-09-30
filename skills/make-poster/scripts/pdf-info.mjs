// Prints each PDF's page count and page size, to confirm posters match the request.
//
//   node pdf-info.mjs <file.pdf> [more.pdf …]
import { readFileSync } from "node:fs";
import { load } from "./runtime.mjs";

const { PDFDocument } = load("pdf-lib");
for (const file of process.argv.slice(2)) {
  const doc = await PDFDocument.load(readFileSync(file));
  const sizes = doc.getPages().map((p) => {
    const { width, height } = p.getSize(); // points (1/72 in)
    const inch = (v) => (v / 72).toFixed(2);
    const mm = (v) => ((v / 72) * 25.4).toFixed(0);
    return `${inch(width)} × ${inch(height)} in (${mm(width)} × ${mm(height)} mm)`;
  });
  console.log(`${file}: ${doc.getPageCount()} page(s), ${[...new Set(sizes)].join("; ")}`);
}
