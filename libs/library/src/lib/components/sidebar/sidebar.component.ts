import { CommonModule, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, Component, HostListener, inject, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { merge, take, takeUntil } from 'rxjs';
import { SIDEBAR_CONFIGS, SidebarConfigs, SidebarMenu, SidebarRegion } from '../../models';
import { SidebarService } from '../../services';
import { BaseComponent } from '../base.component';
import { SidebarItemComponent } from '../sidebar-item/sidebar-item.component';

@Component({
  selector: 'lib-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [
    CommonModule,
    NgFor,
    NgIf,
    SidebarItemComponent,
    TranslatePipe,
  ],
  host: {
    '[class.active]': 'isActive',
    '[class.expanded]': '!isCollapsed',
  }
})
export class SidebarComponent extends BaseComponent implements AfterViewInit, OnInit {
  //#region ViewChilds, Inputs, Outputs
  //#endregion

  //#region Host listeners
  @HostListener('body:mousedown', ['$event'])
  private onBodyMouseDown(event: MouseEvent): void {
    if (this.isActive && event.target) {
      const target: HTMLElement = <HTMLElement>event.target;
      this.wasClickedOutside = (event.button === 0 && !target.closest('lib-sidebar')) ?? false;
    }
  }

  @HostListener('body:mouseup', ['$event'])
  private onBodyMouseUp(_event: MouseEvent): void {
    if (this.wasClickedOutside) {
      this.wasClickedOutside = false;
      this.deactivate();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  private onDocumentKeyDown(event: KeyboardEvent): void {
    event = event || window.event;
    
    let isEscapeKey: boolean = false;
    if ('key' in event) {
      isEscapeKey = (event.key === 'Escape' || event.key === 'Esc')
    } else {
      isEscapeKey = ((<KeyboardEvent>event).keyCode === 27)
    }

    if (isEscapeKey) {
      this.deactivate();
    }
  }

  @HostListener('window:resize', ['$event'])
  private onResize(_event: Event): void {
    this.updateShouldActivate();
  }
  //#endregion

  //#region Variables
  private sidebarConfigs: SidebarConfigs = inject(SIDEBAR_CONFIGS);

  protected configErrorText: string = this.sidebarConfigs.errorText;
  protected configLoadingText: string = this.sidebarConfigs.loadingText;
  protected hasFailed: boolean = false;
  protected menus: SidebarMenu[] = [];
  protected regions: SidebarRegion[] = [];

  private sidebarService: SidebarService = inject(SidebarService);
  private wasClickedOutside: boolean = false;
  //#endregion

  //#region Properties
  protected get isActive(): boolean {
    return this.sidebarService.isActive;
  }

  protected get isCollapsed(): boolean {
    return this.sidebarService.isCollapsed;
  }

  protected get isLoading(): boolean {
    return this.menus.length === 0;
  }
  //#endregion
  
  //#region Constructor and Angular life cycle methods
  constructor() {
    super();
  }

  public ngAfterViewInit(): void {
    this.updateShouldActivate();
  }

  public ngOnInit(): void {
    merge(this.sidebarService.menuUrlSelected, this.sidebarService.menuExternalUrlSelected)
      .pipe(takeUntil(this.destroy$))
      .subscribe((_menu: SidebarMenu) => this.deactivate());

    this.sidebarService.loadRoot()
      .pipe(take(1))
      .subscribe({
        next: (menus: SidebarMenu[]) => {
          this.menus = menus;
          this.regions = this.groupIntoRegions(menus);
        },
        error: () => this.hasFailed = true
      });
  }
  //#endregion

  //#region Event handlers
  //#endregion

  //#region Public methods
  public collapse(): void {
    this.sidebarService.isCollapsed = !this.sidebarService.isCollapsed;
    this.sidebarService.isActive = false;

    if (this.sidebarService.isCollapsed) {
      this.sidebarService.deselectAll();
    }

    this.updateShouldActivate();
  }
  //#endregion

  //#region Private methods
  protected trackByFn(_index: number, item: SidebarMenu): number {
    return item.id;
  }

  protected trackByRegion(_index: number, region: SidebarRegion): string {
    return region.name ?? '';
  }

  // Group top-level menus into regions by their optional `region` label, preserving
  // first-appearance order. Ungrouped menus fall into a single header-less region.
  private groupIntoRegions(menus: SidebarMenu[]): SidebarRegion[] {
    const regions: SidebarRegion[] = [];
    const byName: Map<string | undefined, SidebarRegion> = new Map<string | undefined, SidebarRegion>();

    menus.forEach((menu: SidebarMenu) => {
      let region: SidebarRegion | undefined = byName.get(menu.region);
      if (!region) {
        region = { name: menu.region, items: [] };
        byName.set(menu.region, region);
        regions.push(region);
      }
      region.items.push(menu);
    });

    return regions;
  }

  private deactivate(): void {
    if (this.sidebarService.isActive) {
      this.sidebarService.isActive = false;
      this.sidebarService.deselectAll();
    }
  }

  private updateShouldActivate(): void {
    this.sidebarService.shouldActivate =
      (window.innerWidth <= 767 && !this.sidebarService.isCollapsed)
      || this.sidebarService.isCollapsed;
  }
  //#endregion
}