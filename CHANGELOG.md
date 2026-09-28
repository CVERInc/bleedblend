# Changelog

All notable changes to bleedblend are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- `createBleedblendAuto().destroy()` now undoes its `<meta name="theme-color">`
  changes: the meta it inserted is removed and a page-authored one gets its original
  `content` back. Previously the last tint color stayed behind after `destroy()`.
- `colorsClose(a, b, threshold)` includes the threshold (`<=`), so `threshold = 0`
  treats identical colors as close instead of never matching.
- `colorsClose(a, b, null)` in the ESM build now falls back to the default threshold
  of 8, like the CommonJS build already did (it previously returned `false`).

### Changed

- CI now runs the integration suite (`test:auto`) in real Chrome against both the ESM
  source and the CommonJS mirror, and `test/units.mjs` checks the two builds export
  the same API and return the same answers.
- The integration suite finds Chrome on Linux (`google-chrome`, `chromium`, … on
  `PATH`) as well as macOS; `BLEEDBLEND_CHROME` still overrides.

## [2.3.0] - 2026-06-16

### Added

- `.bleedblend-push` — a layout modifier for `.bleedblend-top` / `.bleedblend-bottom`
  that flips the bar from `position: fixed` (overlay) to `position: sticky`, so it
  reserves its own row and pushes content away from the edge instead of covering it
  (e.g. a top language banner that shoves the page down rather than hiding the logo
  under it). It still tints the chrome: Safari 26 samples top/bottom `sticky`
  elements the same as `fixed`, and the controller's `STICKY_OWNED` detection is
  position-agnostic. Mirrored in `index.css` and the Tailwind plugin (parity guarded
  by `test/units.mjs`).
- Delivery baseline (CVER OSS dim 7): a CI workflow that runs the deterministic
  decision-logic suite plus the shared release-readiness gate, a tracked
  `hooks/pre-push` guard, and a `.github/FUNDING.yml`.
- Headless unit coverage for the page-end classifier (`isDesignedEndZone`) and
  for the Tailwind-plugin / `index.css` `.bleedblend-*` parity.

### Fixed

- Tailwind plugin: `.bleedblend-bottom` now includes the
  `--bleedblend-dynamic-bar-height` term in its `padding-bottom`, matching
  `index.css`. Previously the plugin dropped the compact-tab-bar offset, so the
  bottom bar rendered differently depending on whether you used the stylesheet
  or the plugin.

## [2.2.2]

### Changed

- Positioning aligned across the docs: the README badge and the "The Despair"
  section read across the whole Safari 26 family (iPhone / iPad / Mac) instead of
  iOS-only, matching the intro, compatibility note, and the sticky-bar recipe.
  The sharp quirks stay scoped to where they bite hardest (iPhone / iPad).
  Docs / positioning only — no behaviour change.

## [2.2.1]

- This changelog starts here. For changes in earlier releases, see the git
  history and the GitHub Releases page.
