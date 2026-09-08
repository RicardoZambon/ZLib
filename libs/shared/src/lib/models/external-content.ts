import { InjectionToken } from '@angular/core';

/** First segment of the route that hosts embedded external content. */
export const EXTERNAL_CONTENT_ROUTE_PATH: string = 'external-content';

/**
 * Flat projection of an external menu item, used to restore an embedded tab.
 *
 * Deliberately not a `SidebarMenu`: that class carries a `parent` back-reference, so it is a
 * circular structure that `JSON.stringify` refuses, and holding one would pin the whole menu tree.
 */
export interface IExternalContentEntry {
  id: number;
  label: string;
  url: string;
}

export class ExternalContentConfigs {
  /**
   * Origins an embedded menu item may point at, for example `['https://reports.example.com']`.
   * Empty — the default — allows any `http`/`https` origin.
   *
   * Populating it is the single highest-value control here after the scheme check: it narrows a
   * compromised menu row from "frame anything on the internet" to "frame one of our report hosts".
   */
  public allowedOrigins: string[] = [];

  /** Milliseconds to wait for the frame's first `load` before hinting that framing may be refused. */
  public slowFrameHintDelay: number = 5000;

  constructor(options: Partial<ExternalContentConfigs> = {}) {
    Object.assign(this, options);
  }
}

export const EXTERNAL_CONTENT_CONFIGS: InjectionToken<ExternalContentConfigs> = new InjectionToken<ExternalContentConfigs>('Embedded external content configuration', {
  providedIn: 'root',
  factory: () => new ExternalContentConfigs(),
});
