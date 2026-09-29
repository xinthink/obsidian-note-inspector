import { Notice, setIcon } from "obsidian";
import { createCollapsibleSection } from "../components/collapsible";
import { t } from "../i18n";
import type { SectionContext } from "../types";
import { actionBar, emptyState, iconButton, startInlineEdit } from "../util/dom";
import {
  addProperty,
  applyPathEdit,
  findFrontmatterLine,
  frontmatterEntries,
} from "../util/frontmatter";
import { appendRichText } from "../util/rich-text";

const MAX_DEPTH = 4;

export function renderPropertiesSection(parent: HTMLElement, ctx: SectionContext): void {
  const entries = frontmatterEntries(ctx.cache);
  const keys = entries.map(([key]) => key);
  const settings = ctx.plugin.settings;

  createCollapsibleSection(parent, {
    id: "properties",
    title: t("properties"),
    collapsed: settings.collapsed.properties,
    count: entries.length,
    showCount: settings.showCounts,
    onToggle: (collapsed) => ctx.plugin.setSectionCollapsed("properties", collapsed),
    buildBody: (body) => {
      if (entries.length === 0) {
        emptyState(body, t("propertiesEmpty"));
      } else {
        const list = body.createDiv({ cls: "np-props" });
        for (const [key, value] of entries) {
          renderPropertyRow(list, ctx, [key], key, value, 0);
        }
      }
      renderAddProperty(body, ctx, keys);
    },
  });
}

function renderPropertyRow(
  parent: HTMLElement,
  ctx: SectionContext,
  path: string[],
  key: string,
  value: unknown,
  depth: number,
): void {
  const row = parent.createDiv({ cls: "np-prop" });
  row.dataset.depth = String(Math.min(depth, 6));
  row.style.setProperty("--np-depth", String(Math.min(depth, 6)));

  const keyEl = row.createDiv({ cls: "np-prop-key", text: key });
  keyEl.title = `${t("jumpToSource")} · ${path.join(" › ")}`;
  keyEl.addEventListener("click", () => revealSource(ctx, path));

  const valueEl = row.createDiv({ cls: "np-prop-value" });
  renderValue(valueEl, ctx, path, value, depth);

  const actions = actionBar(row);
  if (isComplex(value)) {
    iconButton(actions, {
      icon: "copy",
      label: t("copyValue"),
      onClick: () => void copyValue(value),
    });
  }
  iconButton(actions, {
    icon: "trash-2",
    label: t("deleteProperty"),
    onClick: () => {
      void applyPathEdit(ctx.app, ctx.file, path, { op: "delete" }).then(() =>
        ctx.refresh(),
      );
    },
  });

  applyPendingEdit(ctx, path, valueEl, value);
}

function applyPendingEdit(
  ctx: SectionContext,
  path: string[],
  host: HTMLElement,
  value: unknown,
): void {
  const pending = ctx.view.ui.pendingEditPath;
  if (!pending) return;
  if (pending.length !== path.length) return;
  if (!pending.every((segment, index) => segment === path[index])) return;
  ctx.view.ui.pendingEditPath = null;
  if (typeof value === "string" || typeof value === "number" || value == null) {
    startScalarEdit(host, ctx, path, value);
  }
}

function renderValue(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: unknown,
  depth: number,
): void {
  if (value === null || value === undefined) {
    renderMissing(host, ctx, path);
    return;
  }
  switch (typeof value) {
    case "boolean":
      renderBoolean(host, ctx, path, value);
      return;
    case "number":
      renderScalar(host, ctx, path, value, String(value));
      return;
    case "string":
      renderString(host, ctx, path, value);
      return;
    case "object":
      break;
    default:
      host.createSpan({ cls: "np-value", text: String(value) });
      return;
  }
  if (Array.isArray(value)) {
    renderArray(host, ctx, path, value, depth);
    return;
  }
  renderObject(host, ctx, path, value as Record<string, unknown>, depth);
}

function renderMissing(host: HTMLElement, ctx: SectionContext, path: string[]): void {
  const value = host.createSpan({ cls: "np-value np-value-empty", text: "—" });
  value.title = t("clickToEdit");
  value.addEventListener("click", () => startScalarEdit(host, ctx, path, ""));
}

function renderBoolean(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: boolean,
): void {
  const label = host.createEl("label", { cls: "np-checkbox" });
  const input = label.createEl("input", { type: "checkbox" });
  input.checked = value;
  input.addEventListener("change", () => {
    void applyPathEdit(ctx.app, ctx.file, path, { op: "set", value: input.checked }).then(() =>
      ctx.refresh(),
    );
  });
}

function renderScalar(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: number | string,
  text: string,
): void {
  const cls = typeof value === "number" ? "np-value np-number" : "np-value np-string";
  const span = host.createSpan({ cls, text });
  span.title = t("clickToEdit");
  span.addEventListener("click", () => startScalarEdit(host, ctx, path, value));
}

function startScalarEdit(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: number | string | null | undefined,
): void {
  const isNumber = typeof value === "number";
  startInlineEdit(host, {
    value: value === null || value === undefined ? "" : String(value),
    inputType: isNumber ? "number" : "text",
    onCommit: (raw) => {
      let next: unknown = raw;
      if (isNumber && raw.trim() !== "" && Number.isFinite(Number(raw))) {
        next = Number(raw);
      }
      void applyPathEdit(ctx.app, ctx.file, path, { op: "set", value: next }).then(() =>
        ctx.refresh(),
      );
    },
    onCancel: () => ctx.refresh(),
  });
}

function renderString(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: string,
): void {
  const wrapper = host.createDiv({ cls: "np-value np-string" });
  if (value === "") {
    wrapper.createSpan({ cls: "np-value-empty", text: t("emptyValue") });
  }
  appendRichText(wrapper, value, ctx);
  if (wrapper.querySelector("a") === null) wrapper.title = t("clickToEdit");
  wrapper.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("a")) return;
    startScalarEdit(host, ctx, path, value);
  });
}

function renderArray(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: unknown[],
  depth: number,
): void {
  if (depth >= MAX_DEPTH) {
    host.createEl("pre", { cls: "np-json", text: JSON.stringify(value, null, 2) });
    return;
  }
  if (value.every(isPrimitive)) {
    renderChips(host, ctx, path, value);
    return;
  }
  renderItems(host, ctx, path, value, depth);
}

/**
 * Arrays of records collapse to one line per record — a full nested grid is
 * unreadable in a narrow sidebar — and unfold on click.
 */
function renderItems(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: unknown[],
  depth: number,
): void {
  const list = host.createDiv({ cls: "np-items" });
  value.forEach((item, index) => {
    const itemPath = [...path, String(index)];
    if (!isPlainObject(item)) {
      const row = list.createDiv({ cls: "np-array-item" });
      renderValue(row, ctx, itemPath, item, depth + 1);
      return;
    }

    const stateKey = `${ctx.file.path}::${itemPath.join(".")}`;
    const expanded = ctx.view.ui.expandedItems.has(stateKey);
    const itemEl = list.createDiv({ cls: "np-item" });
    if (expanded) itemEl.addClass("is-expanded");

    const toggle = itemEl.createEl("button", {
      cls: "np-item-toggle",
      attr: { type: "button" },
    });
    setIcon(
      toggle.createSpan({ cls: "np-item-chevron" }),
      expanded ? "chevron-down" : "chevron-right",
    );
    toggle.createSpan({ cls: "np-item-label", text: itemLabel(item, index) });
    toggle.title = JSON.stringify(item, null, 2);
    toggle.addEventListener("click", () => {
      if (expanded) ctx.view.ui.expandedItems.delete(stateKey);
      else ctx.view.ui.expandedItems.add(stateKey);
      ctx.refresh();
    });

    const actions = actionBar(itemEl);
    iconButton(actions, {
      icon: "copy",
      label: t("copyValue"),
      onClick: () => void copyValue(item),
    });
    iconButton(actions, {
      icon: "trash-2",
      label: t("removeItem"),
      onClick: () => {
        void applyPathEdit(ctx.app, ctx.file, itemPath, { op: "delete" }).then(() =>
          ctx.refresh(),
        );
      },
    });

    if (!expanded) return;
    const body = itemEl.createDiv({ cls: "np-item-body" });
    for (const [key, nested] of Object.entries(item)) {
      renderPropertyRow(body, ctx, [...itemPath, key], key, nested, depth + 1);
    }
    renderAddKey(body, ctx, itemPath, item);
  });

  renderAddItem(list, ctx, path, value);
}

/** `+ Add item` for arrays of records / nested arrays. */
function renderAddItem(
  parent: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: unknown[],
): void {
  const button = parent.createEl("button", {
    cls: "np-add-button np-add-item",
    attr: { type: "button" },
  });
  setIcon(button.createSpan({ cls: "np-icon" }), "plus");
  button.createSpan({ text: t("addItem") });
  button.addEventListener("click", () => {
    const template = itemTemplate(value);
    const itemPath = [...path, String(value.length)];
    ctx.view.ui.expandedItems.add(`${ctx.file.path}::${itemPath.join(".")}`);
    if (isPlainObject(template)) {
      const first = Object.entries(template).find(
        ([, entry]) => typeof entry === "string" || typeof entry === "number",
      );
      ctx.view.ui.pendingEditPath = first ? [...itemPath, first[0]] : null;
    } else {
      ctx.view.ui.pendingEditPath = null;
    }
    void applyPathEdit(ctx.app, ctx.file, path, {
      op: "set",
      value: [...value, template],
    }).then(() => ctx.refresh());
  });
}

/** New records copy the shape of the previous one, with blank values. */
function itemTemplate(items: unknown[]): unknown {
  const model = [...items].reverse().find(isPlainObject);
  if (!model) return "";
  const template: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(model)) {
    template[key] = placeholderFor(entry);
  }
  return template;
}

function placeholderFor(value: unknown): unknown {
  switch (typeof value) {
    case "number":
      return 0;
    case "boolean":
      return false;
    default:
      break;
  }
  if (Array.isArray(value)) return [];
  if (isPlainObject(value)) return {};
  return "";
}

/** Human-readable one-line label for a record inside an array. */
function itemLabel(item: Record<string, unknown>, index: number): string {
  for (const key of ["title", "name", "label", "id"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  const scalar = Object.values(item).find(
    (entry) => isPrimitive(entry) && String(entry ?? "").trim() !== "",
  );
  return scalar === undefined ? `#${index + 1}` : String(scalar);
}

function renderChips(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: unknown[],
): void {
  const chips = host.createDiv({ cls: "np-chips" });
  value.forEach((item, index) => {
    const chip = chips.createSpan({ cls: "np-chip" });
    const textEl = chip.createSpan({ cls: "np-chip-text" });
    renderChipText(textEl, ctx, [...path, String(index)], item);
    iconButton(chip, {
      icon: "x",
      label: t("removeItem"),
      cls: "np-chip-remove",
      onClick: () => {
        void applyPathEdit(ctx.app, ctx.file, [...path, String(index)], { op: "delete" }).then(
          () => ctx.refresh(),
        );
      },
    });
  });
  iconButton(chips, {
    icon: "plus",
    label: t("addItem"),
    cls: "np-chip-add",
    onClick: () => {
      void applyPathEdit(ctx.app, ctx.file, path, { op: "set", value: [...value, ""] }).then(
        () => ctx.refresh(),
      );
    },
  });
}

function renderChipText(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  item: unknown,
): void {
  if (typeof item === "boolean") {
    host.setText(String(item));
    return;
  }
  const text = typeof item === "number" ? String(item) : String(item ?? "");
  host.setText(text);
  host.title = t("clickToEdit");
  host.addEventListener("click", () => startScalarEdit(host, ctx, path, item as number | string));
}

function renderObject(
  host: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: Record<string, unknown>,
  depth: number,
): void {
  if (depth >= MAX_DEPTH) {
    host.createEl("pre", { cls: "np-json", text: JSON.stringify(value, null, 2) });
    return;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    host.createSpan({ cls: "np-value np-value-empty", text: "{}" });
  } else {
    const box = host.createDiv({ cls: "np-object" });
    for (const [key, nested] of entries) {
      renderPropertyRow(box, ctx, [...path, key], key, nested, depth + 1);
    }
  }
  renderAddKey(host, ctx, path, value);
}

/** `＋ Add field` for a nested object (or an expanded record), creating `key: ""`. */
function renderAddKey(
  parent: HTMLElement,
  ctx: SectionContext,
  path: string[],
  value: Record<string, unknown>,
): void {
  const existing = Object.keys(value);
  const row = parent.createDiv({ cls: "np-add np-add-key" });
  const showButton = () => {
    row.empty();
    const button = row.createEl("button", {
      cls: "np-add-button np-add-button-inline",
      attr: { type: "button" },
    });
    setIcon(button.createSpan({ cls: "np-icon" }), "plus");
    button.createSpan({ text: t("addKey") });
    button.addEventListener("click", () => {
      row.empty();
      const host = row.createDiv({ cls: "np-add-row" });
      startInlineEdit(host, {
        value: "",
        placeholder: t("keyName"),
        onCommit: (raw) => {
          const key = raw.trim();
          if (!key) {
            ctx.refresh();
            return;
          }
          if (existing.includes(key)) {
            new Notice(`${t("propertyExists")}${key}`);
            ctx.refresh();
            return;
          }
          ctx.view.ui.pendingEditPath = [...path, key];
          void applyPathEdit(ctx.app, ctx.file, path, {
            op: "set",
            value: { ...value, [key]: "" },
          }).then(() => ctx.refresh());
        },
        onCancel: () => ctx.refresh(),
      });
    });
  };
  showButton();
}

/** New top-level property: pick text / list / dict first, then name it. */
function renderAddProperty(body: HTMLElement, ctx: SectionContext, keys: string[]): void {
  const footer = body.createDiv({ cls: "np-add" });
  const showButton = () => {
    footer.empty();
    const button = footer.createEl("button", {
      cls: "np-add-button np-add-property",
      attr: { type: "button" },
    });
    setIcon(button.createSpan({ cls: "np-icon" }), "plus");
    button.createSpan({ text: t("addProperty") });
    button.addEventListener("click", () => {
      footer.empty();
      const host = footer.createDiv({ cls: "np-add-row" });
      const types: Array<{ label: string; value: unknown }> = [
        { label: t("typeText"), value: "" },
        { label: t("typeList"), value: [] },
        { label: t("typeDict"), value: {} },
      ];
      let selected = 0;
      const chips = host.createDiv({ cls: "np-add-types" });
      const chipButtons: HTMLButtonElement[] = [];
      const applySelection = () => {
        chipButtons.forEach((chip, index) =>
          chip.toggleClass("is-active", index === selected),
        );
      };
      types.forEach((type, index) => {
        const chip = chips.createEl("button", {
          cls: "np-type-chip",
          text: type.label,
          attr: { type: "button" },
        });
        // Prevent the input from blurring (and committing) on chip clicks.
        chip.addEventListener("mousedown", (event) => event.preventDefault());
        chip.addEventListener("click", () => {
          selected = index;
          applySelection();
        });
        chipButtons.push(chip);
      });
      applySelection();

      const inputHost = host.createDiv({ cls: "np-add-input" });
      startInlineEdit(inputHost, {
        value: "",
        placeholder: t("propertyName"),
        onCommit: (raw) => {
          const key = raw.trim();
          if (!key) {
            ctx.refresh();
            return;
          }
          if (keys.includes(key)) {
            new Notice(`${t("propertyExists")}${key}`);
            ctx.refresh();
            return;
          }
          const value = types[selected].value;
          void addProperty(ctx.app, ctx.file, key, keys, value).then((ok) => {
            if (ok && typeof value === "string") ctx.view.ui.pendingEditPath = [key];
            ctx.refresh();
          });
        },
        onCancel: () => ctx.refresh(),
      });
    });
  };
  showButton();
}

async function copyValue(value: unknown): Promise<void> {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    new Notice(t("copied"));
  } catch {
    new Notice("Note panel: clipboard unavailable");
  }
}

function revealSource(ctx: SectionContext, path: string[]): void {
  const line = findFrontmatterLine(ctx.lines, ctx.cache, path);
  if (line === null) return;
  ctx.navigate({ line, ch: 0 });
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isComplex(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}
