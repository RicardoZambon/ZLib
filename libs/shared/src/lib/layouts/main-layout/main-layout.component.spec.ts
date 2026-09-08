import { EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ITab } from '@zambon-dev/framework';
import { SidebarMenu, SidebarMenuOpenMode } from '@zambon-dev/library';
import { Observable, of, Subject, throwError } from 'rxjs';
import { MainLayoutComponent } from './main-layout.component';

describe(MainLayoutComponent.name, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ MainLayoutComponent ]
    })
    .compileComponents();
  });

  it('should create', () => {
    const fixture: ComponentFixture<MainLayoutComponent> = TestBed.createComponent(MainLayoutComponent);
    const component: MainLayoutComponent = fixture.componentInstance;

    expect(component).toBeTruthy();
  });
});

describe(`${MainLayoutComponent.name} sidebar menu handling`, () => {
  let component: MainLayoutComponent;
  let getMenuFromUrl: jest.Mock<Observable<SidebarMenu>, [string]>;
  let menuExternalUrlSelected: EventEmitter<SidebarMenu>;
  let menuUrlSelected: EventEmitter<SidebarMenu>;
  let open: jest.SpyInstance;
  let openTab: jest.Mock;
  let register: jest.Mock;
  let routerUrl: string;
  let updateTabTitle: jest.Mock;

  function build(): void {
    component = Object.create(MainLayoutComponent.prototype);

    Object.assign(<Record<string, unknown>><unknown>component, {
      destroy$: new Subject<boolean>(),
      externalContentService: { register },
      externalUrlResolverService: {
        isAllowed: (url: string) => url.startsWith('http://') || url.startsWith('https://'),
        resolve: (url: string) => url.replace('{userId}', '42'),
      },
      router: { url: routerUrl },
      sidebarService: { getMenuFromUrl, menuExternalUrlSelected, menuUrlSelected },
      tabService: { isUrlOpen: () => false, openTab, updateTabTitle },
    });

    component.ngOnInit();
  }

  function menu(options: Partial<SidebarMenu>, openMode?: SidebarMenuOpenMode): SidebarMenu {
    return new SidebarMenu({ ...options, openMode });
  }

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    open = jest.spyOn(window, 'open').mockImplementation(() => null);

    getMenuFromUrl = jest.fn((url: string) => of(new SidebarMenu({ url, label: 'Deep linked' })));
    menuExternalUrlSelected = new EventEmitter<SidebarMenu>();
    menuUrlSelected = new EventEmitter<SidebarMenu>();
    openTab = jest.fn();
    register = jest.fn();
    routerUrl = '/';
    updateTabTitle = jest.fn();

    build();
  });

  afterEach(() => jest.restoreAllMocks());

  it('opens an internal route as an application tab', () => {
    menuUrlSelected.emit(menu({ id: 1, label: 'Dashboard', url: '/dashboard' }));

    expect(openTab).toHaveBeenCalledTimes(1);
    expect((<ITab>openTab.mock.calls[0][0]).url).toBe('/dashboard');
    expect(open).not.toHaveBeenCalled();
  });

  it('opens a new browser tab with the resolved URL and no access back to this window', () => {
    menuExternalUrlSelected.emit(
      menu({ id: 2, label: 'Report', url: 'https://reports/r?u={userId}' }, SidebarMenuOpenMode.ExternalNewTab));

    expect(open).toHaveBeenCalledWith('https://reports/r?u=42', '_blank', 'noopener,noreferrer');
    expect(openTab).not.toHaveBeenCalled();
  });

  it('refuses to open a scheme that would execute instead of navigate', () => {
    menuExternalUrlSelected.emit(
      menu({ id: 3, label: 'Bad', url: 'javascript:alert(1)' }, SidebarMenuOpenMode.ExternalNewTab));

    expect(open).not.toHaveBeenCalled();
    expect(openTab).not.toHaveBeenCalled();
  });

  it('opens an embedded item as an application tab keyed by menu id, never by the destination', () => {
    const item: SidebarMenu = menu(
      { id: 4, label: 'Embedded report', url: 'https://reports/r' }, SidebarMenuOpenMode.ExternalEmbedded);

    menuExternalUrlSelected.emit(item);

    expect(register).toHaveBeenCalledWith(item);
    expect(openTab).toHaveBeenCalledTimes(1);

    const tab: ITab = <ITab>openTab.mock.calls[0][0];
    expect(tab.url).toBe('/external-content/4');
    expect(tab.title).toBe('Embedded report');
    expect(open).not.toHaveBeenCalled();
  });

  it('does nothing for an external item with no URL', () => {
    menuExternalUrlSelected.emit(menu({ id: 5, label: 'Group' }, SidebarMenuOpenMode.ExternalNewTab));

    expect(open).not.toHaveBeenCalled();
    expect(openTab).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it('resolves a deep-linked tab title from the menu endpoint', () => {
    routerUrl = '/dashboard';
    build();

    expect(updateTabTitle).toHaveBeenCalledWith('/dashboard', 'Deep linked');
  });

  it('swallows a menu endpoint that cannot resolve the deep-linked URL', () => {
    getMenuFromUrl = jest.fn((_url: string) => throwError(() => new Error('404')));
    routerUrl = '/external-content/9';

    expect(() => build()).not.toThrow();
    expect(updateTabTitle).not.toHaveBeenCalled();
  });
});
