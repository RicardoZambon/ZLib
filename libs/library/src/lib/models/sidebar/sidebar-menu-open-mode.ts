/**
 * How a {@link SidebarMenu}'s `url` is opened when the item is clicked.
 *
 * Read the value off a menu through {@link toSidebarMenuOpenMode} rather than comparing the
 * field directly: it crosses HTTP, so it can arrive as a string, as a number, as `null`, or not
 * at all.
 */
export enum SidebarMenuOpenMode {
  /** `url` is an internal Angular route and opens an application tab. The default. */
  Internal = 'internal',

  /** `url` is an absolute http(s) address and opens in a new browser tab. */
  ExternalNewTab = 'externalNewTab',

  /** `url` is an absolute http(s) address and opens embedded in an application tab. */
  ExternalEmbedded = 'externalEmbedded',
}

/** Ordinals matching the mode column stored by the backend, for a numeric payload. */
const ORDINAL_MODES: SidebarMenuOpenMode[] = [
  SidebarMenuOpenMode.Internal,
  SidebarMenuOpenMode.ExternalNewTab,
  SidebarMenuOpenMode.ExternalEmbedded,
];

/**
 * Parses the wire value of `SidebarMenu.openMode`.
 *
 * Deliberately a parser rather than a `?? Internal` fallback, because the field is deserialized
 * straight from each application's menu endpoint and its shape is not guaranteed:
 *
 * - a **number** is read as the backend's enum ordinal, which is what an ASP.NET Core enum
 *   property serializes to unless that backend registers a string converter;
 * - a **string** is matched case-insensitively, so `'externalNewTab'` and `'ExternalNewTab'`
 *   both work;
 * - anything else — an omitted field from a backend that predates this feature, `null`, or a
 *   mode introduced by a newer one — degrades to {@link SidebarMenuOpenMode.Internal}.
 *
 * Degrading to `Internal` keeps an unrecognized mode behaving the way menus behaved before
 * external destinations existed, instead of producing an item that does nothing when clicked.
 */
export function toSidebarMenuOpenMode(value: unknown): SidebarMenuOpenMode {
  if (typeof value === 'number') {
    return ORDINAL_MODES[value] ?? SidebarMenuOpenMode.Internal;
  }

  if (typeof value === 'string') {
    const normalized: string = value.toLowerCase();

    return ORDINAL_MODES.find((mode: SidebarMenuOpenMode) => mode.toLowerCase() === normalized)
      ?? SidebarMenuOpenMode.Internal;
  }

  return SidebarMenuOpenMode.Internal;
}
