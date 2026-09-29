import { setIcon } from "obsidian";
import type { SectionId } from "../types";

export interface CollapsibleSectionOptions {
  id: SectionId;
  title: string;
  collapsed: boolean;
  /** Item count shown next to the title (hidden when `showCount` is false). */
  count: number;
  showCount: boolean;
  onToggle(collapsed: boolean): void;
  buildBody(body: HTMLElement): void;
  /** Optional buttons rendered in the section header. */
  buildActions?(bar: HTMLElement): void;
}

export interface CollapsibleSectionHandle {
  root: HTMLElement;
  header: HTMLElement;
  body: HTMLElement;
}

/**
 * A section shell with a header that can be clicked (or activated with the
 * keyboard) to fold the body away. The collapsed flag is owned by the caller so
 * it can be persisted.
 */
export function createCollapsibleSection(
  parent: HTMLElement,
  options: CollapsibleSectionOptions,
): CollapsibleSectionHandle {
  const root = parent.createDiv({ cls: "ni-section" });
  root.dataset.section = options.id;

  const header = root.createDiv({
    cls: "ni-section-header",
    attr: {
      role: "button",
      tabindex: "0",
      "aria-expanded": String(!options.collapsed),
      "aria-controls": `ni-body-${options.id}`,
    },
  });

  const chevron = header.createSpan({ cls: "ni-chevron" });
  setIcon(chevron, options.collapsed ? "chevron-right" : "chevron-down");

  header.createSpan({ cls: "ni-section-title", text: options.title });

  if (options.showCount && options.count > 0) {
    header.createSpan({ cls: "ni-section-count", text: String(options.count) });
  }

  const actions = header.createDiv({ cls: "ni-section-actions" });
  options.buildActions?.(actions);

  const body = root.createDiv({ cls: "ni-section-body", attr: { id: `ni-body-${options.id}` } });

  const apply = (collapsed: boolean) => {
    root.toggleClass("is-collapsed", collapsed);
    header.setAttribute("aria-expanded", String(!collapsed));
    setIcon(chevron, collapsed ? "chevron-right" : "chevron-down");
    body.toggle(!collapsed);
    options.collapsed = collapsed;
  };

  apply(options.collapsed);

  const toggle = () => {
    const next = !options.collapsed;
    apply(next);
    options.onToggle(next);
  };

  header.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest(".ni-section-actions")) return;
    toggle();
  });
  header.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    } else if (event.key === "ArrowLeft" && !options.collapsed) {
      event.preventDefault();
      toggle();
    } else if (event.key === "ArrowRight" && options.collapsed) {
      event.preventDefault();
      toggle();
    }
  });

  options.buildBody(body);

  return { root, header, body };
}
