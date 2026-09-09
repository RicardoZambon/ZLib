
import { InjectionToken } from '@angular/core';

export const SIDEBAR_CONFIGS: InjectionToken<SidebarConfigs> = new InjectionToken<SidebarConfigs>('', {
  providedIn: 'root',
  factory: () => new SidebarConfigs(),
});

export class SidebarConfigs {
  public errorText: string = 'Error';
  /** Tooltip for items that open in a new browser tab. Rendered as-is, like {@link errorText}. */
  public externalLinkText: string = 'Opens in a new browser tab';
  public loadingText: string = 'Loading';
  /**
   * Derive region headers from the menu tree instead of from {@link SidebarMenu.region}.
   *
   * With this on, a top-level menu that has children and no URL stops being a collapsible node
   * and becomes an area header, with its children rendered flat beneath it as top-level items --
   * icons included. The area is then a real menu row, so it carries its own translated label and
   * its own order, and no `region` label has to be repeated across every item that belongs to it.
   *
   * Off by default: without it a top-level parent stays the collapsible group it has always been.
   */
  public shouldDeriveAreasFromRootMenus: boolean = false;
  public logoCollapsedPath?: string;
  public logoExpandedPath?: string;

  constructor(options: Partial<SidebarConfigs> = {}) {
    Object.assign(this, options);
  }
}