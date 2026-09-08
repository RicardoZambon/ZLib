import { TestBed } from '@angular/core/testing';
import { SidebarMenu, SidebarService } from '@zambon-dev/library';
import { Observable, of, throwError } from 'rxjs';
import { IExternalContentEntry } from '../models';
import { ExternalContentService } from './external-content.service';

describe(ExternalContentService.name, () => {
  const storageKey: string = 'zambon.externalContent';

  let getMenuFromUrl: jest.Mock<Observable<SidebarMenu>, [string]>;
  let service: ExternalContentService;

  /** Builds a fresh service, as a page reload would, over whatever is currently in storage. */
  function createService(): ExternalContentService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: SidebarService, useValue: { getMenuFromUrl } }],
    });

    return TestBed.inject(ExternalContentService);
  }

  function found(menuID: number): IExternalContentEntry | undefined {
    let entry: IExternalContentEntry | undefined;
    service.find(menuID).subscribe((result: IExternalContentEntry | undefined) => entry = result);

    return entry;
  }

  function menu(options: Partial<SidebarMenu>): SidebarMenu {
    return new SidebarMenu(options);
  }

  beforeEach(() => {
    window.sessionStorage.clear();

    getMenuFromUrl = jest.fn((url: string) => of(menu({ id: 7, label: 'Resolved', url })));
    service = createService();
  });

  it('resolves a registered item from memory without asking the menu endpoint', () => {
    service.register(menu({ id: 1, label: 'Monthly report', url: 'https://reports/monthly' }));

    expect(found(1)).toEqual({ id: 1, label: 'Monthly report', url: 'https://reports/monthly' });
    expect(getMenuFromUrl).not.toHaveBeenCalled();
  });

  it('resolves from session storage after a page refresh, when the registry is gone', () => {
    service.register(menu({ id: 1, label: 'Monthly report', url: 'https://reports/monthly' }));

    service = createService();

    expect(found(1)).toEqual({ id: 1, label: 'Monthly report', url: 'https://reports/monthly' });
    expect(getMenuFromUrl).not.toHaveBeenCalled();
  });

  it('falls back to the menu endpoint for a cold deep link', () => {
    expect(found(7)).toEqual({ id: 7, label: 'Resolved', url: '/external-content/7' });
    expect(getMenuFromUrl).toHaveBeenCalledWith('/external-content/7');
  });

  it('reports the content unavailable when the menu endpoint does not know the route', () => {
    getMenuFromUrl = jest.fn((_url: string) => throwError(() => new Error('404')));
    service = createService();

    expect(found(7)).toBeUndefined();
  });

  it('reports the content unavailable when the menu endpoint answers without a URL', () => {
    getMenuFromUrl = jest.fn((_url: string) => of(menu({ id: 7, label: 'Group' })));
    service = createService();

    expect(found(7)).toBeUndefined();
  });

  it('ignores a malformed storage payload instead of failing the view', () => {
    window.sessionStorage.setItem(storageKey, '{not json');
    service = createService();

    expect(found(1)).toEqual({ id: 7, label: 'Resolved', url: '/external-content/1' });
  });

  it('registers a menu that carries a parent back-reference, which JSON.stringify would refuse', () => {
    const parent: SidebarMenu = menu({ id: 10, label: 'Reports', childCount: 1 });
    const child: SidebarMenu = menu({ id: 11, label: 'Monthly', url: 'https://reports/monthly' });
    child.parent = parent;
    parent.children = [child];

    expect(() => service.register(child)).not.toThrow();
    expect(found(11)).toEqual({ id: 11, label: 'Monthly', url: 'https://reports/monthly' });
  });

  it('caps how many entries it keeps, so the storage key cannot grow without bound', () => {
    for (let id: number = 1; id <= 25; id++) {
      service.register(menu({ id, label: `Report ${id}`, url: `https://reports/${id}` }));
    }

    const stored: IExternalContentEntry[] = JSON.parse(window.sessionStorage.getItem(storageKey) ?? '[]');

    expect(stored.length).toBe(20);
    expect(stored[0].id).toBe(25);
  });
});
