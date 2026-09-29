/**
 * Sanity checks for the plugin metadata, run in CI and before a release.
 *
 *   node scripts/check-manifest.mjs                 # metadata consistency
 *   node scripts/check-manifest.mjs 1.2.3           # and tag == version
 *   node scripts/check-manifest.mjs 1.2.3 --assets  # and release files exist
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => JSON.parse(readFileSync(path.join(root, name), "utf8"));

const manifest = read("manifest.json");
const pkg = read("package.json");
const versions = read("versions.json");
const tag = process.argv[2];

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

check(/^[a-z0-9-]+$/.test(manifest.id), `id must be kebab-case: ${manifest.id}`);
check(!manifest.id.includes("obsidian"), "id must not contain 'obsidian'");
check(
  typeof manifest.name === "string" && manifest.name.length > 0 && !/obsidian/i.test(manifest.name),
  "name must not contain 'obsidian'",
);
check(
  typeof manifest.description === "string" && manifest.description.length <= 250,
  `description must be at most 250 characters (currently ${manifest.description?.length})`,
);
check(
  /^\d+\.\d+\.\d+$/.test(manifest.version),
  `version must be x.y.z: ${manifest.version}`,
);
check(
  manifest.version === pkg.version,
  `manifest.json version (${manifest.version}) must match package.json (${pkg.version})`,
);
check(
  versions[manifest.version] === manifest.minAppVersion,
  `versions.json needs "${manifest.version}": "${manifest.minAppVersion}"`,
);
check(typeof manifest.author === "string" && manifest.author.length > 0, "author is required");
check(typeof manifest.authorUrl === "string", "authorUrl is recommended");
check(typeof manifest.isDesktopOnly === "boolean", "isDesktopOnly must be a boolean");

if (process.argv.includes("--assets")) {
  for (const file of ["main.js", "manifest.json", "styles.css"]) {
    try {
      readFileSync(path.join(root, file));
    } catch {
      problems.push(`missing release asset: ${file} (run "npm run build" first)`);
    }
  }
}

if (tag !== undefined) {
  check(
    tag === manifest.version,
    `tag "${tag}" must equal the manifest version "${manifest.version}"`,
  );
}

if (problems.length > 0) {
  console.error("Metadata check failed:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`Metadata ok: ${manifest.id}@${manifest.version} (minAppVersion ${manifest.minAppVersion})`);
