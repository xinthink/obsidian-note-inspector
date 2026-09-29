import { setIcon } from "obsidian";

/** Placeholder block used when a section has nothing to show. */
export function emptyState(parent: HTMLElement, text: string): HTMLElement {
  return parent.createDiv({ cls: "np-empty", text });
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
    cls: `np-icon-button ${options.cls ?? ""}`.trim(),
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
    cls: "np-edit-input",
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

/** A hover-revealed action bar attached to a row. */
export function actionBar(parent: HTMLElement): HTMLElement {
  return parent.createDiv({ cls: "np-actions" });
}

export function truncate(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}
