import { ApplicationRef, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, DetachedRouteHandle, UrlSegment } from '@angular/router';
import { TabService } from './tab.service';
import { CustomReuseStrategy } from './custom-reuse-strategy';

describe('CustomReuseStrategy', () => {
  let strategy: CustomReuseStrategy;

  /**
   * Builds a class the way an Angular production build leaves a component: esbuild wraps every one
   * of them as `X = (() => { class i { } return i; })()`, so `Type.name` is the mangled inner name
   * and every component in the same chunk reports the very same one.
   */
  function minifiedComponent(): Type<unknown> {
    return <Type<unknown>><unknown>(() => {
      class i { }
      return i;
    })();
  }

  function createRouteSnapshot(segments: string[], component: Type<unknown> | null, parent?: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    return <ActivatedRouteSnapshot><unknown>{
      component,
      data: {},
      firstChild: null,
      parent: parent ?? null,
      url: segments.map((segment: string) => new UrlSegment(segment, {})),
    };
  }

  // Two distinct classes that report the same name, which is what a minified build produces. The
  // tab view one is shared by every screen, exactly as DefaultTabViewComponent is in the real app.
  const tabViewComponent: Type<unknown> = minifiedComponent();
  const listComponent: Type<unknown> = minifiedComponent();

  /** The route chain of a list screen: two empty-path routes under /integrations/<area>. */
  function createListScreenRoutes(area: string): { list: ActivatedRouteSnapshot, tabView: ActivatedRouteSnapshot } {
    const integrations: ActivatedRouteSnapshot = createRouteSnapshot(['integrations'], null);
    const screen: ActivatedRouteSnapshot = createRouteSnapshot([area], null, integrations);
    const tabView: ActivatedRouteSnapshot = createRouteSnapshot([], tabViewComponent, screen);
    const list: ActivatedRouteSnapshot = createRouteSnapshot([], listComponent, tabView);

    return { list, tabView };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});

    // The real ApplicationRef, only with tick() neutered: replacing the provider outright breaks
    // the TestBed injector, which resolves it while initializing.
    jest.spyOn(TestBed.inject(ApplicationRef), 'tick').mockImplementation(() => undefined);

    strategy = TestBed.runInInjectionContext(() => new CustomReuseStrategy());
    strategy.tabService = <TabService><unknown>{ isUrlOpen: (): boolean => true };
  });

  afterEach(() => jest.restoreAllMocks());

  describe('handle cache', () => {
    it('keeps two nested empty-path routes apart even when their components report the same name', () => {
      const { list, tabView } = createListScreenRoutes('sync-queue');

      // The precondition this whole test exists for: after minification the two components are
      // indistinguishable by name, and both routes resolve to the same URL because an empty path
      // contributes no segment. Anything keyed on the name alone collapses them into one entry.
      expect(tabView.component?.name).toBe(list.component?.name);

      const tabViewHandle: DetachedRouteHandle = <DetachedRouteHandle><unknown>{ view: 'tabView' };
      const listHandle: DetachedRouteHandle = <DetachedRouteHandle><unknown>{ view: 'list' };

      strategy.store(tabView, tabViewHandle);
      strategy.store(list, listHandle);

      // Handing the same handle back for two levels of one route chain makes the attached view its
      // own descendant, and Angular then blows the stack building the router state.
      expect(strategy.retrieve(tabView)).toBe(tabViewHandle);
      expect(strategy.retrieve(list)).toBe(listHandle);
    });

    it('returns the stored handle for the route it was stored for', () => {
      const { list } = createListScreenRoutes('sync-queue');
      const handle: DetachedRouteHandle = <DetachedRouteHandle>{};

      strategy.store(list, handle);

      expect(strategy.retrieve(list)).toBe(handle);
      expect(strategy.shouldAttach(list)).toBe(true);
    });

    it('does not hand one screen the handle of another', () => {
      const syncQueue: { list: ActivatedRouteSnapshot } = createListScreenRoutes('sync-queue');
      const adpImport: { list: ActivatedRouteSnapshot } = createListScreenRoutes('adp-import');
      const handle: DetachedRouteHandle = <DetachedRouteHandle>{};

      strategy.store(syncQueue.list, handle);

      expect(strategy.retrieve(adpImport.list)).toBeFalsy();
      expect(strategy.shouldAttach(adpImport.list)).toBe(false);
    });

    it('returns nothing for a route that was never stored', () => {
      const { list } = createListScreenRoutes('sync-queue');

      expect(strategy.retrieve(list)).toBeFalsy();
      expect(strategy.shouldAttach(list)).toBe(false);
    });

    it('returns nothing for a route without a component', () => {
      const route: ActivatedRouteSnapshot = createRouteSnapshot(['integrations'], null);

      expect(strategy.retrieve(route)).toBeNull();
    });
  });

  describe('clearHandle', () => {
    it('drops every level of the screen it names, and nothing of another screen', () => {
      const syncQueue: { list: ActivatedRouteSnapshot, tabView: ActivatedRouteSnapshot } = createListScreenRoutes('sync-queue');
      const adpImport: { list: ActivatedRouteSnapshot } = createListScreenRoutes('adp-import');

      strategy.store(syncQueue.tabView, <DetachedRouteHandle><unknown>{ view: 'syncQueue.tabView' });
      strategy.store(syncQueue.list, <DetachedRouteHandle><unknown>{ view: 'syncQueue.list' });
      const adpHandle: DetachedRouteHandle = <DetachedRouteHandle><unknown>{ view: 'adpImport.list' };
      strategy.store(adpImport.list, adpHandle);

      strategy.clearHandle('/integrations/sync-queue');

      expect(strategy.retrieve(syncQueue.tabView)).toBeFalsy();
      expect(strategy.retrieve(syncQueue.list)).toBeFalsy();
      expect(strategy.retrieve(adpImport.list)).toBe(adpHandle);
    });

    it('calls ngOnDestroy on the component it drops', () => {
      const { list } = createListScreenRoutes('sync-queue');
      const ngOnDestroy: jest.Mock = jest.fn();

      strategy.store(list, <DetachedRouteHandle><unknown>{ componentRef: { instance: { ngOnDestroy } } });
      strategy.clearHandle('/integrations/sync-queue');

      expect(ngOnDestroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearAllHandles', () => {
    it('empties the cache', () => {
      const { list } = createListScreenRoutes('sync-queue');
      strategy.store(list, <DetachedRouteHandle>{});

      strategy.clearAllHandles();

      expect(strategy.retrieve(list)).toBeFalsy();
    });
  });

  describe('clones', () => {
    it('stores a cloned URL under the URL it was cloned from', () => {
      const original: { list: ActivatedRouteSnapshot } = createListScreenRoutes('sync-queue');
      const clone: { list: ActivatedRouteSnapshot } = createListScreenRoutes('sync-queue-2');
      strategy.clones['/integrations/sync-queue-2'] = '/integrations/sync-queue';

      const handle: DetachedRouteHandle = <DetachedRouteHandle>{};
      strategy.store(clone.list, handle);

      // Same URL after the remap, and the same level of the chain, so the clone resolves to it.
      expect(strategy.retrieve(original.list)).toBe(handle);
    });
  });
});
