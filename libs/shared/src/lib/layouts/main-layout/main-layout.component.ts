import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { APP_CONFIG, ITab, Tab, TabsComponent, TabService } from '@zambon-dev/framework';
import { ModalComponent, SidebarComponent, SidebarMenu, SidebarMenuOpenMode, SidebarService, toSidebarMenuOpenMode } from '@zambon-dev/library';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, take, takeUntil } from 'rxjs';
import { EXTERNAL_CONTENT_ROUTE_PATH } from '../../models';
import { AuthenticationService, ExternalContentService, ExternalUrlResolverService } from '../../services';
import { TopBarComponent } from '../top-bar';

@Component({
  selector: 'shared-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  imports: [
    ModalComponent,
    RouterModule,
    SidebarComponent,
    TabsComponent,
    TopBarComponent,
    TranslatePipe,
  ]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  //#region ViewChilds, Inputs, Outputs
  @ViewChild('logoutModal') private logoutModal!: ModalComponent;
  //#endregion

  //#region Variables
  private authenticationService: AuthenticationService = inject(AuthenticationService);
  private destroy$: Subject<boolean> = new Subject<boolean>();
  private externalContentService: ExternalContentService = inject(ExternalContentService);
  private externalUrlResolverService: ExternalUrlResolverService = inject(ExternalUrlResolverService);
  private router: Router = inject(Router);
  private sidebarService: SidebarService = inject(SidebarService);
  private tabService: TabService = inject(TabService);

  /** Application version (from AppConfig) projected into the sidebar footer. */
  protected appVersion: string = inject(APP_CONFIG).version;
  //#endregion

  //#region Properties
  //#endregion

  //#region Constructor and Angular life cycle methods

  public ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  public ngOnInit(): void {
    const url: string = this.router.url;

    if (url !== '/' && !this.tabService.isUrlOpen(url)) {
      this.sidebarService.getMenuFromUrl(url)
        .pipe(take(1))
        .subscribe({
          next: (item: SidebarMenu) => {
            if (!!item) {
              this.tabService.updateTabTitle(url, item.label);
            }
          },
          // A deep-linked title is best-effort. Menu endpoints answer 404 for a URL they do not
          // know -- the embedded-content route among them -- and that must not surface as an
          // unhandled rejection.
          error: () => undefined,
        });
    }

    this.sidebarService.menuExternalUrlSelected
      .pipe(takeUntil(this.destroy$))
      .subscribe((item: SidebarMenu) => this.openExternalMenu(item));

    this.sidebarService.menuUrlSelected
      .pipe(takeUntil(this.destroy$))
      .subscribe((item: SidebarMenu) => {
        const tab: ITab = new Tab({
          title: item.label,
          url: item.url,
        });
        this.tabService.openTab(tab);
      });
  }
  //#endregion

  //#region Event handlers
  //#endregion

  //#region Public methods
  public onLogoutClick(): void {
    this.logoutModal.toggleModal();
  }

  public onLogoutConfirm(): void {
    this.authenticationService.signOut();
    this.router.navigate(['/login']);
  }
  //#endregion

  //#region Private methods
  private openExternalMenu(item: SidebarMenu): void {
    const rawUrl: string = item.url ?? '';

    if (rawUrl.length === 0) {
      return;
    }

    if (toSidebarMenuOpenMode(item.openMode) === SidebarMenuOpenMode.ExternalEmbedded) {
      // The tab has to be a real Angular route, so the destination travels by menu id and is
      // resolved by ExternalContentComponent. A `?url=` query string would collapse every
      // embedded tab into one -- TabService and CustomReuseStrategy key tabs on path segments
      // only -- and would also let anyone frame an arbitrary site inside our own chrome.
      this.externalContentService.register(item);

      const tab: ITab = new Tab({
        title: item.label,
        url: `/${EXTERNAL_CONTENT_ROUTE_PATH}/${item.id}`,
      });
      this.tabService.openTab(tab);

      return;
    }

    const url: string = this.externalUrlResolverService.resolve(rawUrl);

    if (!this.externalUrlResolverService.isAllowed(url)) {
      console.error(`Sidebar menu "${item.label}" points to an unsupported external address and was not opened.`, url);
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }
  //#endregion
}