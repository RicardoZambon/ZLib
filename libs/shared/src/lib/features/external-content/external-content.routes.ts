import { Routes } from '@angular/router';
import { FRAMEWORK_VIEW_TYPE, FrameworkViewType } from '@zambon-dev/framework';
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
 * Two things about the shape are load-bearing and must not be "simplified" into a single route:
 *
 * - The path is nested one segment per route. `RouteHelper.getRouteURL` and
 *   `CustomReuseStrategy.getUrlFromRoute` collect segments walking up the parent chain and then
 *   reverse the flat list, so a route declared `'external-content/:menuID'` rebuilds as
 *   `/:menuID/external-content` and every tab URL is wrong.
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
        component: ExternalContentComponent,
        data: { [FRAMEWORK_VIEW_TYPE]: FrameworkViewType.List },
      },
    ],
  },
];
