import { createCollapsibleSection } from "../components/collapsible";
import { t } from "../i18n";
import type { SectionContext } from "../types";
import { emptyState } from "../util/dom";

export function renderOutlineSection(parent: HTMLElement, ctx: SectionContext): void {
  const settings = ctx.plugin.settings;
  const headings = (ctx.cache?.headings ?? []).filter(
    (heading) => heading.level <= settings.outlineMaxLevel,
  );

  const cursorLine = settings.highlightCurrentHeading ? ctx.view.getCursorLine() : null;
  let activeIndex = -1;
  if (cursorLine !== null) {
    headings.forEach((heading, index) => {
      if (heading.position.start.line <= cursorLine) activeIndex = index;
    });
  }

  createCollapsibleSection(parent, {
    id: "outline",
    title: t("outline"),
    collapsed: settings.collapsed.outline,
    count: headings.length,
    showCount: settings.showCounts,
    onToggle: (collapsed) => ctx.plugin.setSectionCollapsed("outline", collapsed),
    buildBody: (body) => {
      if (headings.length === 0) {
        emptyState(body, t("outlineEmpty"));
        return;
      }
      const list = body.createDiv({ cls: "np-outline" });
      headings.forEach((heading, index) => {
        const line = heading.position.start.line;
        const item = list.createDiv({ cls: `np-outline-item np-h${heading.level}` });
        if (index === activeIndex) item.addClass("is-active");
        item.tabIndex = 0;
        item.setAttribute("role", "button");
        item.title = t("jumpToHeading");

        if (settings.showHeadingLevels) {
          item.createSpan({ cls: "np-outline-level", text: `H${heading.level}` });
        }
        item.createSpan({ cls: "np-outline-text", text: heading.heading });

        const go = () =>
          ctx.navigate({ line, ch: heading.position.start.col });
        item.addEventListener("click", go);
        item.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            go();
          }
        });
      });
    },
  });
}
