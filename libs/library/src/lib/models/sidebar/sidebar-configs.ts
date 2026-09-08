
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
  public logoCollapsedPath?: string;
  public logoExpandedPath?: string;

  constructor(options: Partial<SidebarConfigs> = {}) {
    Object.assign(this, options);
  }
}