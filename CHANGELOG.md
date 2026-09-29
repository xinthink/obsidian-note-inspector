# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-09-29

### Changed

- Footnote reference lines now start **folded**, so a footnote list reads as
  definitions only until you ask for the references. The new "Expand reference
  lists" setting flips that default, and clicking a reference count or the
  section header button still toggles individual footnotes or all of them.
- Fold state moved from a list of folded footnotes to a default plus per-footnote
  overrides, so changing the default resets the manual tweaks predictably.

## [1.0.0] - 2026-09-29

First release.

### Added

- One side panel that stacks the three core note views for the note in focus:
  frontmatter **properties**, the heading **outline** and **footnotes**.
- Properties: YAML order preserved; nested objects render as `key: value` rows;
  arrays of records collapse to one expandable line each; scalars edit inline;
  boolean toggles; scalar arrays are chips you can add to, rename and remove;
  `Add property` (Text / List / Dict) and `Add field` / `Add item` for
  collections; reveal-in-note from any key; values render internal links,
  markdown links and bare URLs.
- Outline: heading tree with configurable depth, click to jump (cursor and
  selection in source mode, scroll in reading mode), optional heading level
  badges and optional highlight of the heading the cursor sits in.
- Footnotes: numbered in reference order, definition text rendered with links,
  line numbers plus context per reference, dangling references found by
  scanning the note, unused definitions marked, and definitions editable in
  place (clearing the text deletes the definition).
- Every section folds independently, per-footnote reference lists fold
  independently, and both fold states are remembered in `data.json`.
- Localised labels (English / Chinese) that follow the Obsidian UI language.

[1.0.1]: https://github.com/xinthink/obsidian-note-inspector/releases/tag/1.0.1
[1.0.0]: https://github.com/xinthink/obsidian-note-inspector/releases/tag/1.0.0
