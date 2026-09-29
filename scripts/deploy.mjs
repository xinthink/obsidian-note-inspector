/**
 * Copy the built plugin into a vault's `.obsidian/plugins/<id>/` folder.
 *
 * Vault resolution order:
 *   1. `--vault <path>` on the command line
 *   2. `OBSIDIAN_VAULT` environment variable
 *   3. `vault` key of `config.json` in the repo root (git-ignored)
 *   4. the default iCloud vault used by this setup
 */
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = ["main.js", "manifest.json", "styles.css"];
const DEFAULT_VAULT = path.join(
  os.homedir(),
  "Library/Mobile Documents/iCloud~md~obsidian/Documents/wiki",
);

async function resolveVault() {
  const flag = process.argv.indexOf("--vault");
  if (flag > -1 && process.argv[flag + 1]) return path.resolve(process.argv[flag + 1]);
  if (process.env.OBSIDIAN_VAULT) return path.resolve(process.env.OBSIDIAN_VAULT);
  try {
    const config = JSON.parse(await readFile(path.join(root, "config.json"), "utf8"));
    if (config.vault) return path.resolve(config.vault);
  } catch {
    // no local config: fall through to the default vault
  }
  return DEFAULT_VAULT;
}

const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const vault = await resolveVault();

if (!existsSync(path.join(vault, ".obsidian"))) {
  console.error(`Not an Obsidian vault: ${vault}`);
  process.exit(1);
}

const target = path.join(vault, ".obsidian", "plugins", manifest.id);
await mkdir(target, { recursive: true });
for (const artifact of ARTIFACTS) {
  const source = path.join(root, artifact);
  if (!existsSync(source)) {
    console.error(`Missing build artifact: ${artifact} (run "npm run build" first)`);
    process.exit(1);
  }
  await copyFile(source, path.join(target, artifact));
}

console.log(`Deployed ${manifest.id}@${manifest.version} -> ${target}`);
