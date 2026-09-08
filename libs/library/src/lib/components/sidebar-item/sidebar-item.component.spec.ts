import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { ISidebarProfile, SidebarMenu, SidebarMenuOpenMode } from '../../models';
import { SidebarService } from '../../services';
import { SidebarItemComponent } from './sidebar-item.component';

class MockSidebarService extends SidebarService {
  public override isCollapsed: boolean = false;
  public override isActive: boolean = false;
  public getMenuFromUrl(url: string): Observable<SidebarMenu> {
    return of(new SidebarMenu({ url }));
  }
  public getUserProfile(): ISidebarProfile | undefined {
    return undefined;
  }
  protected loadMenus(_parent: SidebarMenu | null): Observable<SidebarMenu[]> {
    return of([]);
  }
}

function leafMenu(): SidebarMenu {
  return new SidebarMenu({ id: 1, label: 'Dashboard', icon: 'fa-chart-line', url: '/dashboard' });
}

function externalLeafMenu(openMode: SidebarMenuOpenMode): SidebarMenu {
  return new SidebarMenu({ id: 2, label: 'Monthly report', url: 'https://reports/monthly', openMode });
}

describe(SidebarItemComponent.name, () => {
  let service: MockSidebarService;

  function createComponent(menu: SidebarMenu): ComponentFixture<SidebarItemComponent> {
    const fixture: ComponentFixture<SidebarItemComponent> = TestBed.createComponent(SidebarItemComponent);
    fixture.componentInstance.menu = menu;
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SidebarItemComponent, TranslateModule.forRoot()],
      providers: [{ provide: SidebarService, useClass: MockSidebarService }],
    }).compileComponents();

    service = TestBed.inject(SidebarService) as MockSidebarService;
  });

  it('should create', () => {
    expect(createComponent(leafMenu()).componentInstance).toBeTruthy();
  });

  it('marks an item that opens in a new browser tab, so the label carries an outbound affordance', () => {
    const fixture = createComponent(externalLeafMenu(SidebarMenuOpenMode.ExternalNewTab));

    const row: HTMLElement = fixture.nativeElement.querySelector('li > div');
    expect(row.classList.contains('external')).toBe(true);
    expect(fixture.nativeElement.querySelector('a').getAttribute('title')).toBeTruthy();
  });

  it('does not mark an embedded item, which stays inside the application', () => {
    const fixture = createComponent(externalLeafMenu(SidebarMenuOpenMode.ExternalEmbedded));

    const row: HTMLElement = fixture.nativeElement.querySelector('li > div');
    expect(row.classList.contains('external')).toBe(false);
    expect(fixture.nativeElement.querySelector('a').getAttribute('title')).toBeNull();
  });

  it('does not mark an internal item', () => {
    const fixture = createComponent(leafMenu());

    const row: HTMLElement = fixture.nativeElement.querySelector('li > div');
    expect(row.classList.contains('external')).toBe(false);
  });

  it('delegates a click to the service exactly once, so an external item cannot open twice', () => {
    const fixture = createComponent(externalLeafMenu(SidebarMenuOpenMode.ExternalNewTab));
    const select: jest.SpyInstance = jest.spyOn(service, 'select').mockImplementation(() => undefined);

    fixture.nativeElement.querySelector('li > div').click();

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('reflects selection to the state class for the pill highlight', () => {
    const fixture = createComponent(leafMenu());
    fixture.componentInstance.menu.isSelected = true;
    service.selectionChanged.emit(fixture.componentInstance.menu);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.classList.contains('selected')).toBe(true);
    expect(host.querySelector('li > div')).toBeTruthy();
  });
});
