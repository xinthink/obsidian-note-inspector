import { PluginSettingTab, Setting, type App } from "obsidian";
import { t } from "./i18n";
import type NotePanelPlugin from "./main";
import { cloneDefaultSettings, type PanelLanguage } from "./types";

export class NotePanelSettingTab extends PluginSettingTab {
  private readonly plugin: NotePanelPlugin;

  constructor(app: App, plugin: NotePanelPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("note-panel-settings");

    new Setting(containerEl)
      .setName(t("settings.language"))
      .setDesc(t("settings.languageDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("auto", t("settings.languageAuto"))
          .addOption("en", t("settings.languageEn"))
          .addOption("zh", t("settings.languageZh"))
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as PanelLanguage;
            await this.plugin.saveSettings();
            this.plugin.applyLanguage();
            this.plugin.refreshViews();
            this.display();
          }),
      );

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
