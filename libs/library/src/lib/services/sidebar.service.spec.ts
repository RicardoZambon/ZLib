import { Observable, of } from 'rxjs';
import { ISidebarProfile, SidebarMenu, SidebarMenuOpenMode } from '../models';
import { SidebarService } from './sidebar.service';

class MockSidebarService extends SidebarService {
  public rootMenus: SidebarMenu[] = [];

  public getMenuFromUrl(url: string): Observable<SidebarMenu> {
    return of(new SidebarMenu({ url }));
  }

  public getUserProfile(): ISidebarProfile | undefined {
    return undefined;
  }

  protected loadMenus(parentMenu: SidebarMenu | null): Observable<SidebarMenu[]> {
    return of(parentMenu === null ? this.rootMenus : []);
  }
}

describe(SidebarService.name, () => {
  let service: MockSidebarService;
  let external: SidebarMenu[];
  let internal: SidebarMenu[];

  /** Seeds the root menus and returns the instances the service actually holds (it re-wraps them). */
  function loadRoot(menus: SidebarMenu[]): SidebarMenu[] {
    service.rootMenus = menus;

    let loaded: SidebarMenu[] = [];
    service.loadRoot().subscribe((result: SidebarMenu[]) => loaded = result);

    return loaded;
  }

  /** Builds a menu whose `openMode` is whatever the wire delivered, including a non-`SidebarMenuOpenMode`. */
  function menu(options: Partial<SidebarMenu>, openMode?: unknown): SidebarMenu {
    return new SidebarMenu({ ...options, openMode: <SidebarMenuOpenMode | undefined>openMode });
  }

  beforeEach(() => {
    service = new MockSidebarService();

    external = [];
    internal = [];
    service.menuExternalUrlSelected.subscribe((item: SidebarMenu) => external.push(item));
    service.menuUrlSelected.subscribe((item: SidebarMenu) => internal.push(item));
  });

  describe('internal items', () => {
    it('announces an internal route on menuUrlSelected and selects it', () => {
      const [item]: SidebarMenu[] = loadRoot([menu({ id: 1, url: '/dashboard' })]);

      service.select(item);

      expect(internal).toEqual([item]);
      expect(external).toEqual([]);
      expect(item.isSelected).toBe(true);
    });

    it('navigates again when an already selected item is clicked, instead of toggling off', () => {
      const [item]: SidebarMenu[] = loadRoot([menu({ id: 1, url: '/dashboard' })]);

      service.select(item);
      service.select(item);

      expect(internal).toEqual([item, item]);
      expect(item.isSelected).toBe(true);
    });

    it('only toggles selection for an item without a URL', () => {
      const [group]: SidebarMenu[] = loadRoot([menu({ id: 1 })]);

      service.select(group);

      expect(group.isSelected).toBe(true);
      expect(internal).toEqual([]);
      expect(external).toEqual([]);

      service.select(group);

      expect(group.isSelected).toBe(false);
      expect(internal).toEqual([]);
      expect(external).toEqual([]);
    });
  });

  describe('openMode parsing', () => {
    it('treats an absent openMode as internal, so a backend predating the field is unaffected', () => {
      const [item]: SidebarMenu[] = loadRoot([menu({ id: 1, url: '/dashboard' })]);

      service.select(item);

      expect(internal).toEqual([item]);
      expect(external).toEqual([]);
    });

    it('reads a numeric openMode as the backend enum ordinal', () => {
      const [item]: SidebarMenu[] = loadRoot([menu({ id: 1, url: 'https://reports/x' }, 1)]);

      service.select(item);

      expect(external).toEqual([item]);
      expect(internal).toEqual([]);
    });

    it('matches a string openMode case-insensitively', () => {
      const [item]: SidebarMenu[] = loadRoot([menu({ id: 1, url: 'https://reports/x' }, 'ExternalNewTab')]);

      service.select(item);

      expect(external).toEqual([item]);
      expect(internal).toEqual([]);
    });

    it('degrades an unrecognized openMode to internal rather than to an item that does nothing', () => {
      const [item]: SidebarMenu[] = loadRoot([menu({ id: 1, url: '/dashboard' }, 'somethingNewer')]);

      service.select(item);

      expect(internal).toEqual([item]);
      expect(external).toEqual([]);
    });
  });

  describe('external items', () => {
    it('announces a new browser tab without taking the selection', () => {
      const [item]: SidebarMenu[] = loadRoot([
        menu({ id: 1, url: 'https://reports/x' }, SidebarMenuOpenMode.ExternalNewTab),
      ]);

      service.select(item);

      expect(external).toEqual([item]);
      expect(internal).toEqual([]);
      expect(item.isSelected).toBe(false);
    });

    it('leaves the view the user is still looking at selected when opening a new browser tab', () => {
      const [route, report]: SidebarMenu[] = loadRoot([
        menu({ id: 1, url: '/dashboard' }),
        menu({ id: 2, url: 'https://reports/x' }, SidebarMenuOpenMode.ExternalNewTab),
      ]);
      service.select(route);

      const selectionChanges: SidebarMenu[] = [];
      service.selectionChanged.subscribe((item: SidebarMenu) => selectionChanges.push(item));

      service.select(report);

      expect(route.isSelected).toBe(true);
      expect(report.isSelected).toBe(false);
      expect(selectionChanges).toEqual([]);
    });

    it('keeps expanding a parent that also carries an external URL', () => {
      const [parent]: SidebarMenu[] = loadRoot([
        menu({ id: 1, childCount: 2, url: 'https://reports/x' }, SidebarMenuOpenMode.ExternalNewTab),
      ]);

      service.select(parent);

      expect(parent.isSelected).toBe(true);
      expect(external).toEqual([parent]);
    });

    it('selects an embedded item like an internal one, because it becomes a real application tab', () => {
      const [route, report]: SidebarMenu[] = loadRoot([
        menu({ id: 1, url: '/dashboard' }),
        menu({ id: 2, url: 'https://reports/x' }, SidebarMenuOpenMode.ExternalEmbedded),
      ]);
      service.select(route);

      service.select(report);

      expect(external).toEqual([report]);
      expect(internal).toEqual([route]);
      expect(report.isSelected).toBe(true);
      expect(route.isSelected).toBe(false);
    });

    it('announces nothing for an external item with no URL', () => {
      const [item]: SidebarMenu[] = loadRoot([menu({ id: 1 }, SidebarMenuOpenMode.ExternalNewTab)]);

      service.select(item);

      expect(external).toEqual([]);
      expect(internal).toEqual([]);
    });
  });
});
