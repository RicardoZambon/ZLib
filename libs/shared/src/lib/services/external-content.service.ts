import { inject, Injectable } from '@angular/core';
import { SidebarMenu, SidebarService } from '@zambon-dev/library';
import { catchError, map, Observable, of, take } from 'rxjs';
import { EXTERNAL_CONTENT_ROUTE_PATH, IExternalContentEntry } from '../models';

/**
 * Remembers which external destination sits behind an embedded tab's `/external-content/:menuID`
 * route, and resolves it back when the view is created.
 *
 * The destination never travels in the route, so the id has to be resolved to a URL somehow. That
 * happens in three steps, cheapest first:
 *
 * 1. the in-memory registry — the item was clicked in this browsing session;
 * 2. `sessionStorage` — the user pressed F5 on the embedded tab;
 * 3. the application's `SidebarService.getMenuFromUrl()` — a cold deep link.
 *
 * Step 3 reuses the abstract hook every application already implements, so nothing new is required
 * of a consumer: an application whose menu endpoint cannot resolve `/external-content/:id` simply
 * gets the unavailable state on a cold deep link, which is the documented behaviour.
 */
@Injectable({
  providedIn: 'root'
})
export class ExternalContentService {
  //#region Variables
  private readonly maxEntries: number = 20;
  private readonly storageKey: string = 'zambon.externalContent';

  private registry: Map<number, IExternalContentEntry> = new Map<number, IExternalContentEntry>();
  private sidebarService: SidebarService = inject(SidebarService);
  //#endregion

  //#region Properties
  //#endregion

  //#region Constructor and Angular life cycle methods
  //#endregion

  //#region Public methods
  /** Resolves the destination behind an embedded tab, or `undefined` when it cannot be recovered. */
  public find(menuID: number): Observable<IExternalContentEntry | undefined> {
    const known: IExternalContentEntry | undefined = this.registry.get(menuID) ?? this.readFromStorage(menuID);

    if (!!known) {
      return of(known);
    }

    return this.sidebarService.getMenuFromUrl(`/${EXTERNAL_CONTENT_ROUTE_PATH}/${menuID}`)
      .pipe(
        take(1),
        map((menu: SidebarMenu) => !!menu && !!menu.url ? this.toEntry(menu) : undefined),
        // A menu endpoint that does not know this route shape answers 404, which is an expected
        // outcome here rather than a failure: the view falls back to its unavailable state.
        catchError(() => of(undefined)),
      );
  }

  /** Remembers a menu so its embedded tab survives a page refresh. */
  public register(menu: SidebarMenu): void {
    const entry: IExternalContentEntry = this.toEntry(menu);

    this.registry.set(entry.id, entry);
    this.writeToStorage(entry);
  }
  //#endregion

  //#region Private methods
  private readAllFromStorage(): IExternalContentEntry[] {
    try {
      const raw: string | null = window.sessionStorage.getItem(this.storageKey);

      if (!raw) {
        return [];
      }

      const parsed: unknown = JSON.parse(raw);

      return Array.isArray(parsed) ? <IExternalContentEntry[]>parsed : [];
    } catch {
      // A poisoned or unavailable storage entry must never take the application down; the view
      // degrades to asking the user to reopen the item from the menu.
      return [];
    }
  }

  private readFromStorage(menuID: number): IExternalContentEntry | undefined {
    const entry: IExternalContentEntry | undefined = this.readAllFromStorage()
      .find((candidate: IExternalContentEntry) => candidate?.id === menuID);

    if (!!entry && !!entry.url) {
      this.registry.set(entry.id, entry);
      return entry;
    }

    return undefined;
  }

  private toEntry(menu: SidebarMenu): IExternalContentEntry {
    return {
      id: menu.id,
      label: menu.label,
      url: menu.url ?? '',
    };
  }

  private writeToStorage(entry: IExternalContentEntry): void {
    try {
      const entries: IExternalContentEntry[] = [
        entry,
        ...this.readAllFromStorage().filter((candidate: IExternalContentEntry) => candidate?.id !== entry.id),
      ].slice(0, this.maxEntries);

      window.sessionStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch {
      // Storage can be unavailable (private mode, blocked site data). Losing refresh support is
      // acceptable; failing the click is not.
    }
  }
  //#endregion
}
