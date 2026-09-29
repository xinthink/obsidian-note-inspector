import { setIcon } from "obsidian";

/** Placeholder block used when a section has nothing to show. */
export function emptyState(parent: HTMLElement, text: string): HTMLElement {
  return parent.createDiv({ cls: "ni-empty", text });
}

export interface IconButtonOptions {
  icon: string;
  label: string;
  cls?: string;
  onClick: (event: MouseEvent) => void;
}

export function iconButton(
  parent: HTMLElement,
  options: IconButtonOptions,
): HTMLButtonElement {
  const button = parent.createEl("button", {
    cls: `ni-icon-button ${options.cls ?? ""}`.trim(),
    attr: { type: "button", "aria-label": options.label, title: options.label },
  });
  setIcon(button, options.icon);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    options.onClick(event);
  });
  return button;
}

export interface InlineEditOptions {
  /** Text shown in the input when editing starts. */
  value: string;
  inputType?: "text" | "number";
  placeholder?: string;
  /** Called with the new raw string when the edit is committed. */
  onCommit(value: string): void;
  /** Called when the user aborts with Escape. */
  onCancel?(): void;
  selectAll?: boolean;
}

/**
 * Swap `host`'s content for a one-line editor. Enter/blur commits, Escape
 * reverts. Returns the created input.
 */
export function startInlineEdit(
  host: HTMLElement,
  options: InlineEditOptions,
): HTMLInputElement {
  const previous = Array.from(host.childNodes);
  host.empty();
  host.addClass("is-editing");
  const input = host.createEl("input", {
    cls: "ni-edit-input",
    type: options.inputType ?? "text",
    attr: { spellcheck: "false" },
  });
  input.value = options.value;
  if (options.placeholder) input.placeholder = options.placeholder;

  let settled = false;
  const restore = () => {
    input.remove();
    host.removeClass("is-editing");
    host.append(...previous);
  };
  const finish = (commit: boolean) => {
    if (settled) return;
    settled = true;
    const value = input.value;
    restore();
    if (commit) options.onCommit(value);
    else options.onCancel?.();
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));

  window.setTimeout(() => {
    input.focus();
    if (options.selectAll !== false) input.select();
  }, 0);
  return input;
}

export interface TextareaEditOptions {
  value: string;
  placeholder?: string;
  /** Short line under the editor explaining how to commit. */
  hint?: string;
  saveLabel: string;
  cancelLabel: string;
  onCommit(value: string): void;
  onCancel?(): void;
}

/**
 * Multi-line variant of {@link startInlineEdit}: Cmd/Ctrl+Enter or the save
 * button commits, Escape or the cancel button reverts, blur commits.
 */
export function startTextareaEdit(host: HTMLElement, options: TextareaEditOptions): void {
  const previous = Array.from(host.childNodes);
  host.empty();
  host.addClass("is-editing");

  const textarea = host.createEl("textarea", { cls: "ni-edit-textarea" });
  textarea.value = options.value;
  textarea.rows = Math.min(10, Math.max(2, options.value.split("\n").length + 1));
  if (options.placeholder) textarea.placeholder = options.placeholder;

  const bar = host.createDiv({ cls: "ni-edit-bar" });
  if (options.hint) bar.createSpan({ cls: "ni-edit-hint", text: options.hint });
  const buttons = bar.createDiv({ cls: "ni-edit-buttons" });
  iconButton(buttons, {
    icon: "x",
    label: options.cancelLabel,
    onClick: () => finish(false),
  });
  iconButton(buttons, {
    icon: "check",
    label: options.saveLabel,
    onClick: () => finish(true),
  });

  let settled = false;
  const finish = (commit: boolean) => {
    if (settled) return;
    settled = true;
    const value = textarea.value;
    textarea.remove();
    bar.remove();
    host.removeClass("is-editing");
    host.append(...previous);
    if (commit) options.onCommit(value);
    else options.onCancel?.();
  };

  // Keep the textarea focused when a button is pressed, so blur does not fire
  // before the button's own click handler.
  for (const button of Array.from(buttons.querySelectorAll("button"))) {
    button.addEventListener("mousedown", (event) => event.preventDefault());
  }

  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      finish(true);
    }
  });
  textarea.addEventListener("blur", () => finish(true));

  window.setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, 0);
}

/** A hover-revealed action bar attached to a row. */
export function actionBar(parent: HTMLElement): HTMLElement {
  return parent.createDiv({ cls: "ni-actions" });
}

export function truncate(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}
