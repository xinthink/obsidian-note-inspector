# AGENTS.md — Note Inspector technical notes

> Design and implementation notes for **AI agents and maintainers**. End users
> should read [README.md](README.md); community contributors should read
> [CONTRIBUTING.md](CONTRIBUTING.md). User-facing docs describe *how to use* the
> plugin only — put design rationale here, never in the READMEs.

## 1. What this repo is

An Obsidian plugin (id `note-inspector`) that stacks the three core views — File
properties, Outline and Footnotes — into one side panel that follows the active
note. The three sections fold independently and their fold state is remembered.

## 2. Key design decisions (read before changing code)

### 2.1 Data sources

- All three sections are driven by Obsidian's **metadata cache** and refresh on the
  same schedule as the built-in Outline and Footnotes views: the cache lands about
  two seconds after the user stops typing, and only then does the panel see new
  headings or footnotes. Property edits go through `processFrontMatter`, whose
  cache event refreshes the panel immediately.
- Footnote **definition text and spans** come from the **editor buffer** (the
  active MarkdownView's `editor.getValue()` when the file is open, else
  `vault.cachedRead`): the cache lags behind, and a multi-line definition's cached
  position does not always cover its indented continuation lines.
  `definitionSpan()` combines the cached line number with a buffer scan
  (`continuationEnd()`) to derive the true span; editing, selection and deletion
  all rely on it.

### 2.2 Render model and skipping rebuilds (view.ts)

`render(force)` computes `contentKey = file.path + body length/hash`, then adds
`cacheEpoch` (incremented on `metadataCache.changed`) to form the render key:

- Key unchanged → skip. Clicking into the panel or switching back to the note
  therefore never rebuilds the DOM.
- **Cache changed, body unchanged, and an inline editor is open**
  (`.ni-edit-input` / `.ni-edit-textarea`) → defer, so a background refresh never
  destroys an editor the user is typing into.
- User actions (property writes, folds, expansions, toggling reference lines) go
  through `ctx.refresh()` = `render(true)`, which **always** rebuilds. Actions
  that only change DOM/session state must not be skippable — 1.0.1 had a
  "clicking does nothing" regression for exactly this reason.
- Event-driven refreshes (`active-leaf-change` / `file-open` / `editor-change` /
  `metadataCache.changed`) go through the debounced `scheduleRender()` (not
  forced).

### 2.3 State layering: what is persisted

| Layer | Content | Storage |
|---|---|---|
| Persisted | Section folds | `settings.collapsed` → `data.json` |
| Persisted | Settings (defaults) | `settings.*` → `data.json` |
| Per-session | Per-footnote reference lines, expanded records, `Show more` | `view.ui.*` sets, never written |

Rule: **peeking is not a preference** — do not write it to the config; layout and
defaults are the preferences. History: 1.0.1 persisted per-footnote reference
folds (`foldedFootnoteRefs` → `footnoteRefsToggled`); 1.0.2 replaced that with a
single switch plus a session-only peek: `showFootnoteContext` is the only default
switch, and per-footnote flips live in `view.ui.footnoteContextToggled` (helpers:
`isFootnoteContextShown` / `toggleFootnoteContext` / `setAllFootnoteContext`).

- `loadSettings()` reads **field by field**: removed keys are dropped and never
  written back. Keys that were removed or migrated: `language` (labels follow the
  app), `foldedFootnoteRefs`, `footnoteRefsToggled` (obsolete);
  `footnoteRefsExpanded` is read as the 1.0.1 spelling of `showFootnoteContext`.
- `DEFAULT_SETTINGS` mirrors the **maintainer's tuned configuration** in their
  real vault (`showHeadingLevels: true`, `showFootnoteContext: false`,
  `footnoteRefLimit: 3`, …). Confirm with the maintainer before changing a
  default; defaults only apply to keys missing from a vault's `data.json`.

### 2.4 Language

- Panel labels follow the Obsidian interface language: `moment.locale()` starting
  with `zh` → Chinese, otherwise English (`src/i18n.ts`). Obsidian configures the
  exported `moment` with the UI language.
- **Never read or write Obsidian's private storage** (the plugin once read
  `localStorage.language`; that is gone). A separate language setting existed and
  was removed.
- Obsidian copies a few labels at plugin load (tab title, view header, ribbon
  tooltip, command name). `view.updateChrome()` re-labels them when
  `refreshViews()` runs.

### 2.5 Write paths

- Frontmatter: always `app.fileManager.processFrontMatter` (atomic, the same path
  as the built-in property editor; the whole block may be re-serialised — that is
  expected).
- Footnote line edits: the editor path (`editor.replaceRange`, undoable) when the
  note is open in an editor, else `vault.process` (atomic). Empty text deletes the
  definition including its indented continuations (`view.editLines` removes the
  lines together with their newline).
- Reveal/select: `ctx.navigate({line, ch, endLine?, endCh?})` → source mode
  `setCursor`/`setSelection` + `scrollIntoView` + focus; reading mode
  `setEphemeralState`.

### 2.6 Other

- **Dangling references** (`[^x]` with no definition) are found by scanning the
  note body (`scanDanglingRefs`, skipping fenced code blocks) — Obsidian's cache
  only keeps references it could resolve, so they are invisible to the cache.
- `onunload` does **not** detach leaves (required by the plugin guidelines; leaves
  are re-initialised in place by Obsidian on update).
- Interaction details: section headers are keyboard operable (Enter/Space/←/→);
  hover action bars fade in with a CSS gradient; button selectors carry the
  element name (`button.ni-*`) to beat the theme's `button:not(.clickable-icon)`
  styles; accessibility uses `aria-expanded` / `aria-label`.

## 3. Layout

```
src/
├── main.ts                 entry: view/command/ribbon/settings registration; fold writes
├── view.ts                 the panel: active-note following, render bookkeeping (§2.2),
│                           navigate/editLines, updateChrome, session helpers (§2.3)
├── settings.ts             settings tab
├── i18n.ts                 English / Chinese strings (follows the app language)
├── types.ts                NoteInspectorSettings + DEFAULT_SETTINGS,
│                           SectionContext (navigate / editLines / refresh)
├── components/collapsible.ts  collapsible section shell (fold state persisted by caller)
├── sections/
│   ├── properties.ts       properties (render / inline edit / add-remove / reveal)
│   ├── outline.ts          outline
│   └── footnotes.ts        footnotes (definition spans, dangling scan, inline edit, reference lines)
└── util/                   frontmatter.ts / dom.ts / links.ts / rich-text.ts
styles.css                  panel styles (ni- namespace, Obsidian CSS variables only)
scripts/                    deploy.mjs, check-manifest.mjs
```

## 4. Development workflow

```bash
npm install
npm run dev         # esbuild watch
npm run build       # tsc --noEmit + esbuild production (main.js is not committed; it ships in releases)
npm run typecheck
npm run check       # manifest/versions/package consistency; accepts <tag> and --assets
npm run deploy -- --vault "<path>"   # or OBSIDIAN_VAULT / a local git-ignored config.json
obsidian plugin:reload id=note-inspector
obsidian dev:errors
```

## 5. Verification

There is no unit test suite: the interesting behaviour is DOM plus a real vault.
Script it with the Obsidian CLI's `eval` and write results to files under `/tmp`
for later reading. Keep each script short and avoid long `sleep` chains —
background windows get their timers throttled by Chromium, so long scripts stall
and later interfere with each other.

- Use **throwaway notes** (e.g. `_ni-*.md`) for write tests; delete them afterwards
  and never touch real notes.
- Screenshots for the READMEs use a **neutral demo note** (Sourdough starter
  notes) only; they must never contain real note content or titles.
- The mandatory checklist is in CONTRIBUTING.md "Verifying a change".

## 6. Releases and the community directory

1. Bump the version in `manifest.json`, `package.json` (and the lockfile root) and
   `versions.json`; add a `CHANGELOG.md` entry.
2. `npm run build && npm run check 1.2.3 --assets`.
3. Tag with the **bare version** (`1.2.3`, no `v`) → the release workflow builds
   and creates a GitHub release carrying main.js / manifest.json / styles.css.
   Obsidian downloads those three files from the release whose tag equals the
   manifest version.
4. First-time marketplace submission: sign in at community.obsidian.md, link the
   GitHub account, add the plugin. The directory reads `manifest.json` from the
   default branch's HEAD; work through the automated review, and every fix needs
   a version bump plus a new release.

## 7. Conventions

- No `console.*`, no `innerHTML`/`outerHTML`, no inline colours (Obsidian CSS
  variables only), no default hotkeys.
- Use `this.app`, never the global `app`; register events/commands with
  `registerEvent` / `addCommand`; prefer `async`/`await`.
- Sentence case in UI text; no "settings" in settings-tab headings.
- CSS namespace `ni-`. Document layering: READMEs = users (usage only), AGENTS.md =
  this file (design/implementation), CONTRIBUTING.md = community workflow,
  CHANGELOG.md = user-visible changes.
