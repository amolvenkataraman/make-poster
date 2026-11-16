// Loads packages from the make-poster runtime (~/.cache/make-poster, see setup.sh)
// rather than the current project, after checking Node and the pinned versions.
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIN_NODE = 20;
const SETUP = `bash ${join(dirname(fileURLToPath(import.meta.url)), "setup.sh")}`;

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < MIN_NODE) {
  console.error(
    `make-poster needs Node.js ${MIN_NODE} or newer; this is ${process.version}.\n` +
      "Install a current LTS (for example: nvm install --lts && nvm use --lts), then run this again.",
  );
  process.exit(1);
}

export const RUNTIME_DIR = process.env.MAKE_POSTER_HOME ?? join(homedir(), ".cache", "make-poster");
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(RUNTIME_DIR, "browsers");

const require = createRequire(join(RUNTIME_DIR, "package.json"));
const pinned = JSON.parse(
  readFileSync(new URL("../runtime/package.json", import.meta.url), "utf8"),
).dependencies;

export function load(name) {
  const manifest = join(RUNTIME_DIR, "node_modules", name, "package.json");
  if (!existsSync(manifest)) {
    console.error(`Missing ${name}. Run: ${SETUP}`);
    process.exit(1);
  }
  const installed = JSON.parse(readFileSync(manifest, "utf8")).version;
  if (pinned[name] && installed !== pinned[name]) {
    console.error(`${name} ${installed} is installed but make-poster expects ${pinned[name]}. Run: ${SETUP}`);
    process.exit(1);
  }
  return require(name);
}
