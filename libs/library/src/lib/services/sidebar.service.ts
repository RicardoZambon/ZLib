import { EventEmitter, Injectable } from '@angular/core';
import { map, Observable, take, tap } from 'rxjs';
import { ISidebarProfile, SidebarMenu, SidebarMenuOpenMode, toSidebarMenuOpenMode } from '../models';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export abstract class SidebarService {
  //#region ViewChilds, Inputs, Outputs
  public childrenFailed: EventEmitter<SidebarMenu> = new EventEmitter<SidebarMenu>();
  public childrenLoading: EventEmitter<SidebarMenu> = new EventEmitter<SidebarMenu>();
  public childrenInitialized: EventEmitter<SidebarMenu> = new EventEmitter<SidebarMenu>();
  public menuExternalUrlSelected: EventEmitter<SidebarMenu> = new EventEmitter<SidebarMenu>();
  public menuUrlSelected: EventEmitter<SidebarMenu> = new EventEmitter<SidebarMenu>();
  public selectionChanged: EventEmitter<SidebarMenu> = new EventEmitter<SidebarMenu>();
  //#endregion

  //#region Variables
  public isActive: boolean = false;
  public isCollapsed: boolean = false;
  public shouldActivate: boolean = false;

  private menus: SidebarMenu[] = [];
  private selectedMenu: SidebarMenu | null = null;
  //#endregion

  //#region Properties
  //#endregion
  
  //#region Constructor and Angular life cycle methods
  //#endregion

  //#region Public methods
  public deselectAll(): void {
    this.menus
      .filter((menu: SidebarMenu) => menu.isSelected)
      .forEach((menu: SidebarMenu) => {
        this.deselectMenu(menu);
      });
  }

  public loadChildren(parentMenu: SidebarMenu): void {
    this.childrenLoading.emit(parentMenu);

    this.loadChildrenFor(parentMenu)
      .subscribe({
        error: (exception: HttpErrorResponse) => {
          this.childrenFailed.emit(parentMenu);
          throw exception;
        }
      });
  }

  /**
   * Loads a parent's children and hands them back, for callers that need them before the user
   * clicks -- a sidebar rendering areas flat has to have them up front. {@link loadChildren} is
   * the fire-and-forget variant that also raises the loading and failure events.
   */
  public loadChildrenFor(parentMenu: SidebarMenu): Observable<SidebarMenu[]> {
    return this.loadMenus(parentMenu)
      .pipe(
        take(1),
        map((menus: SidebarMenu[]) => menus.map((menu: SidebarMenu) => new SidebarMenu(menu))),
        tap((childrenMenus: SidebarMenu[]) => {
          parentMenu.children = childrenMenus;
          childrenMenus.forEach((childMenu: SidebarMenu) => childMenu.parent = parentMenu);
        }),
      );
  }

  public loadRoot(): Observable<SidebarMenu[]> {
    return this.loadMenus(null)
      .pipe(
        take(1),
        map((menus: SidebarMenu[]) => menus.map((menu: SidebarMenu) => new SidebarMenu(menu))),
        tap((menus: SidebarMenu[]) => this.menus = menus)
      );
  }
  
  public select(menu: SidebarMenu): void {
    if (menu.childCount > 0 && (menu.children?.length ?? 0) === 0) {
      this.loadChildren(menu);
    }

    const hasUrl: boolean = (menu.url?.length ?? 0) > 0;
    const openMode: SidebarMenuOpenMode = toSidebarMenuOpenMode(menu.openMode);
    const isExternal: boolean = hasUrl && openMode !== SidebarMenuOpenMode.Internal;

    // External destinations are announced on their own emitter, so a consumer that only knows
    // menuUrlSelected never receives an absolute URL it would hand to the Angular router.
    const urlSelected: EventEmitter<SidebarMenu> = isExternal ? this.menuExternalUrlSelected : this.menuUrlSelected;

    // Opening a new browser tab is an action, not a destination: the user stays on the view
    // already on screen, so the item must neither take the selection nor clear that view's.
    // Parents still fall through, so a parent that carries a URL keeps expanding instead of
    // becoming impossible to open.
    if (isExternal && openMode === SidebarMenuOpenMode.ExternalNewTab && menu.childCount === 0) {
      urlSelected.emit(menu);
      return;
    }

    // In case we're deselecting the menu because a child was selected, we need to keep track of the original selection state.
    const isSelected: boolean = menu.isSelected;

    if (!!this.selectedMenu && this.selectedMenu !== menu) {
      this.deselectAll();
    }

    if (!isSelected) {
      this.selectedMenu = menu;
      this.selectMenu(menu);

      if (hasUrl) {
        urlSelected.emit(menu);
      }

    } else if (hasUrl) {
      // Menu with a URL is already selected — navigate again instead of toggling off.
      urlSelected.emit(menu);
    } else {
      this.selectedMenu = null;
      this.deselectMenu(menu);
    }
  }
  //#endregion

  //#region Private methods
  private deselectMenu(menu: SidebarMenu, shouldUpdateParents: boolean = true): void {
    if (!menu.isSelected) {
      return;
    }

    menu.isSelected = false;
    this.selectionChanged.emit(menu);

    if ((menu.children?.length ?? 0) > 0) {
      menu.children
        .filter((child: SidebarMenu) => child.isSelected)
        .forEach((child: SidebarMenu) => {
          const shouldUpdateParents: boolean = false;
          this.deselectMenu(child, shouldUpdateParents);
        });
    }

    if (!!menu.parent && shouldUpdateParents) {
      while (!!menu.parent) {
        this.selectionChanged.emit(menu.parent);
        menu = menu.parent;
      }
    }
  }

  private selectMenu(menu: SidebarMenu): void {
    menu.isSelected = true;
    this.selectionChanged.emit(menu);

    if (!!menu.parent) {
      this.selectMenu(menu.parent);
    }
  }
  //#endregion

  //#region Abstract methods
  public abstract getMenuFromUrl(url: string): Observable<SidebarMenu>;

  public abstract getUserProfile(): ISidebarProfile | undefined;

  protected abstract loadMenus(parentMenuID: SidebarMenu | null): Observable<SidebarMenu[]>;
  //#endregion
}