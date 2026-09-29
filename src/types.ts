import type { App, CachedMetadata, TFile } from "obsidian";
import type NoteInspectorPlugin from "./main";
import type { NoteInspectorView } from "./view";

/** The three stacked, collapsible parts of the panel. */
export type SectionId = "properties" | "outline" | "footnotes";

export const SECTION_IDS: SectionId[] = ["properties", "outline", "footnotes"];

export interface NoteInspectorSettings {
  /** Remembered collapsed/expanded state of every section. */
  collapsed: Record<SectionId, boolean>;
  /** Show the number of items next to a section title. */
  showCounts: boolean;
  /** Deepest heading level rendered in the outline (1-6). */
  outlineMaxLevel: number;
  /** Prefix outline entries with a `H1`..`H6` badge. */
  showHeadingLevels: boolean;
  /** Highlight the heading of the section the cursor currently sits in. */
  highlightCurrentHeading: boolean;
  /** Show the source line a footnote is referenced from. */
  showFootnoteContext: boolean;
  /** How many references to list inline before offering "show more". */
  footnoteRefLimit: number;
  /** Footnote ids whose reference rows were folded away (remembered). */
  foldedFootnoteRefs: string[];
}

export const DEFAULT_SETTINGS: NoteInspectorSettings = {
  collapsed: {
    properties: false,
    outline: false,
    footnotes: false,
  },
  showCounts: true,
  outlineMaxLevel: 6,
  showHeadingLevels: false,
  highlightCurrentHeading: true,
  showFootnoteContext: true,
  footnoteRefLimit: 8,
  foldedFootnoteRefs: [],
};

/** Fresh copy of the defaults, safe to mutate. */
export function cloneDefaultSettings(): NoteInspectorSettings {
  return {
    ...DEFAULT_SETTINGS,
    collapsed: { ...DEFAULT_SETTINGS.collapsed },
    foldedFootnoteRefs: [...DEFAULT_SETTINGS.foldedFootnoteRefs],
  };
}

/** A location in a note: a caret when `endLine` is absent, else a selection. */
export interface LineRange {
  line: number;
  ch?: number;
  endLine?: number;
  endCh?: number;
}

/** Everything a section renderer needs; built once per render pass. */
export interface SectionContext {
  app: App;
  plugin: NoteInspectorPlugin;
  view: NoteInspectorView;
  file: TFile;
  /** Current text of the note (editor buffer when available, else disk). */
  content: string;
  /** `content` split by newline, kept around for line-addressable lookup. */
  lines: string[];
  cache: CachedMetadata | null;
  /** Reveal a line — or select a range — in the note's editor. */
  navigate(target: LineRange): void;
  /** Replace an inclusive line range (editor buffer first, so undo works). */
  editLines(start: number, end: number, text: string): void;
  /**
   * Rebuild the panel after a user action (a write, a fold, a mode change).
   * Unlike the event-driven refresh this one always applies, because panel
   * state such as folded reference lists lives only in the DOM.
   */
  refresh(): void;
}

/** Mutable, non-persisted UI state that must survive re-renders. */
export interface PanelUiState {
  /** Footnote ids whose full reference list is expanded. */
  expandedFootnoteRefs: Set<string>;
  /** Footnote ids whose definition text is un-clamped. */
  expandedFootnoteDefs: Set<string>;
  /** Footnote ids whose reference rows are folded away. */
  collapsedFootnoteRefs: Set<string>;
  /** Property path to focus with an inline editor right after a render. */
  pendingEditPath: string[] | null;
  /** Array items (keyed by `file path::property path`) expanded to full detail. */
  expandedItems: Set<string>;
}
