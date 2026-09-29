import type { SectionContext } from "../types";
import { openInternal, shortenUrl, tokenizeLinks } from "./links";

/**
 * Append `value` to `host`, turning internal links, markdown links and bare
 * URLs into clickable elements. Used for frontmatter strings and footnote
 * definitions, which are both plain markdown text.
 */
export function appendRichText(
  host: HTMLElement,
  value: string,
  ctx: SectionContext,
): void {
  for (const token of tokenizeLinks(value)) {
    if (token.kind === "text") {
      host.appendText(cleanInline(token.text));
      continue;
    }
    if (token.kind === "internal") {
      const anchor = host.createEl("a", {
        cls: "ni-link internal-link",
        text: token.text,
        href: token.target,
      });
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        openInternal(ctx.app, token.target, ctx.file.path);
      });
      continue;
    }
    const external = token.kind === "external" || /^https?:\/\//.test(token.target);
    const anchor = host.createEl("a", {
      cls: `ni-link ${external ? "external-link" : "internal-link"}`,
      text: external ? shortenUrl(token.text) : token.text,
      href: token.target,
      attr: { title: token.target },
    });
    if (!external) {
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        openInternal(ctx.app, token.target, ctx.file.path);
      });
    }
  }
}

/** Same text with links flattened and inline emphasis markers removed. */
export function plainText(value: string): string {
  return cleanInline(
    tokenizeLinks(value)
      .map((token) => token.text)
      .join(""),
  );
}

/** Closing punctuation that may follow an emphasis span (ASCII + CJK). */
const EMPHASIS_END = "[\\s.,;:!?)、，。：；！？）」』】》]|$";

const ITALIC_STAR = new RegExp(`(^|[\\s(])\\*([^*\\n]+)\\*(?=${EMPHASIS_END})`, "g");
const ITALIC_UNDERSCORE = new RegExp(`(^|[\\s(])_([^_\\n]+)_(?=${EMPHASIS_END})`, "g");

function cleanInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(ITALIC_STAR, "$1$2")
    .replace(ITALIC_UNDERSCORE, "$1$2");
}
