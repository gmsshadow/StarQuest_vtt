/**
 * Compiles packs/_source/<pack>/*.json into LevelDB compendium packs at
 * packs/<pack>, the format Foundry v14 loads.
 *
 * Run with: node tools/compile-packs.mjs
 * Requires: @foundryvtt/foundryvtt-cli (dev dependency).
 */

import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { readdirSync, existsSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "packs", "_source");

if (!existsSync(SRC)) {
  console.error("No packs/_source found. Run build-packs.mjs first.");
  process.exit(1);
}

const packs = readdirSync(SRC).filter((d) => statSync(join(SRC, d)).isDirectory());

for (const pack of packs) {
  const srcDir = join(SRC, pack);
  const outDir = join(ROOT, "packs", pack);
  rmSync(outDir, { recursive: true, force: true });
  await compilePack(srcDir, outDir);
  console.log(`Compiled pack: ${pack} -> packs/${pack}`);
}

console.log("All packs compiled.");
