import { setIcon, type FootnoteCache, type FootnoteRefCache } from "obsidian";
import { createCollapsibleSection } from "../components/collapsible";
import { t } from "../i18n";
import type { SectionContext } from "../types";
import { emptyState, truncate } from "../util/dom";
import { appendRichText, plainText } from "../util/rich-text";

interface FootnoteGroup {
  id: string;
  /** Footnote number as rendered by Obsidian (reference order). */
  index: number | null;
  definition: FootnoteCache | null;
  references: FootnoteRefCache[];
}

export function renderFootnotesSection(parent: HTMLElement, ctx: SectionContext): void {
  const settings = ctx.plugin.settings;
  const groups = collectGroups(ctx);

  createCollapsibleSection(parent, {
    id: "footnotes",
    title: t("footnotes"),
    collapsed: settings.collapsed.footnotes,
    count: groups.length,
    showCount: settings.showCounts,
    onToggle: (collapsed) => ctx.plugin.setSectionCollapsed("footnotes", collapsed),
    buildBody: (body) => {
      if (groups.length === 0) {
        emptyState(body, t("footnotesEmpty"));
        return;
      }
      const list = body.createDiv({ cls: "np-footnotes" });
      for (const group of groups) renderFootnote(list, ctx, group);
    },
  });
}

function collectGroups(ctx: SectionContext): FootnoteGroup[] {
  const refs = [...(ctx.cache?.footnoteRefs ?? [])].sort(
    (a, b) => a.position.start.line - b.position.start.line,
  );
  const defs = [...(ctx.cache?.footnotes ?? [])].sort(
    (a, b) => a.position.start.line - b.position.start.line,
  );

  const groups = new Map<string, FootnoteGroup>();
  const ensure = (id: string): FootnoteGroup => {
    let group = groups.get(id);
    if (!group) {
      group = { id, index: null, definition: null, references: [] };
      groups.set(id, group);
    }
    return group;
  };

  for (const ref of refs) ensure(ref.id).references.push(ref);
  for (const def of defs) ensure(def.id).definition = def;

  const ordered = [...groups.values()].sort((a, b) => orderKey(a) - orderKey(b));
  let counter = 0;
  for (const group of ordered) {
    if (group.references.length > 0) group.index = ++counter;
  }
  return ordered;
}

function orderKey(group: FootnoteGroup): number {
  if (group.references.length > 0) return group.references[0].position.start.line;
  return group.definition?.position.start.line ?? Number.MAX_SAFE_INTEGER;
}

function renderFootnote(parent: HTMLElement, ctx: SectionContext, group: FootnoteGroup): void {
  const card = parent.createDiv({ cls: "np-fn" });
  if (!group.definition) card.addClass("is-undefined");
  if (group.references.length === 0) card.addClass("is-unused");

  const head = card.createDiv({ cls: "np-fn-head" });
  head.createSpan({
    cls: "np-fn-index",
    text: group.index === null ? "·" : String(group.index),
  });
  const idEl = head.createSpan({ cls: "np-fn-id", text: group.id });
  idEl.title = group.id;

  const meta = head.createSpan({ cls: "np-fn-meta" });
  if (!group.definition) {
    meta.setText(t("footnoteMissing"));
  } else if (group.references.length === 0) {
    meta.setText(t("footnoteUnused"));
  } else {
    meta.setText(
      group.references.length === 1
        ? t("footnoteReferenceOne")
        : t("footnoteReferenceMany", { n: group.references.length }),
    );
  }

  renderDefinition(card, ctx, group);
  if (ctx.plugin.settings.showFootnoteContext) renderReferences(card, ctx, group);
}

function renderDefinition(
  parent: HTMLElement,
  ctx: SectionContext,
  group: FootnoteGroup,
): void {
  const host = parent.createDiv({ cls: "np-fn-def" });
  if (!group.definition) {
    host.addClass("is-missing");
    host.createSpan({ text: t("footnoteMissing") });
    return;
  }
  const definition = group.definition;
  const text = readDefinition(ctx, definition);
  const expanded = ctx.view.ui.expandedFootnoteDefs.has(group.id);
  const clampable = text.length > 180 || text.includes("\n");

  const textEl = host.createDiv({ cls: "np-fn-def-text" });
  if (clampable && !expanded) textEl.addClass("is-clamped");
  appendRichText(textEl, text, ctx);
  host.title = t("goToDefinition");
  host.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    ctx.navigate(definition.position.start.line, definition.position.start.col);
  });

  if (!clampable) return;
  const toggle = host.createEl("button", {
    cls: "np-more",
    attr: { type: "button" },
  });
  toggle.createSpan({ text: expanded ? t("showLess") : t("showMore") });
  const chevron = toggle.createSpan({ cls: "np-more-chevron" });
  setIcon(chevron, expanded ? "chevron-up" : "chevron-down");
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (expanded) ctx.view.ui.expandedFootnoteDefs.delete(group.id);
    else ctx.view.ui.expandedFootnoteDefs.add(group.id);
    ctx.scheduleRender();
  });
}

function renderReferences(
  parent: HTMLElement,
  ctx: SectionContext,
  group: FootnoteGroup,
): void {
  if (group.references.length === 0) return;
  const host = parent.createDiv({ cls: "np-fn-refs" });
  const limit = Math.max(1, ctx.plugin.settings.footnoteRefLimit);
  const expanded = ctx.view.ui.expandedFootnoteRefs.has(group.id);
  const visible = expanded ? group.references : group.references.slice(0, limit);

  for (const ref of visible) {
    const line = ref.position.start.line;
    const row = host.createDiv({ cls: "np-fn-ref" });
    row.title = t("goToReference");
    row.createSpan({ cls: "np-fn-ref-line", text: `L${line + 1}` });
    row.createSpan({ cls: "np-fn-ref-text", text: lineContext(ctx, line, group.id) });
    row.addEventListener("click", () => ctx.navigate(line, ref.position.start.col));
  }

  if (group.references.length <= limit) return;
  const toggle = host.createEl("button", { cls: "np-more", attr: { type: "button" } });
  toggle.createSpan({
    text: expanded
      ? t("showLess")
      : t("showMore") + ` (${group.references.length - limit})`,
  });
  const chevron = toggle.createSpan({ cls: "np-more-chevron" });
  setIcon(chevron, expanded ? "chevron-up" : "chevron-down");
  toggle.addEventListener("click", () => {
    if (expanded) ctx.view.ui.expandedFootnoteRefs.delete(group.id);
    else ctx.view.ui.expandedFootnoteRefs.add(group.id);
    ctx.scheduleRender();
  });
}

function readDefinition(ctx: SectionContext, definition: FootnoteCache): string {
  const marker = new RegExp(`^\\s*\\[\\^${escapeRegExp(definition.id)}\\]:\\s?`);
  const start = definition.position.start.line;
  const end = definition.position.end.line;
  const slice = ctx.lines.slice(start, end + 1);
  if (slice.length > 0 && marker.test(slice[0])) {
    return deindent([slice[0].replace(marker, ""), ...slice.slice(1)]).trim();
  }
  // Cache and buffer drifted (typing): fall back to a line scan.
  const found = ctx.lines.findIndex((line) => marker.test(line));
  if (found < 0) return "";
  const collected: string[] = [ctx.lines[found].replace(marker, "")];
  for (let i = found + 1; i < ctx.lines.length; i++) {
    const line = ctx.lines[i];
    if (/^\s*\[\^[^\]]+\]:/.test(line)) break;
    if (line.trim() === "") {
      collected.push("");
      continue;
    }
    if (/^\S/.test(line)) break;
    collected.push(line);
  }
  return deindent(collected).trim();
}

function deindent(lines: string[]): string {
  const indents = lines
    .slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => line.length - line.trimStart().length);
  const min = indents.length > 0 ? Math.min(...indents) : 0;
  return [lines[0], ...lines.slice(1).map((line) => line.slice(min))].join("\n");
}

function lineContext(ctx: SectionContext, line: number, id: string): string {
  const raw = ctx.lines[line] ?? "";
  const stripped = raw
    .replace(new RegExp(`\\[\\^${escapeRegExp(id)}\\]`, "g"), "")
    // Only strip real list/quote prefixes: `*emphasis*` must survive intact.
    .replace(/^[\s>]*(?:[-*+]\s+)?/, "");
  return truncate(plainText(stripped), 96);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
