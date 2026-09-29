# Contributing

Thanks for taking a look. One focused change per pull request, verified by hand
against a real vault.

## Requirements

- Node.js 18 or newer
- Obsidian (desktop) with a vault you can break — the panel writes frontmatter and
  footnote lines, so point it at notes you can restore from a backup or from git.

## Setup

```bash
git clone https://github.com/xinthink/obsidian-note-inspector.git
cd obsidian-note-inspector
npm install
```

| Command | What it does |
|---|---|
| `npm run dev` | esbuild in watch mode, writes `main.js` with an inline source map |
| `npm run build` | type check + production build (minified) |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm run check` | validates `manifest.json` / `versions.json` / `package.json` consistency |
| `npm run lint` | `eslint .` with the obsidianmd recommended config — the same rules the community review runs; `manifest.json` is validated as JSON |
| `npm run lint:css` | stylelint with the official `stylelint-config-obsidianmd`, the same CSS rules the community review runs |
| `npm version <patch\|minor\|major>` | bumps package.json + lockfile, and the `version` script syncs `manifest.json` / `versions.json` |
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

## Where things live

The source layout and the design decisions behind the panel are documented in
[AGENTS.md](AGENTS.md). Read it before touching `view.ts` — the render bookkeeping
and the split between persisted settings and session state are easy to break.

## Conventions

Follow the [Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines):

- Build DOM with `createEl` / `createDiv` / `createSpan`, never `innerHTML`.
- No `console.*` output; surface problems with `Notice` or by doing nothing.
- Style with classes and Obsidian CSS variables only — no inline colors.
- Register events with `this.registerEvent(...)` and commands with `this.addCommand(...)`.
- Use the plugin's `this.app`, not the global `app`; prefer `async`/`await`.
- Keep `npm run lint` clean; the community directory review runs the same rules.

## Verifying a change

There is no unit test suite: the interesting behaviour is DOM plus a real vault.
Please do at least the following, and say in the pull request which Obsidian
version you used:

1. `npm run lint && npm run lint:css && npm run typecheck && npm run build && npm run check`
2. Reload the plugin; `obsidian dev:errors` (or the developer console) is clean.
3. Open a note that has nested frontmatter (`generated: { by, at }`, an array of
   records), several heading levels, a footnote with more than one reference, a
   dangling `[^x]`, and an unused definition. All three sections render it.
4. Edit a nested value, add a field, add an array item, add a property.
5. Follow / edit a footnote, show and hide its reference lines, reload the plugin
   and check the configured default came back.
6. Switch notes, click inside the panel, and confirm the panel keeps showing the
   last focused note.

Handy while iterating (Obsidian must be running):

```bash
obsidian eval code="document.querySelectorAll('.ni-section-title').length"
obsidian dev:screenshot path=/tmp/panel.png
```

## Releasing

1. Add a `CHANGELOG.md` entry, then run:

   ```bash
   npm version patch   # or minor / major
   ```

   `npm version` bumps `package.json` and the lockfile, commits, and the `version`
   script keeps `manifest.json` and `versions.json` in sync. `.npmrc` sets
   `tag-version-prefix=""`, so the tag is the bare version with no `v` prefix.

2. `npm run lint && npm run build && npm run check 1.2.3 --assets`
3. Push:

   ```bash
   git push origin main 1.2.3
   ```

   The [release workflow](.github/workflows/release.yml) builds the plugin, checks
   the tag against the manifest, attests `main.js` / `styles.css`, and creates a
   **draft** GitHub release with the three files attached.

4. Review the draft release on GitHub, then click **Publish**. Obsidian downloads
   the assets from the published release whose tag matches the manifest version.

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
