import type { App } from "obsidian";

export interface LinkToken {
  kind: "text" | "internal" | "markdown" | "external";
  text: string;
  target: string;
}

const LINK_PATTERN =
  /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]|\[([^\]]*)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+)/g;

/** Split a frontmatter string into plain text and clickable link tokens. */
export function tokenizeLinks(value: string): LinkToken[] {
  const tokens: LinkToken[] = [];
  let cursor = 0;
  LINK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_PATTERN.exec(value)) !== null) {
    if (match.index > cursor) {
      tokens.push({ kind: "text", text: value.slice(cursor, match.index), target: "" });
    }
    if (match[1] !== undefined) {
      tokens.push({
        kind: "internal",
        text: match[2] ?? match[1],
        target: match[1],
      });
    } else if (match[3] !== undefined) {
      tokens.push({ kind: "markdown", text: match[3], target: match[4] });
    } else if (match[5] !== undefined) {
      const url = match[5].replace(/[.,;:]+$/, "");
      tokens.push({ kind: "external", text: url, target: url });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) {
    tokens.push({ kind: "text", text: value.slice(cursor), target: "" });
  }
  return tokens;
}

export function openInternal(app: App, target: string, sourcePath: string): void {
  void app.workspace.openLinkText(target, sourcePath, false);
}

/** Shorten a long URL for display, keeping head and tail readable. */
export function shortenUrl(url: string, max = 48): string {
  if (url.length <= max) return url;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${url.slice(0, head)}…${url.slice(url.length - tail)}`;
}
