# Contributing

Thanks for taking a look. This is a small plugin, so the process is light: one
focused change per pull request, verified by hand against a real vault.

## Requirements

- Node.js 18 or newer
- Obsidian (desktop) with a vault you can break — the panel reads and writes
  frontmatter and footnote lines, so do not point it at notes you cannot restore
  from a backup or from git.

## Setup

```bash
git clone https://github.com/xinthink/obsidian-note-inspector.git
cd obsidian-note-inspector
npm install
```

| Command | What it does |
|---|---|
| `npm run dev` | esbuild in watch mode, writes `main.js` with an inline source map |
| `npm run build` | type check + production build (minified, no source map) |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm run check` | validates `manifest.json` / `versions.json` / `package.json` consistency |
| `npm run deploy` | copies `main.js`, `manifest.json`, `styles.css` into a vault |

`npm run deploy` resolves the vault in this order:

1. `npm run deploy -- --vault "/path/to/vault"`
2. the `OBSIDIAN_VAULT` environment variable
3. the `vault` key of a local `config.json` (git-ignored, see `config.example.json`)

```bash
cp config.example.json config.json   # then edit the path
```

On macOS an iCloud vault lives under
`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/<vault>`.

Then reload the plugin. With the [Obsidian CLI](https://help.obsidian.md/cli):

```bash
obsidian plugin:reload id=note-inspector
obsidian dev:errors
```

Without it, toggle the plugin off and on in **Settings → Community plugins**.

## Project layout

```
src/
├── main.ts                 plugin entry: view, command, ribbon, settings tab
├── view.ts                 the panel: follows the active note, section shell,
│                           range navigation, line edits, render bookkeeping
├── settings.ts             settings tab
├── i18n.ts                 English / Chinese strings (follows the app language)
├── types.ts                settings shape and the section render context
├── components/collapsible.ts
├── sections/               properties.ts, outline.ts, footnotes.ts
└── util/                   frontmatter.ts, dom.ts, links.ts, rich-text.ts
styles.css                  panel styles, `ni-` namespace, Obsidian variables only
scripts/                    deploy + release checks
```

Three things are worth knowing before you change `view.ts`:

- The panel is driven by Obsidian's **metadata cache**, like the core Outline
  and Footnotes views, so it refreshes when the cache does. Footnote definition
  text and definition spans are read from the editor buffer, which is fresher.
- Renders are **skipped** when the note, its text and the cache are unchanged.
  Panel-local state (folded reference lists, expanded records, clamped
  definitions) goes through `ctx.refresh()`, which always rebuilds; event-driven
  refreshes stay skippable so an inline editor is never destroyed while typing.
- Fold state (sections and footnote reference lists) is persisted through the
  plugin settings; other expansion state is per-session on purpose.

## Conventions

Follow the [Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines):

- Build DOM with `createEl` / `createDiv` / `createSpan`, never `innerHTML`.
- No `console.*` output; surface problems with `Notice` or by doing nothing.
- Style with classes and Obsidian CSS variables only — no inline colors.
- Register events with `this.registerEvent(...)` and commands with
  `this.addCommand(...)` so Obsidian cleans them up.
- Use the plugin's `this.app`, not the global `app`.
- Prefer `async`/`await`, `const`, and small focused functions.

## Verifying a change

There is no unit test suite: the interesting behaviour is DOM plus a real vault.
Please do at least the following, and say in the pull request which Obsidian
version you used:

1. `npm run typecheck && npm run build && npm run check`
2. Reload the plugin; `obsidian dev:errors` (or the developer console) is clean.
3. Open a note that has nested frontmatter (`generated: { by, at }`, an array of
   records), several heading levels, a footnote with more than one reference, a
   dangling `[^x]`, and an unused definition. All three sections render it.
4. Edit a nested value, add a field, add an array item, add a property.
5. Follow / edit a footnote, fold its reference rows, reload the plugin and check
   that the fold state came back.
6. Switch notes, click inside the panel, and confirm the panel keeps showing the
   last focused note.

Handy while iterating (Obsidian must be running):

```bash
obsidian eval code="document.querySelectorAll('.ni-section-title').length"
obsidian dev:screenshot path=/tmp/panel.png
```

## Releasing

1. Bump the version in `manifest.json`, `package.json` and `versions.json`
   (add `"<version>": "<minAppVersion>"`), and add a `CHANGELOG.md` entry.
2. `npm run build && npm run check 1.2.3 --assets`
3. Commit, then tag the bare version and push it:

   ```bash
   git tag 1.2.3
   git push origin main 1.2.3
   ```

   The [release workflow](.github/workflows/release.yml) builds the plugin and
   creates a GitHub release with `main.js`, `manifest.json` and `styles.css`
   attached. Obsidian downloads those three files from the release whose tag
   matches the manifest version, so the tag must not have a `v` prefix.

### Publishing to the community directory

The initial submission is a one-time manual step that needs an Obsidian account:

1. Make sure `manifest.json` at the head of `main` is accurate — the directory
   reads it from the default branch.
2. Create the release as described above.
3. Sign in at <https://community.obsidian.md>, link the GitHub account that owns
   the repository, and add the plugin.
4. Work through the automated review feedback; each fix needs a new version and
   a new release.

After the plugin is published, new versions reach users straight from GitHub
releases — no further submission is needed.
