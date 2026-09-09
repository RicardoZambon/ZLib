import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { ISidebarProfile, SIDEBAR_CONFIGS, SidebarConfigs, SidebarMenu, SidebarRegion } from '../../models';
import { SidebarService } from '../../services';
import { SidebarComponent } from './sidebar.component';

class MockSidebarService extends SidebarService {
  public getMenuFromUrl(url: string): Observable<SidebarMenu> {
    return of(new SidebarMenu({ url }));
  }
  public getUserProfile(): ISidebarProfile | undefined {
    return undefined;
  }
  protected loadMenus(_parent: SidebarMenu | null): Observable<SidebarMenu[]> {
    return of([new SidebarMenu({ id: 1, label: 'Dashboard', icon: 'fa-chart-line', url: '/dashboard' })]);
  }
}

describe(SidebarComponent.name, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SidebarComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SidebarService, useClass: MockSidebarService },
        { provide: SIDEBAR_CONFIGS, useValue: new SidebarConfigs() },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture: ComponentFixture<SidebarComponent> = TestBed.createComponent(SidebarComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe(`${SidebarComponent.name} region grouping`, () => {
  /** Root menus the service hands back, and the children each parent resolves to. */
  let childrenByParentID: Map<number, SidebarMenu[]>;
  let loadedParentIDs: number[];
  let roots: SidebarMenu[];

  class GroupingSidebarService extends SidebarService {
    public getMenuFromUrl(url: string): Observable<SidebarMenu> {
      return of(new SidebarMenu({ url }));
    }
    public getUserProfile(): ISidebarProfile | undefined {
      return undefined;
    }
    protected loadMenus(parent: SidebarMenu | null): Observable<SidebarMenu[]> {
      if (parent === null) {
        return of(roots);
      }

      loadedParentIDs.push(parent.id);

      return of(childrenByParentID.get(parent.id) ?? []);
    }
  }

  /** Reads the grouped regions the template renders. */
  function render(shouldDeriveAreasFromRootMenus: boolean): SidebarRegion[] {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SidebarComponent, TranslateModule.forRoot()],
      providers: [
        { provide: SidebarService, useClass: GroupingSidebarService },
        { provide: SIDEBAR_CONFIGS, useValue: new SidebarConfigs({ shouldDeriveAreasFromRootMenus }) },
      ],
    });

    const fixture: ComponentFixture<SidebarComponent> = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    return <SidebarRegion[]>(<Record<string, unknown>><unknown>fixture.componentInstance)['regions'];
  }

  function menu(options: Partial<SidebarMenu>): SidebarMenu {
    return new SidebarMenu(options);
  }

  beforeEach(() => {
    childrenByParentID = new Map<number, SidebarMenu[]>();
    loadedParentIDs = [];
    roots = [];
  });

  describe('by region label (the default)', () => {
    it('groups top-level items under their region, in first-appearance order', () => {
      roots = [
        menu({ id: 1, label: 'Dashboard', url: '/dashboard', region: 'Region-Main' }),
        menu({ id: 2, label: 'Users', url: '/users', region: 'Region-Admin' }),
        menu({ id: 3, label: 'Customers', url: '/customers', region: 'Region-Main' }),
      ];

      const regions: SidebarRegion[] = render(false);

      expect(regions.map((region: SidebarRegion) => region.name)).toEqual(['Region-Main', 'Region-Admin']);
      expect(regions[0].items.map((item: SidebarMenu) => item.id)).toEqual([1, 3]);
      expect(regions[1].items.map((item: SidebarMenu) => item.id)).toEqual([2]);
    });

    it('leaves a parent collapsible rather than treating it as an area', () => {
      roots = [menu({ id: 1, label: 'Reports', childCount: 2 })];

      const regions: SidebarRegion[] = render(false);

      expect(regions.length).toBe(1);
      expect(regions[0].name).toBeUndefined();
      expect(regions[0].items.map((item: SidebarMenu) => item.id)).toEqual([1]);
      expect(loadedParentIDs).toEqual([]);
    });
  });

  describe('by root menu (areas derived from the tree)', () => {
    it('turns a childed top-level menu with no URL into a header lending its children', () => {
      roots = [menu({ id: 1, label: 'Region-Main', childCount: 2 })];
      childrenByParentID.set(1, [
        menu({ id: 11, label: 'Dashboard', url: '/dashboard' }),
        menu({ id: 12, label: 'Customers', url: '/customers' }),
      ]);

      const regions: SidebarRegion[] = render(true);

      expect(regions.length).toBe(1);
      expect(regions[0].name).toBe('Region-Main');
      expect(regions[0].items.map((item: SidebarMenu) => item.id)).toEqual([11, 12]);
    });

    it('loads those children up front, since nothing will click the parent open', () => {
      roots = [menu({ id: 1, label: 'Region-Main', childCount: 1 })];
      childrenByParentID.set(1, [menu({ id: 11, label: 'Dashboard', url: '/dashboard' })]);

      render(true);

      expect(loadedParentIDs).toEqual([1]);
    });

    it('keeps a top-level menu that has its own URL as an item, not an area', () => {
      roots = [
        menu({ id: 1, label: 'Region-Main', childCount: 1 }),
        menu({ id: 2, label: 'Dashboard', url: '/dashboard' }),
      ];
      childrenByParentID.set(1, [menu({ id: 11, label: 'Customers', url: '/customers' })]);

      const regions: SidebarRegion[] = render(true);

      expect(regions.map((region: SidebarRegion) => region.name)).toEqual(['Region-Main', undefined]);
      expect(regions[1].items.map((item: SidebarMenu) => item.id)).toEqual([2]);
    });

    it('keeps a parent that also carries a URL collapsible rather than making it an area', () => {
      roots = [menu({ id: 1, label: 'Reports', childCount: 1, url: '/reports' })];
      childrenByParentID.set(1, [menu({ id: 11, label: 'Monthly', url: '/reports/monthly' })]);

      const regions: SidebarRegion[] = render(true);

      expect(regions[0].name).toBeUndefined();
      expect(regions[0].items.map((item: SidebarMenu) => item.id)).toEqual([1]);
      expect(loadedParentIDs).toEqual([]);
    });

    it('renders a menu with no areas at all, which forkJoin would otherwise stall on', () => {
      roots = [menu({ id: 1, label: 'Dashboard', url: '/dashboard' })];

      const regions: SidebarRegion[] = render(true);

      expect(regions.length).toBe(1);
      expect(regions[0].items.map((item: SidebarMenu) => item.id)).toEqual([1]);
    });

    it('preserves the original order when areas and plain items are interleaved', () => {
      roots = [
        menu({ id: 1, label: 'Dashboard', url: '/dashboard' }),
        menu({ id: 2, label: 'Region-Admin', childCount: 1 }),
      ];
      childrenByParentID.set(2, [menu({ id: 21, label: 'Users', url: '/users' })]);

      const regions: SidebarRegion[] = render(true);

      expect(regions.map((region: SidebarRegion) => region.name)).toEqual([undefined, 'Region-Admin']);
    });
  });
});
