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
      id: "open-note-inspector",
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
    const stored = (await this.loadData()) as Partial<NoteInspectorSettings> | null;
    const defaults = cloneDefaultSettings();
    // Read field by field so settings from older versions (for example the
    // removed `language` option) are dropped instead of written back.
    this.settings = {
      collapsed: { ...defaults.collapsed, ...(stored?.collapsed ?? {}) },
      showCounts: stored?.showCounts ?? defaults.showCounts,
      outlineMaxLevel: stored?.outlineMaxLevel ?? defaults.outlineMaxLevel,
      showHeadingLevels: stored?.showHeadingLevels ?? defaults.showHeadingLevels,
      highlightCurrentHeading: stored?.highlightCurrentHeading ?? defaults.highlightCurrentHeading,
      showFootnoteContext: stored?.showFootnoteContext ?? defaults.showFootnoteContext,
      footnoteRefLimit: stored?.footnoteRefLimit ?? defaults.footnoteRefLimit,
      footnoteRefsExpanded: stored?.footnoteRefsExpanded ?? defaults.footnoteRefsExpanded,
      footnoteRefsToggled: [...(stored?.footnoteRefsToggled ?? defaults.footnoteRefsToggled)],
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

  /**
   * Whether a footnote shows its reference rows. Entries the user toggled by
   * hand keep their own state; everything else follows the default.
   */
  isFootnoteRefsExpanded(id: string): boolean {
    const flipped = this.settings.footnoteRefsToggled.includes(id);
    return flipped ? !this.settings.footnoteRefsExpanded : this.settings.footnoteRefsExpanded;
  }

  /** Flip one footnote away from the default and remember it. */
  toggleFootnoteRefs(id: string): void {
    const toggled = this.settings.footnoteRefsToggled;
    this.settings.footnoteRefsToggled = toggled.includes(id)
      ? toggled.filter((entry) => entry !== id)
      : [...toggled, id];
    void this.saveSettings();
  }

  /** Set every given footnote to `expanded`, dropping redundant overrides. */
  setAllFootnoteRefsExpanded(ids: string[], expanded: boolean): void {
    const others = this.settings.footnoteRefsToggled.filter((id) => !ids.includes(id));
    this.settings.footnoteRefsToggled =
      expanded === this.settings.footnoteRefsExpanded ? others : [...others, ...ids];
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
