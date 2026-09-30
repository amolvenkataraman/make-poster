// Loads packages from the make-poster runtime (~/.cache/make-poster, see setup.sh)
// rather than the current project.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const RUNTIME_DIR = process.env.MAKE_POSTER_HOME ?? join(homedir(), ".cache", "make-poster");
process.env.PLAYWRIGHT_BROWSERS_PATH ??= join(RUNTIME_DIR, "browsers");

const require = createRequire(join(RUNTIME_DIR, "package.json"));

export function load(name) {
  if (!existsSync(join(RUNTIME_DIR, "node_modules", name))) {
    console.error(`Missing ${name}. Run: bash <skill>/scripts/setup.sh`);
    process.exit(1);
  }
  return require(name);
}
