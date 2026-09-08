import { NgFor, NgIf, NgStyle } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { delay, filter, takeUntil } from 'rxjs';
import { SIDEBAR_CONFIGS, SidebarConfigs, SidebarMenu, SidebarMenuOpenMode, toSidebarMenuOpenMode } from '../../models';
import { SidebarService } from '../../services';
import { BaseComponent } from '../base.component';

@Component({
  selector: 'lib-sidebar-item',
  templateUrl: './sidebar-item.component.html',
  styleUrls: ['./sidebar-item.component.scss'],
  imports: [
    NgFor,
    NgIf,
    NgStyle,
    TranslatePipe,
  ],
  host: {
    '[class.active]': 'isActive',
    '[class.expanded]': '!isCollapsed',
    '[class.first-level]': 'level === 0',
    '[class.last-child]': 'isLast',
    '[class.selected]': 'isSelected',
  }
})
export class SidebarItemComponent extends BaseComponent implements OnInit, AfterViewInit {
  //#region ViewChilds, Inputs, Outputs
  @ViewChild('menuContainer') private menuContainer!: ElementRef<HTMLAnchorElement>;

  @Input() public isLast: boolean = false;
  @Input() public level: number = 0;
  @Input() public menu!: SidebarMenu;
  //#endregion

  //#region Variables
  protected hasFailed: boolean = false;
  protected isLoading: boolean = false;
  protected isSelected: boolean = false;

  private _childHeight: number = 0;
  private changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  private sidebarConfigs: SidebarConfigs = inject(SIDEBAR_CONFIGS);
  private sidebarService: SidebarService = inject(SidebarService);
  //#endregion

  //#region Properties
  public get childHeight(): number {
    return this._childHeight;
  }

  protected get areChildrenLoaded(): boolean {
    return this.isParent && (this.menu.children?.length ?? 0) > 0;
  }

  protected get externalLinkText(): string {
    return this.sidebarConfigs.externalLinkText;
  }

  protected get isActive(): boolean {
    return this.sidebarService.isActive;
  }

  protected get isCollapsed(): boolean {
    return this.sidebarService.isCollapsed;
  }

  protected get isParent(): boolean {
    return this.menu.childCount > 0;
  }

  protected get opensInNewBrowserTab(): boolean {
    return (this.menu.url?.length ?? 0) > 0
      && toSidebarMenuOpenMode(this.menu.openMode) === SidebarMenuOpenMode.ExternalNewTab;
  }

  protected get hasIcon(): boolean {
    return !!this.menu.icon && this.menu.icon.length > 0;
  }
  //#endregion
  
  //#region Constructor and Angular life cycle methods
  constructor() {
    super();
  }

  public ngAfterViewInit(): void {
    if (!!this.menu && !!this.menu.parent) {
      this.menu.height = this.menuContainer?.nativeElement?.offsetHeight ?? 0;
      this.sidebarService.childrenInitialized.emit(this.menu.parent);
    }
  }

  public ngOnInit(): void {
    if (this.isParent) {
      this.sidebarService.childrenFailed
        .pipe(
          takeUntil(this.destroy$),
          filter((menu: SidebarMenu) => menu.id === this.menu.id),
          delay(1000),
        )
        .subscribe((_menu: SidebarMenu) => {
          this.hasFailed = true;
          this.isLoading = false;
          this.isSelected = false;
          this.menu.isSelected = false;

          this.changeDetectorRef.detectChanges();
        });

      this.sidebarService.childrenLoading
        .pipe(
          takeUntil(this.destroy$),
          filter((menu: SidebarMenu) => menu.id === this.menu.id)
        )
        .subscribe((_menu: SidebarMenu) => {
          this.hasFailed = false;
          this.isLoading = true;
        });

      this.sidebarService.childrenInitialized
        .pipe(
          takeUntil(this.destroy$),
          filter((menu: SidebarMenu) => menu.id === this.menu.id && this.menu.children.every((child: SidebarMenu) => (child.height ?? 0) > 0))
        )
        .subscribe((_menu: SidebarMenu) => {
          this.isLoading = false;
          this.hasFailed = false;
          this.updateSubMenuHeight();

          if (!!this.menu.parent) {
            this.sidebarService.childrenInitialized.emit(this.menu.parent);
          }

          this.changeDetectorRef.detectChanges();
        });
    }

    this.sidebarService.selectionChanged
      .pipe(
        takeUntil(this.destroy$),
        filter((menu: SidebarMenu) => menu.id === this.menu.id)
      )
      .subscribe((menu: SidebarMenu) => {
        this.isSelected = menu.isSelected;
        this.updateSubMenuHeight();
      });
  }
  //#endregion

  //#region Event handlers
  protected onSelectItem(): void {
    if (this.sidebarService.shouldActivate) {
      this.sidebarService.isActive = true;
    }

    this.sidebarService.select(this.menu);
  }
  //#endregion

  //#region Public methods
  //#endregion

  //#region Private methods
  protected trackByFn(_index: number, item: SidebarMenu): number {
    return item.id;
  }

  private getChildHeight(menu: SidebarMenu): number {
    if (menu.isSelected) {
      return menu.children.reduce((height: number, childMenu: SidebarMenu) => height + (childMenu.height ?? 0) + this.getChildHeight(childMenu), 0);
    }
    return 0;
  }

  private updateSubMenuHeight(): void {
    this._childHeight = this.getChildHeight(this.menu);
  }
  //#endregion
}