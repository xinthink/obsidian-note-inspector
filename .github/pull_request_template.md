## What does this change?

<!-- One or two sentences. Link the issue it closes, if any. -->

## How was it verified?

<!--
This plugin is verified by running it against a real vault, not by unit tests.
Say which Obsidian version and which shape of note you exercised, and what you
saw. "Reloaded the plugin, no errors in the console" is expected for every
change.
-->

- Obsidian version:
- Note used (frontmatter / headings / footnotes involved):
- What I checked:
  - [ ] `npm run typecheck` and `npm run build` pass
  - [ ] `node scripts/check-manifest.mjs` passes
  - [ ] Panel renders for a note with nested properties, headings and footnotes
  - [ ] Properties editing still writes the expected frontmatter
  - [ ] Footnote navigation / editing still selects the right lines
  - [ ] Fold state (sections and footnote references) survives a plugin reload

## Checklist

- [ ] I read `CONTRIBUTING.md` and the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [ ] No new `console.*` calls, `innerHTML`, or hardcoded colors
- [ ] README / CHANGELOG updated when behaviour or settings changed
