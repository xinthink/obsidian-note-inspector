import { PluginSettingTab, Setting, type App } from "obsidian";
import { t } from "./i18n";
import type NoteInspectorPlugin from "./main";
import { cloneDefaultSettings, type PanelLanguage } from "./types";

export class NoteInspectorSettingTab extends PluginSettingTab {
  private readonly plugin: NoteInspectorPlugin;

  constructor(app: App, plugin: NoteInspectorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /** Apply a language choice once, whichever way the control reports it. */
  private setLanguage(value: PanelLanguage): void {
    if (this.plugin.settings.language === value) return;
    this.plugin.settings.language = value;
    this.plugin.applyLanguage();
    this.plugin.refreshViews();
    void this.plugin.saveSettings();
    // Rebuild the tab after the control has finished dispatching its event.
    window.setTimeout(() => this.display(), 0);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("note-inspector-settings");

    new Setting(containerEl)
      .setName(t("settings.language"))
      .setDesc(t("settings.languageDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("auto", t("settings.languageAuto"))
          .addOption("en", t("settings.languageEn"))
          .addOption("zh", t("settings.languageZh"))
          .setValue(this.plugin.settings.language)
          .onChange((value) => this.setLanguage(value as PanelLanguage));
        // Belt and braces: apply the change even if the component's own
        // callback is bypassed.
        dropdown.selectEl?.addEventListener("change", () =>
          this.setLanguage(dropdown.getValue() as PanelLanguage),
        );
      });

    new Setting(containerEl)
      .setName(t("settings.showCounts"))
      .setDesc(t("settings.showCountsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showCounts).onChange(async (value) => {
          this.plugin.settings.showCounts = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }),
      );

    new Setting(containerEl)
      .setName(t("settings.outlineMaxLevel"))
      .setDesc(t("settings.outlineMaxLevelDesc"))
      .addSlider((slider) =>
        slider
          .setLimits(1, 6, 1)
          .setValue(this.plugin.settings.outlineMaxLevel)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.outlineMaxLevel = value;
            await this.plugin.saveSettings();
            this.plugin.refreshViews();
          }),
      );

    new Setting(containerEl)
      .setName(t("settings.showHeadingLevels"))
      .setDesc(t("settings.showHeadingLevelsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showHeadingLevels).onChange(async (value) => {
          this.plugin.settings.showHeadingLevels = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }),
      );

    new Setting(containerEl)
      .setName(t("settings.highlightCurrentHeading"))
      .setDesc(t("settings.highlightCurrentHeadingDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.highlightCurrentHeading)
          .onChange(async (value) => {
            this.plugin.settings.highlightCurrentHeading = value;
            await this.plugin.saveSettings();
            this.plugin.refreshViews();
          }),
      );

    new Setting(containerEl)
      .setName(t("settings.showFootnoteContext"))
      .setDesc(t("settings.showFootnoteContextDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showFootnoteContext)
          .onChange(async (value) => {
            this.plugin.settings.showFootnoteContext = value;
            await this.plugin.saveSettings();
            this.plugin.refreshViews();
          }),
      );

    new Setting(containerEl)
      .setName(t("settings.footnoteRefLimit"))
      .setDesc(t("settings.footnoteRefLimitDesc"))
      .addSlider((slider) =>
        slider
          .setLimits(1, 30, 1)
          .setValue(this.plugin.settings.footnoteRefLimit)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.footnoteRefLimit = value;
            await this.plugin.saveSettings();
            this.plugin.refreshViews();
          }),
      );

    new Setting(containerEl)
      .setName(t("settings.reset"))
      .setDesc(t("settings.resetDesc"))
      .addButton((button) =>
        button.setButtonText(t("settings.resetButton")).onClick(async () => {
          this.plugin.settings = cloneDefaultSettings();
          await this.plugin.saveSettings();
          this.plugin.applyLanguage();
          this.plugin.refreshViews();
          this.display();
        }),
      );
  }
}
