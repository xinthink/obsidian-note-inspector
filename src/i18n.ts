import { moment } from "obsidian";
import type { PanelLanguage } from "./types";

/**
 * Tiny two-language string table. The panel follows the Obsidian UI language
 * (`auto`) unless the user pins one in the settings tab.
 */
const en = {
  panelName: "Note inspector",
  openPanel: "Open note inspector",
  expandAll: "Expand all sections",
  collapseAll: "Collapse all sections",
  refresh: "Refresh",
  noActiveNote: "No active note",
  noActiveNoteHint: "Open a note to see its properties, outline and footnotes.",

  properties: "Properties",
  propertiesEmpty: "No properties in this note.",
  addProperty: "Add property",
  addKey: "Add field",
  propertyName: "Property name",
  keyName: "Field name",
  typeText: "Text",
  typeList: "List",
  typeDict: "Dict",
  propertyExists: "Property already exists: ",
  jumpToSource: "Reveal in note",
  copyValue: "Copy value",
  deleteProperty: "Delete property",
  copied: "Copied to clipboard",
  emptyValue: "Empty",
  addItem: "Add item",
  removeItem: "Remove item",
  clickToEdit: "Click to edit",

  outline: "Outline",
  outlineEmpty: "No headings in this note.",
  jumpToHeading: "Go to heading",

  footnotes: "Footnotes",
  footnotesEmpty: "No footnotes in this note.",
  footnoteMissing: "No matching definition",
  footnoteUnused: "Defined but never referenced",
  editDefinition: "Edit definition",
  addDefinition: "Add definition",
  collapseReferences: "Collapse references",
  expandReferences: "Expand references",
  collapseAllReferences: "Collapse all references",
  expandAllReferences: "Expand all references",
  selectInNote: "Select the matching text in the note",
  definitionPlaceholder: "Footnote text",
  saveHint: "{modifier}+Enter to save · Esc to cancel",
  save: "Save",
  cancel: "Cancel",
  footnoteReferenceOne: "1 reference",
  footnoteReferenceMany: "{n} references",
  showMore: "Show more",
  showLess: "Show less",

  settings: {
    language: "Panel language",
    languageDesc: "Language of the panel labels. Choose “Same as app” to follow Obsidian.",
    languageAuto: "Same as app",
    languageEn: "English",
    languageZh: "简体中文",
    showCounts: "Show item counts",
    showCountsDesc: "Display how many properties, headings or footnotes a section holds.",
    outlineMaxLevel: "Outline depth",
    outlineMaxLevelDesc: "Deepest heading level (H1–H6) shown in the outline.",
    showHeadingLevels: "Show heading level badges",
    showHeadingLevelsDesc: "Prefix each outline entry with a small H1–H6 label.",
    highlightCurrentHeading: "Highlight current heading",
    highlightCurrentHeadingDesc:
      "Highlight the heading of the section the cursor is in (source mode).",
    showFootnoteContext: "Show footnote context",
    showFootnoteContextDesc: "Preview the line each footnote reference sits on.",
    footnoteRefLimit: "References shown per footnote",
    footnoteRefLimitDesc: "Longer reference lists collapse behind a “Show more” button.",
    reset: "Reset panel state",
    resetDesc: "Restore the default collapsed state and settings.",
    resetButton: "Reset",
    resetDone: "Note inspector settings reset.",
  },
};

type Dict = typeof en;

const zh: Dict = {
  panelName: "笔记检查器",
  openPanel: "打开笔记检查器",
  expandAll: "展开全部",
  collapseAll: "折叠全部",
  refresh: "刷新",
  noActiveNote: "没有活动笔记",
  noActiveNoteHint: "打开一篇笔记即可查看其属性、大纲与脚注。",

  properties: "属性",
  propertiesEmpty: "这篇笔记没有属性。",
  addProperty: "添加属性",
  addKey: "添加字段",
  propertyName: "属性名",
  keyName: "字段名",
  typeText: "文本",
  typeList: "列表",
  typeDict: "字典",
  propertyExists: "属性已存在：",
  jumpToSource: "在笔记中定位",
  copyValue: "复制值",
  deleteProperty: "删除属性",
  copied: "已复制到剪贴板",
  emptyValue: "空",
  addItem: "添加项",
  removeItem: "删除该项",
  clickToEdit: "点击编辑",

  outline: "大纲",
  outlineEmpty: "这篇笔记没有标题。",
  jumpToHeading: "跳转到标题",

  footnotes: "脚注",
  footnotesEmpty: "这篇笔记没有脚注。",
  footnoteMissing: "缺少对应定义",
  footnoteUnused: "已定义但未被引用",
  editDefinition: "编辑脚注定义",
  addDefinition: "补写定义",
  collapseReferences: "折叠引用",
  expandReferences: "展开引用",
  collapseAllReferences: "折叠全部引用",
  expandAllReferences: "展开全部引用",
  selectInNote: "在笔记中选中对应文本",
  definitionPlaceholder: "脚注正文",
  saveHint: "{modifier}+Enter 保存 · Esc 取消",
  save: "保存",
  cancel: "取消",
  footnoteReferenceOne: "1 处引用",
  footnoteReferenceMany: "{n} 处引用",
  showMore: "展开",
  showLess: "收起",

  settings: {
    language: "面板语言",
    languageDesc: "面板界面文字使用的语言。选择「跟随应用」即与 Obsidian 界面保持一致。",
    languageAuto: "跟随应用",
    languageEn: "English",
    languageZh: "简体中文",
    showCounts: "显示条目数量",
    showCountsDesc: "在各分区标题旁显示属性 / 标题 / 脚注的数量。",
    outlineMaxLevel: "大纲深度",
    outlineMaxLevelDesc: "大纲中显示到第几级标题（H1–H6）。",
    showHeadingLevels: "显示标题级别标记",
    showHeadingLevelsDesc: "在每条大纲前显示 H1–H6 小标签。",
    highlightCurrentHeading: "高亮当前标题",
    highlightCurrentHeadingDesc: "高亮光标所在章节对应的标题（源码模式）。",
    showFootnoteContext: "显示脚注上下文",
    showFootnoteContextDesc: "预览每条脚注引用所在行的文字。",
    footnoteRefLimit: "每条脚注显示的引用数",
    footnoteRefLimitDesc: "超过该数量的引用会折叠到「展开」按钮后面。",
    reset: "重置面板状态",
    resetDesc: "恢复默认的折叠状态与全部设置。",
    resetButton: "重置",
    resetDone: "笔记检查器设置已重置。",
  },
};

const TABLES: Record<"en" | "zh", Dict> = { en, zh };

let activeLocale: "en" | "zh" = "en";

/** Called once on load and whenever the language setting changes. */
export function setLocale(preference: PanelLanguage): void {
  if (preference === "en" || preference === "zh") {
    activeLocale = preference;
    return;
  }
  activeLocale = detectAppLocale().startsWith("zh") ? "zh" : "en";
}

function detectAppLocale(): string {
  try {
    const stored = window.localStorage?.getItem("language");
    if (stored) return stored;
    return moment.locale();
  } catch {
    return "en";
  }
}

function lookup(key: string): string {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = TABLES[activeLocale];
  for (const part of parts) {
    node = node?.[part];
  }
  return typeof node === "string" ? node : key;
}

/** Translate `key`, substituting `{name}` placeholders from `vars`. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let out = lookup(key);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.split(`{${name}}`).join(String(value));
    }
  }
  return out;
}
