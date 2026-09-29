import { Plugin, type WorkspaceLeaf } from "obsidian";
import { setLocale, t } from "./i18n";
import { NotePanelSettingTab } from "./settings";
import { cloneDefaultSettings, type NotePanelSettings, type SectionId } from "./types";
import { NOTE_PANEL_VIEW_TYPE, NotePanelView } from "./view";

export default class NotePanelPlugin extends Plugin {
  settings: NotePanelSettings = cloneDefaultSettings();

  async onload(): Promise<void> {
    await this.loadSettings();
    setLocale(this.settings.language);

    this.registerView(NOTE_PANEL_VIEW_TYPE, (leaf) => new NotePanelView(leaf, this));

    this.addRibbonIcon("panel-right", t("openPanel"), () => void this.activateView());
    this.addCommand({
      id: "open-note-panel",
      name: t("openPanel"),
      callback: () => void this.activateView(),
    });

    this.addSettingTab(new NotePanelSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(NOTE_PANEL_VIEW_TYPE);
  }

  /** Reveal the panel, creating it in the right sidebar on first use. */
  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(NOTE_PANEL_VIEW_TYPE)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: NOTE_PANEL_VIEW_TYPE, active: true });
    }
    await workspace.revealLeaf(leaf);
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Partial<NotePanelSettings> | null;
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

  applyLanguage(): void {
    setLocale(this.settings.language);
  }

  /** Re-render every open panel (used after settings or language changes). */
  refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(NOTE_PANEL_VIEW_TYPE)) {
      const view = leaf.view;
      if (view instanceof NotePanelView) void view.render(true);
    }
  }
}
