import { Plugin, type WorkspaceLeaf } from "obsidian";
import { setLocale, t } from "./i18n";
import { NoteInspectorSettingTab } from "./settings";
import { cloneDefaultSettings, type NoteInspectorSettings, type SectionId } from "./types";
import { VIEW_TYPE_NOTE_INSPECTOR, NoteInspectorView } from "./view";

export default class NoteInspectorPlugin extends Plugin {
  settings: NoteInspectorSettings = cloneDefaultSettings();

  async onload(): Promise<void> {
    await this.loadSettings();
    // Labels follow the Obsidian UI language for the whole session.
    setLocale();

    this.registerView(VIEW_TYPE_NOTE_INSPECTOR, (leaf) => new NoteInspectorView(leaf, this));

    this.addRibbonIcon("list-tree", t("openPanel"), () => void this.activateView());
    this.addCommand({
      id: "open-panel",
      name: t("openPanel"),
      callback: () => void this.activateView(),
    });

    this.addSettingTab(new NoteInspectorSettingTab(this.app, this));
  }

  /** Reveal the panel, creating it in the right sidebar on first use. */
  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(VIEW_TYPE_NOTE_INSPECTOR)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE_NOTE_INSPECTOR, active: true });
    }
    await workspace.revealLeaf(leaf);
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as
      | (Partial<NoteInspectorSettings> & { footnoteRefsExpanded?: boolean })
      | null;
    const defaults = cloneDefaultSettings();
    // Read field by field so settings from older versions (for example the
    // removed `language` option) are dropped instead of written back.
    this.settings = {
      collapsed: { ...defaults.collapsed, ...(stored?.collapsed ?? {}) },
      showCounts: stored?.showCounts ?? defaults.showCounts,
      outlineMaxLevel: stored?.outlineMaxLevel ?? defaults.outlineMaxLevel,
      showHeadingLevels: stored?.showHeadingLevels ?? defaults.showHeadingLevels,
      highlightCurrentHeading: stored?.highlightCurrentHeading ?? defaults.highlightCurrentHeading,
      footnoteRefLimit: stored?.footnoteRefLimit ?? defaults.footnoteRefLimit,
      // `footnoteRefsExpanded` was 1.0.1's name for the same switch.
      showFootnoteContext:
        stored?.showFootnoteContext ??
        stored?.footnoteRefsExpanded ??
        defaults.showFootnoteContext,
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** Persist the fold state of one section. */
  setSectionCollapsed(id: SectionId, collapsed: boolean): void {
    if (this.settings.collapsed[id] === collapsed) return;
    this.settings.collapsed[id] = collapsed;
    void this.saveSettings();
  }


  /** Re-render every open panel (used after settings or language changes). */
  refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTE_INSPECTOR)) {
      const view = leaf.view;
      if (view instanceof NoteInspectorView) {
        view.updateChrome();
        void view.render(true);
      }
    }
  }
}
