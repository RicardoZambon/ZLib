import { ApplicationRef, Inject, inject } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy, UrlSegment } from '@angular/router';
import { TabService } from './tab.service';

@Inject({})
export class CustomReuseStrategy implements RouteReuseStrategy {
  //#region ViewChilds, Inputs, Outputs
  //#endregion

  //#region Variables
  public clones: { [key: string]: string } = {};
  public redirects: { [key: string]: string } = {};
  public tabService?: TabService;

  private applicationRef: ApplicationRef = inject(ApplicationRef);
  private cachedHandles: { [key: string]: DetachedRouteHandle | null } = {};
  private componentIDs: WeakMap<object, number> = new WeakMap<object, number>();
  private nextComponentID = 1;
  //#endregion

  //#region Properties
  //#endregion
  
  //#region Constructor and Angular life cycle methods
  //#endregion

  //#region Event handlers
  //#endregion

  //#region Public methods
  public clearAllHandles(): void {
    this.cachedHandles = {};
  }

  public clearHandle(url: string): void {
    const keysToRemove: string[] = Object.keys(this.cachedHandles)
      .filter((key: string) => key.startsWith(`${url}-`));

    keysToRemove.forEach((key: string) => {
      const handle: DetachedRouteHandle | null = this.cachedHandles[key];

      if (handle) {
        if ((<any>handle)?.componentRef?.instance?.ngOnDestroy) {
          (<any>handle).componentRef.instance.ngOnDestroy();
        }
      }
      delete this.cachedHandles[key];
    });
  }

  public retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (!route.component) {
      return null;
    }

    const cacheKey: string = this.getCacheKey(route);
    const handle: DetachedRouteHandle | null = this.cachedHandles[cacheKey];

    if (handle) {
      // Schedule global change detection after Angular finishes reattaching the component.
      // Without this, reattached components may render stale views (e.g., empty ribbon)
      // because NgTemplateOutlet does not re-create its embedded view automatically.
      // ApplicationRef.tick() ensures the entire app tree is checked, including embedded views.
      setTimeout(() => {
        this.applicationRef.tick();
      });
    }

    return handle;
  }

  public shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const url: string = this.getUrlFromRoute(route);
    const hasComponent: boolean = !!route.component;

    if ((this.tabService?.isUrlOpen(url) ?? false) && hasComponent)
    {
      const cacheKey: string = this.getCacheKey(route);
      const isCached: boolean = !!this.cachedHandles[cacheKey];
      return isCached;
    }
    return false;
  }

  public shouldDetach(route: ActivatedRouteSnapshot): boolean {
    const url: string = this.getUrlFromRoute(route);
    const hasComponent: boolean = !!route.component;

    return (this.tabService?.isUrlOpen(url) ?? false) && hasComponent;
  }

  public shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    const futureUrl: string = this.getUrlFromRoute(future);
    const currentUrl: string = this.getUrlFromRoute(current);

    return (futureUrl === currentUrl && future.routeConfig === current.routeConfig) || this.redirects[currentUrl] === futureUrl || this.clones[futureUrl] === currentUrl;
  }

  public store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    const cacheKey: string = this.getCacheKey(route);
    this.cachedHandles[cacheKey] = handle;
  }
  //#endregion

  //#region Private methods
  private getCacheKey(route: ActivatedRouteSnapshot): string {
    let url: string = this.getUrlFromRoute(route);
    if (this.clones[url]) {
      url = this.clones[url];
    }

    // The component is identified by identity, never by name. A production build renames every
    // class: esbuild wraps each component as `X = (() => { class i { } return i; })()`, so
    // `component.name` is a single mangled letter that the whole chunk shares. Nested empty-path
    // routes already resolve to the same URL, because an empty path contributes no segment, so a
    // key built from the name collapsed a screen's tab view and its list into one entry: storing
    // one overwrote the other, both levels were then handed the same detached view, and Angular
    // blew the stack building a router state whose node was its own descendant. That reproduced
    // only in a minified build, and only on the screens whose chunk happened to mangle to the
    // same letter as the framework's.
    //
    // The depth is part of the key too, so two sibling routes sharing a component type under one
    // URL cannot collide either.
    return `${url}-${this.getRouteDepth(route)}-${this.getComponentID(route.component)}`;
  }

  private getComponentID(component: ActivatedRouteSnapshot['component']): number {
    if (typeof component !== 'function') {
      return 0;
    }

    let componentID: number | undefined = this.componentIDs.get(component);
    if (componentID === undefined) {
      componentID = this.nextComponentID++;
      this.componentIDs.set(component, componentID);
    }

    return componentID;
  }

  private getRouteDepth(route: ActivatedRouteSnapshot): number {
    let depth = 0;
    let current: ActivatedRouteSnapshot | null = route.parent;

    while (current) {
      depth++;
      current = current.parent;
    }

    return depth;
  }

  private getUrlFromRoute(route: ActivatedRouteSnapshot): string {
    const segments: string[] = [];

    const buildRoute: (route: ActivatedRouteSnapshot | null) => void = (route: ActivatedRouteSnapshot | null): void => {
      if (!!route) {
        if (!!route.url.length) {
          segments.push(...route.url.map((segment: UrlSegment) => segment.path));
        }
        buildRoute(route.parent);
      }
    };

    buildRoute(route);

    return `/${segments.reverse().join('/')}`;
  }
  //#endregion
}