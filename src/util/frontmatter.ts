import { Notice, type App, type CachedMetadata, type TFile } from "obsidian";

/** YAML keys we never want to show as user properties. */
const HIDDEN_KEYS = new Set(["position", "frontmatter"]);

export function frontmatterEntries(
  cache: CachedMetadata | null,
): Array<[string, unknown]> {
  const fm = cache?.frontmatter;
  if (!fm || typeof fm !== "object") return [];
  return Object.entries(fm as Record<string, unknown>).filter(
    ([key]) => !HIDDEN_KEYS.has(key),
  );
}

/**
 * Locate the source line of a frontmatter key path, so the panel can jump from
 * a property back to the note. Numeric segments (array indexes) are not
 * resolvable by scanning and terminate the search at the owning key.
 */
export function findFrontmatterLine(
  lines: string[],
  cache: CachedMetadata | null,
  path: string[],
): number | null {
  const block = frontmatterBlock(lines, cache);
  if (!block) return null;

  let searchFrom = block.start + 1;
  const searchTo = block.end; // exclusive: the closing `---`
  let indent = -1;
  let found: number | null = null;

  for (const segment of path) {
    if (/^\d+$/.test(segment)) break; // array item: keep the owning key's line
    let hit: number | null = null;
    for (let i = searchFrom; i < searchTo; i++) {
      const match = matchKeyLine(lines[i]);
      if (!match) continue;
      if (match.indent <= indent) break; // left the parent block
      if (match.key === segment) {
        hit = i;
        indent = match.indent;
        break;
      }
    }
    if (hit === null) break;
    found = hit;
    searchFrom = hit + 1;
  }
  return found;
}

function frontmatterBlock(
  lines: string[],
  cache: CachedMetadata | null,
): { start: number; end: number } | null {
  const position = cache?.frontmatterPosition;
  if (position) {
    return { start: position.start.line, end: position.end.line };
  }
  if (lines[0]?.trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return { start: 0, end: i };
  }
  return null;
}

function matchKeyLine(raw: string): { key: string; indent: number } | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  // `- key: value` list items carry the key after the dash.
  const dash = /^(\s*)-(\s+)/.exec(raw);
  const indent = dash ? dash[1].length + 2 : raw.length - raw.trimStart().length;
  const body = dash ? raw.slice(dash[0].length) : raw;
  const match = /^(?:"([^"]+)"|'([^']+)'|([^:\s][^:]*?))\s*:/.exec(body);
  if (!match) return null;
  const key = match[1] ?? match[2] ?? match[3];
  if (key === undefined) return null;
  return { key: key.trim(), indent };
}

export type PathEdit = { op: "set"; value: unknown } | { op: "delete" };

/**
 * Read-modify-write a (possibly nested) frontmatter value through Obsidian's
 * own serializer, so the rest of the block keeps its formatting.
 */
export async function applyPathEdit(
  app: App,
  file: TFile,
  path: string[],
  edit: PathEdit,
): Promise<void> {
  if (path.length === 0) return;
  try {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
      let target: unknown = frontmatter;
      for (let i = 0; i < path.length - 1; i++) {
        target = descend(target, path[i]);
        if (target === undefined) return;
      }
      const last = path[path.length - 1];
      if (Array.isArray(target)) {
        const index = Number(last);
        if (!Number.isInteger(index) || index < 0 || index >= target.length) return;
        if (edit.op === "delete") target.splice(index, 1);
        else target[index] = edit.value;
        return;
      }
      if (target && typeof target === "object") {
        const record = target as Record<string, unknown>;
        if (edit.op === "delete") delete record[last];
        else record[last] = edit.value;
      }
    });
  } catch (error) {
    new Notice(`Note inspector: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function descend(container: unknown, segment: string): unknown {
  if (Array.isArray(container)) return container[Number(segment)];
  if (container && typeof container === "object") {
    return (container as Record<string, unknown>)[segment];
  }
  return undefined;
}

/** Add a new top-level property; returns false when the key already exists. */
export async function addProperty(
  app: App,
  file: TFile,
  key: string,
  existing: string[],
  value: unknown = "",
): Promise<boolean> {
  if (existing.includes(key)) {
    new Notice(`Note inspector: ${key}`);
    return false;
  }
  await applyPathEdit(app, file, [key], { op: "set", value });
  return true;
}
