# Changelog

All notable changes to `@zambon-dev/framework` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Upgrading?** Each release lists what changed and, under
> **⚠ Breaking Changes / Migration**, the concrete steps required to move to that version.
> When no migration is needed, that subsection is omitted.

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### ⚠ Breaking Changes / Migration

## [1.3.1] - 2026-09-10

### Fixed

- **Returning to an already-open tab no longer crashes with `Maximum call stack size exceeded`.**
  It affected any screen whose route nests two empty-path levels — the shape every list screen uses:
  `path: ''` with `DefaultTabViewComponent`, and a child `path: ''` with the list component.

  `CustomReuseStrategy` keyed its detached-view cache on `route.component.name`, and a production
  build renames every class: esbuild wraps each component as `X = (() => { class i { } return i; })()`,
  so the name is one mangled letter that the whole chunk shares. An empty path contributes no URL
  segment, so both levels also resolved to the same URL — which left the two cache keys identical.
  Storing one handle overwrote the other, both route levels were then handed the same detached view,
  and Angular blew the stack building a router state whose node was its own descendant.

  The key is now built from the component's **identity** and the route's depth rather than its name.
  Applications need to change nothing. Worth knowing when reading old reports of this crash: it only
  ever reproduced in a minified build — `ng serve` keeps real class names — and only on the screens
  whose chunk happened to mangle to the same letter as the framework's, so a rebuild could move the
  symptom from one screen to another.

## [1.3.0] - 2026-07-30

### Added

- `framework-button-export` now accepts a **`defaultOption` `@Input()`** — the index into `options`
  exported when the main button itself is clicked, defaulting to `0` (Excel). This mirrors the input
  `framework-button-save` already had; `-1` means "no default" and makes the button only toggle its
  dropdown. See **Changed** below for the behaviour this changes by default.

### Changed

- **`framework-button-export` now exports on a single click**, to Excel by default, instead of only
  opening its format menu. `RibbonButtonComponent` treats a `defaultOption` of -1 as "no default" and
  merely toggles the dropdown; Export never set one, so the common case took two clicks while
  `framework-button-save` (which sets 0) took one. Export now sets 0 as well, through the new
  `defaultOption` `@Input()`. The format menu is unchanged and still reachable from the button's
  dropdown caret, so every format remains available.

### Fixed

- **Routed list views now fill the available height automatically.** `DefaultTabViewComponent` gave its
  routed child no layout and `lib-data-grid` has no `flex-grow` of its own, so a grid collapsed to its
  `rowsToDisplay × rowHeight` minimum with empty space beneath it, and every consuming list component
  had to repeat the same `:host { flex; flex-grow; overflow: hidden }` + `lib-data-grid { flex-grow }`
  stylesheet to compensate. `TabViewList` now carries a `framework-view-list` host class — inherited by
  every subclass — which `DefaultTabViewComponent` styles, so **consuming apps can delete those
  per-component stylesheets**. Routed screens that do not extend `TabViewList` (forms, dashboards) are
  unaffected.

- `framework-default-tab-view` and `framework-default-details-tab-view` no longer log
  `NG0100: ExpressionChangedAfterItHasBeenCheckedError` on every render in development mode.
  Both views assigned a placeholder ribbon template from `ngAfterViewInit` — after Angular had
  already checked the ribbon's `*ngTemplateOutlet` binding — which tripped the dev-mode change
  detection check one to three times per load. The placeholder rendered no content, so it has
  been removed and the outlet is now left empty until a view publishes its own `#ribbon`
  template. The rendered output is unchanged, and ribbon buttons still appear immediately for
  list and detail screens.

### ⚠ Breaking Changes / Migration

None — nothing has to change for your app to compile against this release. Two behaviour changes to
check, and one optional cleanup:

- **Absolutely-positioned content inside a routed list view is now clipped.** The full-height layout
  applied to `framework-view-list` includes `overflow: hidden`, so a popover, dropdown or tooltip that
  a list screen renders with `position: absolute` inside its own host is now cut off at the host's
  edges. Apps that had already written the equivalent `:host { overflow: hidden }` stylesheet by hand
  are unaffected — the clipping was already in place there. Only list screens that had no such
  stylesheet change. Fix by portaling the content out of the host (CDK Overlay, as `lib-catalog-select`
  does) rather than relying on `position: absolute`.
- If you relied on `framework-button-export`'s first click opening the format menu rather than
  exporting, set `[defaultOption]="-1"` to restore that behaviour.
- *Optional cleanup:* components extending `TabViewList` can now delete their
  `:host { display: flex; flex-grow: 1; overflow: hidden }` / `lib-data-grid { flex-grow: 1 }`
  stylesheets — `DefaultTabViewComponent` styles the inherited `framework-view-list` host class.

## [1.2.1] - 2026-07-29

### Fixed

- Lint configuration only: the library's ESLint selector rules now accept the `framework-` prefix
  that every `@framework` component already uses. They previously still expected the Angular
  scaffold's `lib` prefix, so the entire component surface reported
  `@angular-eslint/component-selector` errors. No selector was renamed, and no published API or
  runtime behavior changed — nothing to do on upgrade.

### ⚠ Breaking Changes / Migration

None.

## [1.2.0] - 2026-07-24

### Added

- `AppConfig` now accepts optional application metadata through a second `options` argument:
  `appName`, `companyName`, `environment`, `logoUrl`, `version`, `notificationsEnabled`, and
  `notificationsUrl`. These are consumed by the shared application shell (top bar + navigation).
  Existing `new AppConfig(baseUrl)` calls continue to work unchanged (`notificationsEnabled`
  defaults to `false`, other new fields to empty strings).

### ⚠ Breaking Changes / Migration

None.

## [1.1.1] - 2026-06-20

### Fixed

- `framework-button-export` now forwards its `iconSize` input to the underlying ribbon button,
  so setting `iconSize` correctly resizes the export button's icon. Previously the input was
  ignored and the icon always rendered at the default size.

## [1.1.0] - 2026-06-02

- Baseline release: the changelog starts being tracked from this version. Earlier history is
  available via [GitHub Releases](https://github.com/RicardoZambon/ZLibraries/releases) and the
  `framework-v*` tags.

[Unreleased]: https://github.com/RicardoZambon/ZLibraries/compare/framework-v1.3.1...HEAD
[1.3.1]: https://github.com/RicardoZambon/ZLibraries/releases/tag/framework-v1.3.1
[1.3.0]: https://github.com/RicardoZambon/ZLibraries/releases/tag/framework-v1.3.0
[1.2.1]: https://github.com/RicardoZambon/ZLibraries/releases/tag/framework-v1.2.1
[1.2.0]: https://github.com/RicardoZambon/ZLibraries/releases/tag/framework-v1.2.0
[1.1.1]: https://github.com/RicardoZambon/ZLibraries/releases/tag/framework-v1.1.1
[1.1.0]: https://github.com/RicardoZambon/ZLibraries/releases/tag/framework-v1.1.0
