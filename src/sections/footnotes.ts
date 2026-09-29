import { Platform, setIcon, type FootnoteCache, type FootnoteRefCache } from "obsidian";
import { createCollapsibleSection } from "../components/collapsible";
import { t } from "../i18n";
import type { SectionContext } from "../types";
import { actionBar, emptyState, iconButton, startTextareaEdit, truncate } from "../util/dom";
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
  const withRefs = groups.filter((group) => group.references.length > 0);
  const allFolded =
    withRefs.length > 0 &&
    withRefs.every((group) => ctx.view.ui.collapsedFootnoteRefs.has(group.id));

  createCollapsibleSection(parent, {
    id: "footnotes",
    title: t("footnotes"),
    collapsed: settings.collapsed.footnotes,
    count: groups.length,
    showCount: settings.showCounts,
    onToggle: (collapsed) => ctx.plugin.setSectionCollapsed("footnotes", collapsed),
    buildActions: (bar) => {
      if (withRefs.length === 0) return;
      // Keep this one visible: it is the only way to fold every list at once.
      bar.addClass("is-persistent");
      iconButton(bar, {
        icon: allFolded ? "chevrons-up-down" : "chevrons-down-up",
        label: allFolded ? t("expandAllReferences") : t("collapseAllReferences"),
        onClick: () => {
          for (const group of withRefs) {
            if (allFolded) ctx.view.ui.collapsedFootnoteRefs.delete(group.id);
            else ctx.view.ui.collapsedFootnoteRefs.add(group.id);
          }
          ctx.plugin.setFoldedFootnoteRefs(ctx.view.ui.collapsedFootnoteRefs);
          ctx.refresh();
        },
      });
    },
    buildBody: (body) => {
      if (groups.length === 0) {
        emptyState(body, t("footnotesEmpty"));
        return;
      }
      const list = body.createDiv({ cls: "ni-footnotes" });
      for (const group of groups) renderFootnote(list, ctx, group);
    },
  });
}

function collectGroups(ctx: SectionContext): FootnoteGroup[] {
  const defs = [...(ctx.cache?.footnotes ?? [])].sort(
    (a, b) => a.position.start.line - b.position.start.line,
  );
  const defined = new Set(defs.map((def) => def.id));

  // Obsidian's cache only lists references that resolve to a definition, so
  // dangling references have to be found by scanning the note text.
  const refs = [...(ctx.cache?.footnoteRefs ?? []), ...scanDanglingRefs(ctx, defined)].sort(
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

  const seen = new Set<string>();
  for (const ref of refs) {
    const key = `${ref.id}@${ref.position.start.line}:${ref.position.start.col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ensure(ref.id).references.push(ref);
  }
  for (const def of defs) ensure(def.id).definition = def;

  const ordered = [...groups.values()].sort((a, b) => orderKey(a) - orderKey(b));
  let counter = 0;
  for (const group of ordered) {
    if (group.references.length > 0) group.index = ++counter;
  }
  return ordered;
}

/** `[^id]` occurrences whose id has no definition, ignoring fenced code. */
function scanDanglingRefs(ctx: SectionContext, defined: Set<string>): FootnoteRefCache[] {
  const found: FootnoteRefCache[] = [];
  let fence: string | null = null;
  ctx.lines.forEach((line, index) => {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (marker === fence) fence = null;
      return;
    }
    if (fence !== null) return;

    const pattern = /\[\^([^\]\s]+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const id = match[1];
      if (defined.has(id)) continue;
      const rest = line.slice(match.index + match[0].length);
      if (rest.startsWith(":")) continue; // the definition marker itself
      const col = match.index;
      found.push({
        id,
        position: {
          start: { line: index, col, offset: 0 },
          end: { line: index, col: col + match[0].length, offset: 0 },
        },
      });
    }
  });
  return found;
}

function orderKey(group: FootnoteGroup): number {
  if (group.references.length > 0) return group.references[0].position.start.line;
  return group.definition?.position.start.line ?? Number.MAX_SAFE_INTEGER;
}

function renderFootnote(parent: HTMLElement, ctx: SectionContext, group: FootnoteGroup): void {
  const card = parent.createDiv({ cls: "ni-fn" });
  if (!group.definition) card.addClass("is-undefined");
  if (group.references.length === 0) card.addClass("is-unused");

  const head = card.createDiv({ cls: "ni-fn-head" });

  // Badge + id are the "go to source" target now that the definition body
  // edits on a single click.
  const index = head.createSpan({
    cls: "ni-fn-index",
    text: group.index === null ? "·" : String(group.index),
  });
  const idEl = head.createSpan({ cls: "ni-fn-id", text: group.id });
  idEl.title = t("selectInNote");
  index.title = t("selectInNote");
  const selectInNote = () => {
    if (!group.definition) return;
    const span = definitionSpan(ctx, group.definition);
    ctx.navigate({
      line: span.start,
      ch: 0,
      endLine: span.end,
      endCh: (ctx.lines[span.end] ?? "").length,
    });
  };
  index.addEventListener("click", selectInNote);
  idEl.addEventListener("click", selectInNote);

  const collapsed = ctx.view.ui.collapsedFootnoteRefs.has(group.id);
  if (group.references.length === 0) {
    const meta = head.createSpan({ cls: "ni-fn-meta" });
    meta.setText(group.definition ? t("footnoteUnused") : t("footnoteMissing"));
    renderDefinition(card, head, ctx, group);
    return;
  }

  const toggle = head.createEl("button", {
    cls: "ni-fn-meta ni-fn-refs-toggle",
    attr: {
      type: "button",
      "aria-expanded": String(!collapsed),
      title: collapsed ? t("expandReferences") : t("collapseReferences"),
    },
  });
  toggle.createSpan({
    text:
      group.references.length === 1
        ? t("footnoteReferenceOne")
        : t("footnoteReferenceMany", { n: group.references.length }),
  });
  const chevron = toggle.createSpan({ cls: "ni-fn-toggle-chevron" });
  setIcon(chevron, collapsed ? "chevron-right" : "chevron-down");
  toggle.addEventListener("click", () => {
    if (collapsed) ctx.view.ui.collapsedFootnoteRefs.delete(group.id);
    else ctx.view.ui.collapsedFootnoteRefs.add(group.id);
    ctx.plugin.setFoldedFootnoteRefs(ctx.view.ui.collapsedFootnoteRefs);
    ctx.refresh();
  });

  renderDefinition(card, head, ctx, group);
  if (!collapsed && ctx.plugin.settings.showFootnoteContext) {
    renderReferences(card, ctx, group);
  }
}

function renderDefinition(
  parent: HTMLElement,
  head: HTMLElement,
  ctx: SectionContext,
  group: FootnoteGroup,
): void {
  const host = parent.createDiv({ cls: "ni-fn-def" });
  if (!group.definition) {
    host.addClass("is-missing");
    host.createSpan({ text: t("footnoteMissing") });
    host.title = t("addDefinition");
    host.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).closest("button")) return;
      startDefinitionEdit(host, ctx, group, "", null);
    });
    const actions = actionBar(head);
    iconButton(actions, {
      icon: "plus",
      label: t("addDefinition"),
      onClick: () => startDefinitionEdit(host, ctx, group, "", null),
    });
    return;
  }
  const definition = group.definition;
  const span = definitionSpan(ctx, definition);
  const text = definitionText(ctx, span);
  const expanded = ctx.view.ui.expandedFootnoteDefs.has(group.id);
  const clampable = text.length > 180 || text.includes("\n");

  const textEl = host.createDiv({ cls: "ni-fn-def-text" });
  if (clampable && !expanded) textEl.addClass("is-clamped");
  appendRichText(textEl, text, ctx);
  host.title = t("clickToEdit");
  // A single click on the definition drops straight into editing.
  host.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    startDefinitionEdit(host, ctx, group, text, span);
  });

  if (clampable) {
    const toggle = host.createEl("button", {
      cls: "ni-more",
      attr: { type: "button" },
    });
    toggle.createSpan({ text: expanded ? t("showLess") : t("showMore") });
    const chevron = toggle.createSpan({ cls: "ni-more-chevron" });
    setIcon(chevron, expanded ? "chevron-up" : "chevron-down");
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (expanded) ctx.view.ui.expandedFootnoteDefs.delete(group.id);
      else ctx.view.ui.expandedFootnoteDefs.add(group.id);
      ctx.refresh();
    });
  }
}

/** Edit the definition text in place; an empty result deletes the definition. */
function startDefinitionEdit(
  host: HTMLElement,
  ctx: SectionContext,
  group: FootnoteGroup,
  current: string,
  span: LineSpan | null,
): void {
  startTextareaEdit(host, {
    value: current,
    placeholder: t("definitionPlaceholder"),
    hint: t("saveHint", { modifier: Platform.isMacOS ? "⌘" : "Ctrl" }),
    saveLabel: t("save"),
    cancelLabel: t("cancel"),
    onCommit: (next) => {
      const definition = group.definition;
      const normalized = next.replace(/\r\n?/g, "\n").trim();
      if (definition && normalized === current.trim()) {
        ctx.refresh();
        return;
      }
      const serialized = serializeDefinition(group.id, normalized);
      if (!span) {
        // No definition yet: append one at the end of the note.
        const lastIndex = Math.max(0, ctx.lines.length - 1);
        const tail = ctx.lines[lastIndex] ?? "";
        const separator = tail.trim() === "" ? "\n" : "\n\n";
        ctx.editLines(lastIndex, lastIndex, `${tail}${separator}${serialized}`);
      } else {
        ctx.editLines(span.start, span.end, serialized);
      }
      ctx.refresh();
    },
    onCancel: () => ctx.refresh(),
  });
}

/** `[^id]: first line` plus two-space continuations, or "" to delete. */
function serializeDefinition(id: string, text: string): string {
  if (text === "") return "";
  const lines = text.split("\n");
  return [`[^${id}]: ${lines[0]}`, ...lines.slice(1).map((line) => `  ${line}`)]
    .join("\n")
    .replace(/\s+$/, "");
}

function renderReferences(
  parent: HTMLElement,
  ctx: SectionContext,
  group: FootnoteGroup,
): void {
  if (group.references.length === 0) return;
  const host = parent.createDiv({ cls: "ni-fn-refs" });
  const limit = Math.max(1, ctx.plugin.settings.footnoteRefLimit);
  const expanded = ctx.view.ui.expandedFootnoteRefs.has(group.id);
  const visible = expanded ? group.references : group.references.slice(0, limit);

  for (const ref of visible) {
    const line = ref.position.start.line;
    const row = host.createDiv({ cls: "ni-fn-ref" });
    row.title = t("selectInNote");
    row.createSpan({ cls: "ni-fn-ref-line", text: `L${line + 1}` });
    row.createSpan({ cls: "ni-fn-ref-text", text: lineContext(ctx, line, group.id) });
    row.addEventListener("click", () =>
      ctx.navigate({
        line,
        ch: ref.position.start.col,
        endLine: ref.position.end.line,
        endCh: ref.position.end.col,
      }),
    );
  }

  if (group.references.length <= limit) return;
  const toggle = host.createEl("button", { cls: "ni-more", attr: { type: "button" } });
  toggle.createSpan({
    text: expanded
      ? t("showLess")
      : t("showMore") + ` (${group.references.length - limit})`,
  });
  const chevron = toggle.createSpan({ cls: "ni-more-chevron" });
  setIcon(chevron, expanded ? "chevron-up" : "chevron-down");
  toggle.addEventListener("click", () => {
    if (expanded) ctx.view.ui.expandedFootnoteRefs.delete(group.id);
    else ctx.view.ui.expandedFootnoteRefs.add(group.id);
    ctx.refresh();
  });
}

/** Inclusive line span of a footnote definition. */
interface LineSpan {
  start: number;
  end: number;
}

/**
 * Real span of a definition in the current text. The metadata cache can be
 * stale while typing and may not cover indented continuation lines, so the end
 * is re-derived from the buffer.
 */
function definitionSpan(ctx: SectionContext, definition: FootnoteCache): LineSpan {
  const marker = new RegExp(`^\\s*\\[\\^${escapeRegExp(definition.id)}\\]:`);
  const cachedStart = definition.position.start.line;
  const start =
    ctx.lines[cachedStart] !== undefined && marker.test(ctx.lines[cachedStart])
      ? cachedStart
      : ctx.lines.findIndex((line) => marker.test(line));
  if (start < 0) {
    return { start: cachedStart, end: definition.position.end.line };
  }
  return { start, end: Math.max(definition.position.end.line, continuationEnd(ctx, start)) };
}

/** Last line belonging to the definition that starts at `start`. */
function continuationEnd(ctx: SectionContext, start: number): number {
  let end = start;
  for (let i = start + 1; i < ctx.lines.length; i++) {
    const line = ctx.lines[i];
    if (/^\s*\[\^[^\]]+\]:/.test(line)) break;
    if (line.trim() === "") {
      const next = ctx.lines[i + 1];
      if (next !== undefined && /^\s+\S/.test(next)) {
        end = i;
        continue;
      }
      break;
    }
    if (!/^\s+\S/.test(line)) break;
    end = i;
  }
  return end;
}

function definitionText(ctx: SectionContext, span: LineSpan): string {
  const slice = ctx.lines.slice(span.start, span.end + 1);
  if (slice.length === 0) return "";
  const first = slice[0].replace(/^\s*\[\^[^\]]+\]:\s?/, "");
  return deindent([first, ...slice.slice(1)]).trim();
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
