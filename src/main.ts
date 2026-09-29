import { Plugin, type Command, type WorkspaceLeaf } from "obsidian";
import { setLocale, t } from "./i18n";
import { NoteInspectorSettingTab } from "./settings";
import { cloneDefaultSettings, type NoteInspectorSettings, type SectionId } from "./types";
import { VIEW_TYPE_NOTE_INSPECTOR, NoteInspectorView } from "./view";

export default class NoteInspectorPlugin extends Plugin {
  settings: NoteInspectorSettings = cloneDefaultSettings();

  /** Chrome Obsidian builds once at load time, which has to be re-labelled. */
  private ribbonEl: HTMLElement | null = null;
  private openCommand: Command | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    setLocale(this.settings.language);

    this.registerView(VIEW_TYPE_NOTE_INSPECTOR, (leaf) => new NoteInspectorView(leaf, this));

    this.ribbonEl = this.addRibbonIcon("list-tree", t("openPanel"), () =>
      void this.activateView(),
    );
    this.openCommand = this.addCommand({
      id: "open-note-inspector",
      name: t("openPanel"),
      callback: () => void this.activateView(),
    });

    this.addSettingTab(new NoteInspectorSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_NOTE_INSPECTOR);
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
    this.settings = {
      ...defaults,
      ...(stored ?? {}),
      collapsed: { ...defaults.collapsed, ...(stored?.collapsed ?? {}) },
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

  /** Remember which footnotes have their reference rows folded. */
  setFoldedFootnoteRefs(ids: Iterable<string>): void {
    this.settings.foldedFootnoteRefs = [...ids];
    void this.saveSettings();
  }

  applyLanguage(): void {
    setLocale(this.settings.language);
    const label = t("openPanel");
    this.ribbonEl?.setAttribute("aria-label", label);
    if (this.openCommand) this.openCommand.name = label;
  }

  /** Re-render every open panel (used after settings or language changes). */
  refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTE_INSPECTOR)) {
      const view = leaf.view;
      if (view instanceof NoteInspectorView) {
        view.syncFoldedFootnoteRefs();
        view.updateChrome();
        void view.render(true);
      }
    }
  }
}
