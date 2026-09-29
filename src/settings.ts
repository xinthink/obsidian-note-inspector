import {
  Notice,
  PluginSettingTab,
  type App,
  type SettingDefinitionItem,
} from "obsidian";
import { t } from "./i18n";
import type NoteInspectorPlugin from "./main";
import { cloneDefaultSettings } from "./types";

export class NoteInspectorSettingTab extends PluginSettingTab {
  private readonly plugin: NoteInspectorPlugin;

  constructor(app: App, plugin: NoteInspectorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const definitions: SettingDefinitionItem[] = [
      {
        name: t("settings.showCounts"),
        desc: t("settings.showCountsDesc"),
        control: { type: "toggle", key: "showCounts" },
      },
      {
        name: t("settings.outlineMaxLevel"),
        desc: t("settings.outlineMaxLevelDesc"),
        control: { type: "slider", key: "outlineMaxLevel", min: 1, max: 6, step: 1 },
      },
      {
        name: t("settings.showHeadingLevels"),
        desc: t("settings.showHeadingLevelsDesc"),
        control: { type: "toggle", key: "showHeadingLevels" },
      },
      {
        name: t("settings.highlightCurrentHeading"),
        desc: t("settings.highlightCurrentHeadingDesc"),
        control: { type: "toggle", key: "highlightCurrentHeading" },
      },
      {
        name: t("settings.showFootnoteContext"),
        desc: t("settings.showFootnoteContextDesc"),
        control: { type: "toggle", key: "showFootnoteContext" },
      },
      {
        name: t("settings.footnoteRefLimit"),
        desc: t("settings.footnoteRefLimitDesc"),
        control: { type: "slider", key: "footnoteRefLimit", min: 1, max: 30, step: 1 },
      },
      {
        name: t("settings.reset"),
        desc: t("settings.resetDesc"),
        action: () => void this.reset(),
      },
    ];
    return definitions;
  }

  private async reset(): Promise<void> {
    this.plugin.settings = cloneDefaultSettings();
    await this.plugin.saveSettings();
    this.plugin.refreshViews();
    new Notice(t("settings.resetDone"));
    this.update();
  }
}
