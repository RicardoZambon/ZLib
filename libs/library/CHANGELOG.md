# Changelog

All notable changes to `@zambon-dev/library` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Upgrading?** Each release lists what changed and, under
> **⚠ Breaking Changes / Migration**, the concrete steps required to move to that version.
> When no migration is needed, that subsection is omitted.

## [Unreleased]

### Added

- **Sidebar menu items can now open an external destination instead of an internal route.**
  `SidebarMenu` gained an optional `openMode` (`SidebarMenuOpenMode`): `Internal` (the default),
  `ExternalNewTab`, or `ExternalEmbedded`. Read it through the exported
  `toSidebarMenuOpenMode(menu.openMode)` helper rather than comparing the field directly — the
  value is deserialized straight from your menu endpoint, so the helper accepts the mode as a
  camelCase string, as a case-insensitive variant of it, or as the enum ordinal an ASP.NET Core
  enum property serializes to. Anything unrecognized — an omitted field from a backend that
  predates this feature, `null`, or a mode a newer version adds — degrades to `Internal`, so a
  menu you have not touched behaves exactly as it does today.

- **`SidebarService.menuExternalUrlSelected`** — a separate output carrying the items whose mode
  is not `Internal`. They are deliberately **not** announced on `menuUrlSelected`, which keeps its
  existing contract: the URL it carries is always an Angular route. Acting on external items needs
  `@zambon-dev/shared` (which opens the browser tab or the embedded view), or your own subscription
  to the new output. Until then an external item highlights and does nothing, rather than sending
  `https://…` to the router.

- **`SidebarConfigs.externalLinkText`** — the tooltip on items that open in a new browser tab.
  Defaults to `Opens in a new browser tab` and, like `errorText` and `loadingText`, is rendered
  as-is rather than through the translate pipe, so pass an already-localized string.

### Changed

- **Selection now follows the open mode.** An item that opens in a new browser tab is treated as an
  action rather than a destination: it takes no selection pill and, importantly, does not clear the
  selection of the view the user is still looking at. Items that open embedded become real
  application tabs and keep today’s selection behaviour exactly. A parent that also carries a URL
  still expands, so it cannot become impossible to open.

- **Items that open in a new browser tab show a trailing outbound glyph.** It sits in the same
  absolutely-positioned slot as the parent chevron, so a long label still ellipsises inside the
  anchor and the collapsed rail is unchanged, and it fades in with the sidebar like the other
  affordances. Embedded items get no glyph — they stay inside the application. Items with no
  `openMode`, or with `openMode: Internal`, render exactly as before.

### Deprecated

### Removed

### Fixed

### ⚠ Breaking Changes / Migration

None. `openMode` is optional, so a backend that does not send it produces today’s behaviour, and
`menuUrlSelected` is unchanged for internal items. If you subscribe to `menuUrlSelected` yourself
and want external items too, add a subscription to `menuExternalUrlSelected`.

## [1.3.2] - 2026-07-30

### Added

- **Storybook: `Data Grid/Data Grid ▸ Multi Select Tall Rows` story** — multi-selection over rows
  taller than the default `rowHeight` (41.6px), the height a row needs once it shows a thumbnail.
  Misalignment in the selection column is obvious at that height, so this is the story to check the
  selection checkbox against. Development-only: stories are excluded from the package build.

### Changed

- **`lib-ribbon` now hides itself when it contains no visible buttons.** A screen with no ribbon
  actions — a dashboard, or any view that projects an empty `#ribbon` template — previously still
  rendered the bar's border, background and padding around nothing, wasting vertical space at the top
  of the page. This mirrors `lib-ribbon-group`, which already hid itself when none of its children
  were visible. Ribbons with at least one visible group are unaffected. See
  **⚠ Breaking Changes / Migration** below.

### Fixed

- **`lib-data-grid`'s multi-selection checkbox is now vertically centred in the row.** The checkbox is
  styled with `vertical-align: super`, which lifts it off the middle of its line box — roughly 6px at
  the default font size. At the default `configs.rowHeight` (41.6px) the drift is easy to miss, but on
  taller rows (say `rowHeight: 56` for a row showing a thumbnail) the checkbox visibly hugged the top
  of the row while the text columns stayed centred. The selection cell now lays its checkbox out as a
  flex item, so it is centred by the box model and `vertical-align` no longer applies to it. The cell
  is also tagged with a `selection` class, mirroring the header's `header-cell selection`. Horizontal
  placement is unchanged, and no consumer changes are required.
- **Form inputs no longer render a stray bordered box when `type` is set as a static attribute.**
  Angular keeps static attributes in the DOM even when a directive consumes them as an `@Input()`, so
  `<lib-form-input-group type="checkbox">` left a `type="checkbox"` attribute on the host element —
  where `@tailwindcss/forms`' tag-agnostic `[type="checkbox"]` base rules styled the host itself as a
  checkbox (1px border, white fill, `height: 1rem`), drawing an empty-input box around the field row
  and tinting its icon. `FormInputGroupComponent` and `FormInputComponent` now clear the attribute via
  a host binding. This affects every value of `type` (`checkbox`, `date`, `number`, `password`, …);
  both `type="checkbox"` and `[type]="'checkbox'"` now render identically, so existing call sites are
  fixed with no changes required.
- **`lib-multi-editor` no longer discards rows the user did not type into.** `MultiEditorDataset.newData()`
  exists so implementations can pre-fill a new row, but `onNewClick` reached the form through
  `reset()` + `patchValue()`, which leaves it pristine — and the change tracker only records a row
  while `formGroup.dirty`. Pre-filled values were therefore shown in the grid and then dropped from
  the save batch. The visible symptom was worse than lost defaults: adding several rows and editing
  only the last one saved just that row, because `onSaveClick` validates the current selection only,
  so the earlier rows silently vanished on refresh. `newData()`'s values are now registered when the
  row is added.

### ⚠ Breaking Changes / Migration

`lib-multi-editor` now sends rows that `newData()` pre-filled but the user never edited. Nothing to do
if your `newData()` returns an empty object (`{}`) — the common "blank row" convention — since a
value-less row is still skipped and the posted batch is byte-for-byte what it was before. If your
`newData()` *does* return field values, those rows now reach `saveData()` where they were previously
dropped, so a batch may contain entries it did not before; verify your backend rejects or defaults
them as you expect.

`lib-ribbon` now hides itself when it has neither a visible `lib-ribbon-group` nor any other
projected content. No action needed if your ribbons use groups (the normal case). The rule is a
global selector at specificity (0,1,2), so overriding it requires `!important`. Because the bar can
now appear and disappear rather than merely resize, anything positioned relative to the ribbon may
shift when a button's visibility resolves (e.g. as permissions arrive).

## [1.3.1] - 2026-07-28

> There is no `1.3.0` on npm: the version number was taken by an early publish that was later
> unpublished, and npm never allows a retired version number to be reused. The sidebar rework below
> therefore shipped as `1.3.1`. Upgrade straight from `1.2.0` to `1.3.1`.

### Added

- Semantic `--sidebar-*` design tokens covering the sidebar's surfaces, text, selection, glass, and
  radii (`--sidebar-bg`, `--sidebar-nav-bg`, `--sidebar-text`, `--sidebar-text-muted`,
  `--sidebar-item-hover-bg`, `--sidebar-item-selected-bg`, `--sidebar-blur`, `--sidebar-shadow`,
  `--sidebar-tree-line`, `--sidebar-radius`, `--sidebar-item-radius`, …) so consumers can re-theme
  the sidebar entirely via CSS custom properties.
- **Menu regions**: an optional `SidebarMenu.region` label groups top-level items under an uppercase
  group header (e.g. "MAIN"). Items without a `region` render ungrouped, so it stays
  backward-compatible. When the rail is collapsed, each header cross-fades to a short separator line
  so the groups remain visually distinct. The grouping type is exported as `SidebarRegion`.

### Changed

- Selected menu items now render as a rounded **pill** highlight (inset when expanded) instead of the
  previous 4px left accent bar.
- The sidebar is now a **translucent, blurred "glass" panel** — rounded corners, a soft drop shadow,
  and a semi-transparent brand surface — rather than a solid, square, edge-to-edge rail (all
  token-driven via `--sidebar-bg`, `--sidebar-blur`, `--sidebar-shadow`, `--sidebar-radius`).
- **Child (sub-menu) items** now render a rounded **tree-connector** line instead of a menu icon;
  top-level items keep their icons.
- Collapsing/expanding the rail is now **animated end to end**: the toggle chevron and the
  expandable-parent caret rotate in the same direction, the selection pill inset and item icons ease
  into place, and region headers cross-fade to their separators — all in sync with the rail width.

### ⚠ Breaking Changes / Migration

The sidebar surface is now **translucent** ("glass"). If your app does not place a colored backdrop
behind the sidebar, the rail will look faint over plain/neutral content — either add a
colored/gradient backdrop behind it (see `@shared`'s `--app-backdrop` in `MainLayoutComponent`) or
override `--sidebar-bg` (and the other `--sidebar-*` surface tokens) with opaque values to keep a
solid rail.

## [1.2.0] - 2026-07-24

### Added

- `SidebarComponent` now renders its own collapse/expand toggle: a light circular chevron "handle"
  that straddles the sidebar's right edge (`angle-left` to collapse when expanded, `angle-right` to
  expand when collapsed), matching the conventional rail-collapse affordance.
- `SidebarComponent` now has a content-projection slot (`<ng-content>`) rendered as a footer at the
  bottom of the sidebar — for extra elements after the menu (e.g. an app version). It is hidden when
  the rail is collapsed and collapses entirely when nothing is projected.

### Changed

- `SidebarComponent` no longer renders the logo or the user-profile header — it now shows only the
  navigation toggle and menu. Application branding and user identity are expected to live in the top
  bar (`shared-top-bar` in `@shared`).
- Sidebar menu items now use an on-palette hover surface (a subtle light overlay) instead of the
  previous off-palette `slate-700`.

### ⚠ Breaking Changes / Migration

If you relied on the sidebar's logo (`SidebarConfigs.logoCollapsedPath` / `logoExpandedPath`) or its
user profile (`SidebarService.getUserProfile()`), move that presentation to the top bar. Those
config options and the `getUserProfile()` method still exist but are no longer consumed by
`SidebarComponent`.

## [1.1.1] - 2026-06-17

- Baseline release: the changelog starts being tracked from this version. Earlier history is
  available via [GitHub Releases](https://github.com/RicardoZambon/ZLibraries/releases) and the
  `library-v*` tags.

[Unreleased]: https://github.com/RicardoZambon/ZLibraries/compare/library-v1.3.2...HEAD
[1.3.2]: https://github.com/RicardoZambon/ZLibraries/releases/tag/library-v1.3.2
[1.3.1]: https://github.com/RicardoZambon/ZLibraries/releases/tag/library-v1.3.1
[1.2.0]: https://github.com/RicardoZambon/ZLibraries/releases/tag/library-v1.2.0
[1.1.1]: https://github.com/RicardoZambon/ZLibraries/releases/tag/library-v1.1.1
