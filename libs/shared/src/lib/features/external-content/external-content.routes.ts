import { Routes } from '@angular/router';
import { DefaultTabViewComponent, FRAMEWORK_VIEW_TYPE, FrameworkViewType } from '@zambon-dev/framework';
import { EXTERNAL_CONTENT_ROUTE_PATH } from '../../models';
import { ExternalContentComponent } from './external-content.component';

/**
 * Route table for embedded external content. Spread it into `MainLayoutComponent`'s children:
 *
 * ```ts
 * { path: '', component: MainLayoutComponent, canActivate: [AuthGuard], children: [
 *   ...externalContentRoutes,
 *   // the application's own features
 * ] }
 * ```
 *
 * Three things about the shape are load-bearing and must not be "simplified" away:
 *
 * - The path is nested one segment per route. `RouteHelper.getRouteURL` and
 *   `CustomReuseStrategy.getUrlFromRoute` collect segments walking up the parent chain and then
 *   reverse the flat list, so a route declared `'external-content/:menuID'` rebuilds as
 *   `/:menuID/external-content` and every tab URL is wrong.
 * - `DefaultTabViewComponent` hosts the view. It is what renders the `#ribbon` template the
 *   component publishes, so dropping it leaves the Reload and Open-in-a-new-browser-tab actions
 *   with nowhere to appear.
 * - `FRAMEWORK_VIEW_TYPE` must be present. `TabsComponent` re-creates the tab after a page refresh
 *   by looking for a `Details` or `List` view in the activated route tree, and navigates to `/`
 *   when it finds neither — the embedded tab would vanish on F5.
 */
export const externalContentRoutes: Routes = [
  {
    path: EXTERNAL_CONTENT_ROUTE_PATH,
    children: [
      {
        path: ':menuID',
        component: DefaultTabViewComponent,
        data: { [FRAMEWORK_VIEW_TYPE]: FrameworkViewType.List },
        children: [
          { path: '', component: ExternalContentComponent },
        ],
      },
    ],
  },
];
