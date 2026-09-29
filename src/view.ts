import {
  ItemView,
  MarkdownView,
  TFile,
  debounce,
  type WorkspaceLeaf,
} from "obsidian";
import { t } from "./i18n";
import type NotePanelPlugin from "./main";
import { renderFootnotesSection } from "./sections/footnotes";
import { renderOutlineSection } from "./sections/outline";
import { renderPropertiesSection } from "./sections/properties";
import { SECTION_IDS, type PanelUiState, type SectionContext } from "./types";
import { emptyState, iconButton } from "./util/dom";

export const NOTE_PANEL_VIEW_TYPE = "note-panel";

/**
 * One side panel that stacks the three core "note structure" views: the
 * frontmatter properties, the heading outline and the footnotes of the note
 * currently in focus. Every section folds away on its own and the fold state is
 * persisted, so the panel can be trimmed down to just what you need.
 */
export class NotePanelView extends ItemView {
  readonly plugin: NotePanelPlugin;

  /** Non-persisted UI state that has to survive re-renders. */
  readonly ui: PanelUiState = {
    expandedFootnoteRefs: new Set<string>(),
    expandedFootnoteDefs: new Set<string>(),
    pendingEditPath: null,
    expandedItems: new Set<string>(),
  };

  private headerEl!: HTMLElement;
  private sectionsEl!: HTMLElement;
  private currentFile: TFile | null = null;
  private renderSeq = 0;
  private readonly scheduleRender: () => void;

  constructor(leaf: WorkspaceLeaf, plugin: NotePanelPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.navigation = false;
    this.scheduleRender = debounce(() => void this.render(), 120, true);
  }

  getViewType(): string {
    return NOTE_PANEL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return t("panelName");
  }

  getIcon(): string {
    return "panel-right";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("note-panel-view");
    const root = this.contentEl.createDiv({ cls: "np-root" });
    this.headerEl = root.createDiv({ cls: "np-header" });
    this.sectionsEl = root.createDiv({ cls: "np-sections" });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.scheduleRender()),
    );
    this.registerEvent(this.app.workspace.on("file-open", () => this.scheduleRender()));
    this.registerEvent(this.app.workspace.on("editor-change", () => this.scheduleRender()));
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (!this.currentFile || file.path === this.currentFile.path) this.scheduleRender();
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (this.currentFile && file.path === this.currentFile.path) {
          this.currentFile = null;
        }
        this.scheduleRender();
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (this.currentFile && oldPath === this.currentFile.path) {
          this.currentFile = file instanceof TFile ? file : null;
        }
        this.scheduleRender();
      }),
    );

    await this.render();
  }

  /** Rebuild the whole panel for the note that currently has focus. */
  async render(): Promise<void> {
    if (!this.sectionsEl) return;
    const seq = ++this.renderSeq;
    const file = this.resolveFile();
    const content = file ? await this.readContent(file) : "";
    if (seq !== this.renderSeq || !this.sectionsEl) return;

    const scrollTop = this.sectionsEl.scrollTop;
    this.renderHeader(file);
    this.sectionsEl.empty();

    if (!file) {
      emptyState(this.sectionsEl, t("noActiveNoteHint"));
      this.sectionsEl.scrollTop = 0;
      return;
    }

    const ctx: SectionContext = {
      app: this.app,
      plugin: this.plugin,
      view: this,
      file,
      content,
      lines: content.split("\n"),
      cache: this.app.metadataCache.getFileCache(file),
      navigate: (line, ch = 0) => void this.navigateToLine(file, line, ch),
      scheduleRender: () => this.scheduleRender(),
    };

    renderPropertiesSection(this.sectionsEl, ctx);
    renderOutlineSection(this.sectionsEl, ctx);
    renderFootnotesSection(this.sectionsEl, ctx);

    this.sectionsEl.scrollTop = scrollTop;
  }

  /** Cursor line of the note in the editor, when it is the focused one. */
  getCursorLine(): number | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !this.currentFile) return null;
    if (view.file?.path !== this.currentFile.path) return null;
    if (view.getMode() !== "source") return null;
    return view.editor.getCursor().line;
  }

  /** Scroll a line of `file` into view, opening the note when needed. */
  async navigateToLine(file: TFile, line: number, ch = 0): Promise<void> {
    const existing = this.findLeafFor(file);
    if (!existing) {
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file, { eState: { line, ch } });
      return;
    }
    await this.app.workspace.revealLeaf(existing);
    const view = existing.view;
    if (!(view instanceof MarkdownView)) return;
    if (view.getMode() === "source") {
      view.editor.setCursor({ line, ch });
      view.editor.scrollIntoView({ from: { line, ch }, to: { line, ch } }, true);
      view.editor.focus();
    } else {
      view.setEphemeralState({ line, ch });
    }
  }

  private findLeafFor(file: TFile): WorkspaceLeaf | null {
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (active?.file?.path === file.path) return active.leaf;
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view instanceof MarkdownView && view.file?.path === file.path) return leaf;
    }
    return null;
  }

  /**
   * The note the panel describes: whatever markdown file is focused, or — when
   * the panel itself has focus — the last one that was.
   */
  private resolveFile(): TFile | null {
    const active = this.app.workspace.getActiveFile();
    if (active) {
      this.currentFile = active.extension.toLowerCase() === "md" ? active : null;
    }
    if (this.currentFile && !this.app.vault.getAbstractFileByPath(this.currentFile.path)) {
      this.currentFile = null;
    }
    return this.currentFile;
  }

  private async readContent(file: TFile): Promise<string> {
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (active?.file?.path === file.path) return active.editor.getValue();
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view instanceof MarkdownView && view.file?.path === file.path) {
        return view.editor.getValue();
      }
    }
    try {
      return await this.app.vault.cachedRead(file);
    } catch {
      return "";
    }
  }

  private renderHeader(file: TFile | null): void {
    this.headerEl.empty();
    const info = this.headerEl.createDiv({ cls: "np-file" });
    info.createDiv({
      cls: "np-file-name",
      text: file ? file.basename : t("noActiveNote"),
    });
    if (file) info.title = file.path;

    const actions = this.headerEl.createDiv({ cls: "np-header-actions" });
    const allCollapsed = SECTION_IDS.every((id) => this.plugin.settings.collapsed[id]);
    iconButton(actions, {
      icon: allCollapsed ? "chevrons-up-down" : "chevrons-down-up",
      label: allCollapsed ? t("expandAll") : t("collapseAll"),
      onClick: () => this.setAllCollapsed(!allCollapsed),
    });
    iconButton(actions, {
      icon: "refresh-cw",
      label: t("refresh"),
      onClick: () => void this.render(),
    });
  }

  private setAllCollapsed(collapsed: boolean): void {
    for (const id of SECTION_IDS) this.plugin.settings.collapsed[id] = collapsed;
    void this.plugin.saveSettings();
    void this.render();
  }
}
