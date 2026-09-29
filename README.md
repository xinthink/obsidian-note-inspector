# Note Inspector

[**English**](README.md) | [简体中文](README.zh.md)

Obsidian's **File properties**, **Outline** and **Footnotes** views stacked in a
single side panel for the note in focus, so you stop switching between three
panes. Every section folds on its own, and the fold state is remembered.

![The Note Inspector panel showing properties, outline and footnotes](docs/images/panel.png)

## What it gives you

### Properties

- Renders the frontmatter in YAML order, including nested objects
  (`generated: { by, at }`) and arrays of records (`references: [{ id, title }]`).
- **Nested objects** show one `key: value` row each: click a value to edit it in
  place, hover a row for copy / delete, and use **`+ Add field`** (present even on
  an empty `{}`) to add keys — the new field opens ready to type.
- **Arrays of records** collapse to one line per record and expand on click;
  **`+ Add item`** clones the shape of the previous record with blank values and
  focuses its first field. Arrays of plain values are chips you can rename,
  remove, and extend with `+`.
- **`+ Add property`** asks for the type first — Text, List or Dict — and then
  drops you into the new value.
- Booleans toggle, numbers and strings edit inline, and values containing
  `[[wikilinks]]`, `[markdown links](https://example.com)` or bare URLs render as
  links you can open.
- Click a **key** to reveal that line in the note. Writes go through Obsidian's
  `processFrontMatter`, the same path the built-in property editor uses.

### Outline

- Heading tree with configurable depth (`H1`–`H6`), optional level badges, and an
  optional highlight of the heading the cursor currently sits in.
- Click a heading to jump: the cursor moves and the editor scrolls in source mode,
  the preview scrolls in reading mode.

### Footnotes

![Footnotes with the reference lines folded](docs/images/folded.png)

- Numbered in reference order, matching the reading view, with the definition text
  rendered (links included) and the number of references per footnote.
- **One click on a definition edits it** in place: <kbd>Cmd/Ctrl</kbd>+<kbd>Enter</kbd>
  or ✓ saves through the editor buffer (so <kbd>Cmd/Ctrl</kbd>+<kbd>Z</kbd> works),
  <kbd>Esc</kbd> or ✗ cancels, and clearing the text deletes the definition
  including its indented continuation lines.
- **Reference lines start folded**, so the list reads as definitions first: click a
  “`N references`” label to open that footnote, or the section header button to open
  them all. Turn on *Expand reference lists* in the settings to start expanded
  instead. Whatever you choose is remembered.
- Click a **number or id** to select the whole definition in the editor, or a
  **reference row** to select that exact `[^id]` marker.
- Dangling references (`[^x]` with no definition) are found by scanning the note,
  because Obsidian's cache only keeps references it could resolve. They are marked
  *No matching definition*, and `+` writes the missing definition at the end of the
  note. Definitions nobody links to are marked *Defined but never referenced*.

### The panel

- Follows the note you are working on; clicking inside the panel keeps showing it
  rather than blanking out.
- Header shows the current note plus **collapse/expand all** and **refresh**.
- Section titles carry an item count (optional).

## Install

### From the community directory

Search for **Note Inspector** in **Settings → Community plugins → Browse** once the
plugin is listed there.

### Manually

Download `main.js`, `manifest.json` and `styles.css` from the
[latest release](https://github.com/xinthink/obsidian-note-inspector/releases), put
them in `<vault>/.obsidian/plugins/note-inspector/`, and enable the plugin in
**Settings → Community plugins**. Reload Obsidian if the plugin does not show up.

## Settings

| Setting | Default | Description |
|---|---|---|
| Show item counts | on | Show how many items each section holds |
| Outline depth | 6 | Deepest heading level shown in the outline |
| Show heading level badges | off | Prefix outline entries with `H1`–`H6` |
| Highlight current heading | on | Highlight the heading of the section the cursor is in |
| Show footnote context | on | Preview the line each footnote reference sits on |
| Expand reference lists | off | Open every footnote's reference lines straight away |
| References shown per footnote | 8 | Longer lists collapse behind “Show more” |
| Reset panel state | — | Restore default settings and fold state |

The panel labels follow the **Obsidian UI language** (Chinese for `zh*`, English
otherwise) — there is no separate language setting.

## Behaviour and limits

- All three sections are driven by Obsidian's **metadata cache**, so they refresh
  when the core Outline and Footnotes views do (about two seconds after you stop
  typing). Footnote text and ranges come from the editor buffer, so they are fresher
  than the cache.
- The panel rebuilds itself only when the note, its text or its cached metadata
  changed, so an inline editor is never destroyed while you are typing into it.
- Editing a property makes Obsidian rewrite the whole frontmatter block
  (`tags: [a, b]` can become a block list, flow mappings are expanded) — the same as
  the built-in property editor. Complex YAML (block scalars, anchors, custom
  structures) is not editable in the panel; click the key to jump to the source.
- Footnote edits use the editor buffer when the note is open, and `Vault.process`
  when it is not.
- Fold state for sections and footnote reference lists is stored in the plugin's
  `data.json`; record expansion and “Show more” are per-session on purpose.
- The plugin never touches any other part of your notes, and adds no network access,
  telemetry or ads.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

```bash
npm install
npm run dev         # esbuild watch
npm run build       # type check + production build
npm run check       # manifest / versions / package consistency
npm run deploy -- --vault "/path/to/vault"
obsidian plugin:reload id=note-inspector
```

## License

[MIT](LICENSE)
