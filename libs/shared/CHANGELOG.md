# Changelog

All notable changes to `@zambon-dev/shared` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Upgrading?** Each release lists what changed and, under
> **⚠ Breaking Changes / Migration**, the concrete steps required to move to that version.
> When no migration is needed, that subsection is omitted.

## [Unreleased]

### Added

- **External sidebar destinations are now opened, in either of two modes.** `MainLayoutComponent`
  subscribes to `@zambon-dev/library`’s new `SidebarService.menuExternalUrlSelected`: an item whose
  `openMode` is `ExternalNewTab` opens in a new browser tab (`noopener,noreferrer`), and one marked
  `ExternalEmbedded` opens an application tab that displays the destination in a sandboxed iframe,
  keeping the user inside the application. Internal routes are untouched.

- **`ExternalUrlResolverService`** — substitutes the runtime placeholders in an external menu URL
  and vets the result. The placeholder set is closed and case-sensitive: `{email}`, `{language}`,
  `{userId}`, `{userName}`. Every substituted value is `encodeURIComponent`-ed, so a name containing
  `&` cannot inject a query parameter — which also means one placeholder must occupy one whole path
  segment or query-parameter value. A supported placeholder with no value becomes an empty string
  (with a console warning); an unrecognized `{…}` is left exactly as configured, so a report URL
  that legitimately contains braces, such as `?filter={"a":1}`, is not corrupted.

  No authentication token is ever substituted, and the set is closed by construction rather than
  reflected off the stored user info — `AuthenticationService` persists the whole sign-in response
  under `userInfo`, tokens included, so a reflective implementation would let a URL configured as
  `?t={token}` hand the JWT to a third party.

  `{language}` and `{userName}` work today. `{userId}` and `{email}` resolve to an empty string
  until your `Authentication/SignIn` and `Authentication/RefreshToken` responses include `userID`
  and `email` (see `ICurrentUserInfo` below).

- **`ExternalContentComponent` + `externalContentRoutes`** — the embedded view. Spread the routes
  into `MainLayoutComponent`’s children:

  ```ts
  { path: '', component: MainLayoutComponent, canActivate: [AuthGuard], children: [
    ...externalContentRoutes,
    // your own features
  ] }
  ```

  Register them even if you only plan to use `ExternalNewTab`: an embedded item configured without
  them opens a tab that immediately bounces to the home route.

  The view is an ordinary `TabViewBase` hosted by `DefaultTabViewComponent`, so its actions appear
  in the application ribbon (a **Page** group with **Reload** and **Open in a new browser tab**)
  and look like every other screen’s — the shipped `externalContentRoutes` already wires that host
  up, which is the other reason not to hand-write the routes.

  **Open in a new browser tab** is always available, because many sites refuse to be embedded
  (`X-Frame-Options`, CSP `frame-ancestors`) and a browser gives JavaScript no reliable way to
  detect that — if nothing has loaded after a few seconds the view also shows a hint saying so. An
  `https` application cannot embed an `http` destination at all; the same button is the way out.

  The tab URL is `/external-content/<menu id>` and never carries the destination, so no one can
  hand-craft a link that makes your application frame an arbitrary site. Pressing F5 on an embedded
  tab restores both the frame and the tab title from `sessionStorage`. Opening that URL in a *fresh*
  browser tab can only work if your `SidebarService.getMenuFromUrl()` resolves
  `/external-content/<id>`; otherwise the view says the content is unavailable and asks the user to
  reopen it from the menu.

- **`EXTERNAL_CONTENT_CONFIGS`** — `allowedOrigins` (default `[]`, meaning any `http`/`https`
  origin) and `slowFrameHintDelay` (default 5000 ms). **Populate `allowedOrigins` in production.**
  Embedded and new-tab destinations are already rejected unless they are absolute `http`/`https`
  URLs, which stops a `javascript:` or `data:` URL in your menu table from executing in your users’
  session; an origin allowlist narrows what is left from “any site on the internet” to your known
  report hosts. The iframe is sandboxed with a fixed, non-configurable token list that withholds
  `allow-top-navigation`, so a framed site cannot navigate your application away. Do not point an
  embedded item at your own application’s origin — use an internal route for that.

- **`ICurrentUserInfo.email`, `.userID`, `.username`** (all optional) — the values behind
  `{email}`, `{userId}` and `{userName}`. `username` was already being persisted in the base64
  `userInfo` entry and is now simply typed, so `{userName}` needs no backend change; `email` and
  `userID` must be added to your sign-in and refresh responses.

- **Translations** for the embedded view under `i18n/external-content/`, already included in
  `ZAMBON_SHARED_I18N_RESOURCES`.

### Changed

### Deprecated

### Removed

### Fixed

- **A deep link whose URL the menu API cannot resolve no longer surfaces an unhandled error.**
  `MainLayoutComponent` resolves a deep-linked tab’s title through `SidebarService.getMenuFromUrl()`
  and had no error handler, so a 404 became an unhandled rejection in the console. The title is
  best-effort and the failure is now swallowed — which matters more now that the embedded-content
  route is a URL shape most menu endpoints do not know.

### ⚠ Breaking Changes / Migration

- **Requires `@zambon-dev/library` 1.4.0 or later.** `SidebarMenuOpenMode`,
  `toSidebarMenuOpenMode` and `SidebarService.menuExternalUrlSelected` ship in that release. The
  declared peer range still allows older versions, so upgrade both packages together.
- **To use external menu items, register `externalContentRoutes`** as children of
  `MainLayoutComponent` (snippet above), and make your menu endpoint return `openMode`. The
  resolver accepts it as the camelCase string (`"internal"`, `"externalNewTab"`,
  `"externalEmbedded"`, matched case-insensitively) or as the enum ordinal (`0`, `1`, `2`), so a
  plain ASP.NET Core enum property works with no converter.
- **If your `TranslateLoader` hand-lists prefixes** instead of spreading
  `ZAMBON_SHARED_I18N_RESOURCES`, add `assets/i18n/zambon-dev/shared/external-content/`.
- Nothing else changes: applications with no `openMode` on any menu item behave exactly as before
  and need no action.

## [2.0.0] - 2026-07-30

### Added

- **Storybook: `Shared/App Showcase` story** — a full-height, navigable demo of the complete
  application shell, backed by in-memory mock data. Clicking the sidebar entries (Dashboard,
  General ▸ Customers/Units, Security ▸ Users) opens tabs that render working list-views and
  detail-views through the real hosts (`DefaultTabViewComponent` /
  `DefaultDetailsTabViewComponent`, `TabViewList` / `FormView`, and the `framework-button-*`
  ribbon buttons). It covers:
  - a branded top bar (logo, app name, subtitle, environment badge and a working notifications
    bell) and a versioned sidebar footer;
  - a mocked audit/history view, reachable from the detail views' Views button;
  - `framework-button-filters` (via a `FiltersBase` component per entity) and
    `framework-button-export` on every list: the mock dataset honours `IListParameters.filters`, so
    filtering visibly narrows the grid, and exporting downloads a real CSV of the filtered rows;
  - a **child list of addresses** on the Customers detail view, edited through `lib-multi-editor` —
    `ChildList` and `MultiEditorModal` together, with the accordion gated on `hasEntityID` (a child
    collection needs a persisted parent), the Edit button opening the multi-editor rather than
    entering form edit mode, and add/remove/edit applied as one batch. The Customers grid's City
    column is **derived** from the customer's first address, so editing an address is reflected in
    the parent list and its filter with nothing to keep in sync;
  - mocked request latency, so loading states are observable;
  - full `en`/`pt` translation, so the language selector switches the entire showcase.

  Development-only: it lives entirely in `app-showcase.stories.ts`, which is excluded from the
  package build.

### Fixed

- **Audit history models now match the JSON the audit endpoints actually return.**
  `IServicesHistoryList` and `IOperationsHistoryList` declared an `ID` property, and
  `IOperationsHistoryList` declared `entityId`. Neither key is ever sent. The audit endpoints
  (`POST /{controller}/{entityID}/Audit` and `.../Audit/{serviceHistoryID}`) serialize under
  ASP.NET Core's default camelCase policy, which lowercases only a *leading* run of capitals — so the
  backend's `ID` goes out as `id` and its `EntityID` goes out as `entityID`. Typing a row against
  `.ID` or `.entityId` therefore compiled fine and read `undefined` at run time. See
  **⚠ Breaking Changes / Migration** below.

  This was also a latent trap for anything supplying its own audit rows: the grid resolves row
  identity through `compareProperty`, which is `'id'`, so a row carrying only `ID` could never be
  selected — clicking a service entry left the operations grid empty. Rows shaped like the real
  payload work unchanged; `@shared`'s own runtime behaviour is not affected by this release.

- **The top bar's notifications bell is no longer pushed off-centre by its unread badge.** The badge
  is an absolutely-positioned overlay, so it adds no width — but it is still a DOM sibling after the
  bell icon, which defeated the `.btn i:not(:last-child)` margin guard in the global button styles.
  That left 8px of dead space to the icon's right and widened the button from 38px to 46px, but only
  while an unread count was showing, so it came and went with the count. The margin is now cleared
  for that button specifically; the shared guard, which is correct for icon-plus-label buttons, is
  unchanged.

- **Lint: `shared-` component/directive selector prefix is now accepted.**
  `libs/shared/eslint.config.mjs` still carried the scaffolded `prefix: 'lib'`, so the library's own
  `shared-`-prefixed components (`shared-main-layout`, `shared-login-layout`) failed
  `@angular-eslint/component-selector`. Both selector rules now accept `['lib', 'shared']`.

### ⚠ Breaking Changes / Migration

Two properties on the audit history models were renamed to the keys the backend actually sends. Both
models are exported from the package root, so anything typed against the old names will now fail to
compile. Nothing in `@shared` changes behaviour at run time — the fix is to the declared types.

| Model | Before | After |
|-------|--------|-------|
| `IServicesHistoryList` | `ID: number` | `id: number` |
| `IOperationsHistoryList` | `ID: number` | `id: number` |
| `IOperationsHistoryList` | `entityId?: number` | `entityID?: number` |

To upgrade:

1. Rename `.ID` to `.id` wherever you read or construct an `IServicesHistoryList` or
   `IOperationsHistoryList`. If the compiler now reports the property as missing, that code was
   reading `undefined` before — it never matched the payload.
2. Rename `.entityId` to `.entityID` on `IOperationsHistoryList`. The capitals are deliberate and
   match the backend's `EntityID`; do not "correct" them back.
3. If you supply audit rows yourself — a test double, a Storybook mock, a hand-rolled
   `ServicesHistoryService` / `OperationsHistoryService` — emit `id`, not `ID`. Rows keyed only on
   `ID` were never selectable, so a service row's selection could not reach the operations grid.
4. If you worked around that by overriding `compareProperty` to `'ID'` in a `ServicesHistoryDataset`
   or `OperationsHistoryDataset` subclass, remove the override. The inherited `'id'` is now correct.

## [1.2.0] - 2026-07-28

### Added

- A tokenized app backdrop — `--app-backdrop`, a subtle light-gray gradient — rendered behind the
  whole layout shell so the sidebar's new translucent "glass" surface (from `@library`) reads against
  a colored background.

### Changed

- `MainLayoutComponent` now floats the sidebar in a padded region over the shared `--app-backdrop`
  gradient (the shell background was a flat gray). This gives the `@library` glass sidebar a colored
  surface to read against; the content area shares the same subtle backdrop.

### ⚠ Breaking Changes / Migration

None. The `--app-backdrop` and floating sidebar region are applied automatically by
`MainLayoutComponent`; no consumer action is required.

## [1.1.0] - 2026-07-24

### Added

- New application top bar (`shared-top-bar`), rendered by `MainLayoutComponent`, composing the
  brand (app name, company name, optional logo), an environment badge, notifications, the language
  selector, and the user profile — alongside the existing sidebar-collapse and logout controls.
- `NotificationsService` (root-provided) that streams notifications from a **SignalR hub**. It
  exposes `getNotifications()`, `getUnreadCount()`, `markAsRead()`, `markAllAsRead()`, `start()`,
  `stop()`, and an `isEnabled` flag. When enabled it connects (authenticated with the current JWT)
  to `AppConfig.notificationsUrl` and listens for the server's `ReceiveNotifications` push. The top
  bar drives it — apps do not call it directly.
- The notifications feature is toggleable and configurable via `AppConfig.notificationsEnabled` and
  `AppConfig.notificationsUrl`; when disabled (or no URL is set) the bell is not rendered.
- Notifications show an icon, title, and description, and — when a `callToActionUrl` is present —
  clicking navigates to it (internal routes via the Angular router, external URLs in a new tab).
- Individually reusable top-bar components: `BrandComponent`, `EnvironmentBadgeComponent`,
  `NotificationsComponent`, `UserProfileComponent`, and the composing `TopBarComponent`.
- `top-bar` i18n bundle (`en`/`pt`) registered in `ZAMBON_SHARED_I18N_RESOURCES`.
- New peer dependency `@microsoft/signalr` (^10.0.0), used by `NotificationsService`.
- `LanguageSelectorComponent` gained a `showFlag` input; when `true` the toggle shows the current
  language's flag on a light-gray button instead of the text label (used by the top bar; the login
  page keeps the text label).
- `MainLayoutComponent` projects the application version (`AppConfig.version`) into the sidebar's
  footer slot, shown at the bottom of the navigation when set.

### Changed

- `ICurrentUserInfo` gained optional `pictureUrl` and `position` fields, displayed in the top-bar
  user profile. The avatar falls back to the user's initials when `pictureUrl` is absent, and the
  position line is hidden when `position` is empty.
- **`INotification` redefined** to `{ title, description, icon, callToActionUrl?, isRead }` (was
  `{ id, title, message, read, createdAt }`) to match the SignalR hub contract.
- The top bar no longer renders a sidebar-collapse button — the sidebar owns its own collapse/expand
  toggle. The user profile now uses a light, on-palette surface (neutral chip + brand-colored avatar)
  instead of the previous dark chip.
- On small screens (< 768px) the top bar hides the brand text (app name + company; the logo remains)
  and the entire user profile, for a compact layout.
- `LanguageSelectorComponent` now renders language flags as self-contained inline SVGs (US for `en`,
  Brazil for `pt`) instead of `/flags/*.png` background images, in both the flag toggle and the
  dropdown. The selector no longer depends on app-provided flag assets; apps that supplied custom
  `/flags/*.png` images will no longer see them in the language selector.

### ⚠ Breaking Changes / Migration

- **`INotification` shape changed** (see above). If you referenced the old fields (`id`, `message`,
  `read`, `createdAt`), update to `title`, `description`, `icon`, `callToActionUrl`, `isRead`.
- **Notifications now require `@microsoft/signalr`.** Install it in the consuming app
  (`npm i @microsoft/signalr`) — it is a peer dependency.

To populate the top bar, provide `appName`, `companyName`, `environment`, and optionally `logoUrl`
via `AppConfig` options (requires `@zambon-dev/framework` with the new `AppConfig` options). The
environment badge maps `DEV`/`QA`/`STG` to colors, renders any other non-empty value with a neutral
style, and is hidden for `PROD` or when no environment is set.

To enable notifications, set `notificationsEnabled: true` and `notificationsUrl` (the SignalR hub
URL) in `AppConfig`, and implement a hub that pushes the notification list to clients via a
`ReceiveNotifications` invocation (and optionally handles a `MarkAllAsRead` invoke). See
`docs/guides/top-bar-configuration.md` for the full consuming-app guide. The user's
`pictureUrl`/`position` are supplied by the auth response when available.

## [1.0.2] - 2026-05-02

- Baseline release: the changelog starts being tracked from this version. Earlier history is
  available via [GitHub Releases](https://github.com/RicardoZambon/ZLibraries/releases) and the
  `shared-v*` tags.

[Unreleased]: https://github.com/RicardoZambon/ZLibraries/compare/shared-v2.0.0...HEAD
[2.0.0]: https://github.com/RicardoZambon/ZLibraries/releases/tag/shared-v2.0.0
[1.2.0]: https://github.com/RicardoZambon/ZLibraries/releases/tag/shared-v1.2.0
[1.1.0]: https://github.com/RicardoZambon/ZLibraries/releases/tag/shared-v1.1.0
[1.0.2]: https://github.com/RicardoZambon/ZLibraries/releases/tag/shared-v1.0.2
