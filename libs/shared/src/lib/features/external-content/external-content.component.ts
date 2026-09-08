import { Component, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent, TabService, TabViewBase } from '@zambon-dev/framework';
import { RibbonGroupComponent } from '@zambon-dev/library';
import { TranslatePipe } from '@ngx-translate/core';
import { take, takeUntil } from 'rxjs';
import { EXTERNAL_CONTENT_CONFIGS, ExternalContentConfigs, IExternalContentEntry } from '../../models';
import { ExternalContentService, ExternalUrlResolverService } from '../../services';

/**
 * Displays an external destination inside an application tab.
 *
 * Routed as `/external-content/:menuID` — the destination itself never travels in the URL, so no
 * one can hand-craft a link that makes the application frame an arbitrary site.
 *
 * A `TabViewBase` like any other screen, so its actions live in the ribbon rather than in a
 * bar of its own: it must be routed under `DefaultTabViewComponent`, which is what renders the
 * `#ribbon` template this view publishes. Use the exported `externalContentRoutes`.
 */
@Component({
  selector: 'shared-external-content',
  templateUrl: './external-content.component.html',
  styleUrls: ['./external-content.component.scss'],
  imports: [
    ButtonComponent,
    RibbonGroupComponent,
    TranslatePipe,
  ]
})
export class ExternalContentComponent extends TabViewBase implements OnInit {
  //#region ViewChilds, Inputs, Outputs
  //#endregion

  //#region Variables
  protected frameUrl?: SafeResourceUrl;
  protected isBlocked: boolean = false;
  protected isSlow: boolean = false;
  protected isUnavailable: boolean = false;
  protected label: string = '';
  protected resolvedUrl: string = '';

  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private configs: ExternalContentConfigs = inject(EXTERNAL_CONTENT_CONFIGS);
  private externalContentService: ExternalContentService = inject(ExternalContentService);
  private externalUrlResolverService: ExternalUrlResolverService = inject(ExternalUrlResolverService);
  private sanitizer: DomSanitizer = inject(DomSanitizer);
  private slowHintTimeout?: ReturnType<typeof setTimeout>;
  private tabService: TabService = inject(TabService);
  //#endregion

  //#region Properties
  //#endregion

  //#region Constructor and Angular life cycle methods
  constructor() {
    super();
  }

  public override ngOnDestroy(): void {
    this.clearSlowHint();

    super.ngOnDestroy();
  }

  public ngOnInit(): void {
    const menuID: number = Number(this.activatedRoute.snapshot.paramMap.get('menuID'));

    if (!menuID) {
      this.isUnavailable = true;
      this.loading = false;

      return;
    }

    this.externalContentService.find(menuID)
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((entry: IExternalContentEntry | undefined) => this.show(entry));
  }
  //#endregion

  //#region Event handlers
  protected onFrameLoad(): void {
    this.clearSlowHint();
    this.isSlow = false;
  }

  protected onOpenInNewTab(): void {
    window.open(this.resolvedUrl, '_blank', 'noopener,noreferrer');
  }

  protected onReload(): void {
    const url: SafeResourceUrl | undefined = this.frameUrl;

    if (!url) {
      return;
    }

    // The frame is cross-origin, so its location cannot be touched from here. Tearing the element
    // down and rebuilding it on the next microtask is what actually reloads the destination.
    this.frameUrl = undefined;
    this.startSlowHint();

    Promise.resolve().then(() => this.frameUrl = url);
  }
  //#endregion

  //#region Public methods
  //#endregion

  //#region Private methods
  private clearSlowHint(): void {
    if (this.slowHintTimeout !== undefined) {
      clearTimeout(this.slowHintTimeout);
      this.slowHintTimeout = undefined;
    }
  }

  private isOriginAllowed(url: string): boolean {
    if (this.configs.allowedOrigins.length === 0) {
      return true;
    }

    try {
      return this.configs.allowedOrigins.indexOf(new URL(url).origin) !== -1;
    } catch {
      return false;
    }
  }

  private show(entry: IExternalContentEntry | undefined): void {
    // TabViewBase starts every screen loading so its ribbon buttons begin disabled; every exit
    // from here has to clear it or they never become usable.
    this.loading = false;

    if (!entry || !entry.url) {
      this.isUnavailable = true;

      return;
    }

    this.label = entry.label;

    // MainLayoutComponent only resolves a deep-linked title through getMenuFromUrl, and a Tab
    // starts with isTitleLoading true, so a tab re-created by TabsComponent after a refresh would
    // spin forever if nothing set its title. Setting it here is idempotent.
    this.tabService.updateActiveTabRootTitle(entry.label);

    // Order matters: resolve, then validate, then trust. What we vet has to be exactly what the
    // browser receives, and a placeholder is substituted before the scheme can be inspected.
    const url: string = this.externalUrlResolverService.resolve(entry.url);

    if (!this.externalUrlResolverService.isAllowed(url) || !this.isOriginAllowed(url)) {
      console.error(`Embedded menu item "${entry.label}" points to an address that is not allowed and was not displayed.`, url);
      this.isBlocked = true;

      return;
    }

    this.resolvedUrl = url;

    // Trusted once, into a field. From a getter or a pipe this would hand back a new
    // SafeResourceUrl on every change-detection pass, and Angular would re-set the iframe's src
    // and reload the destination each time.
    this.frameUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

    this.startSlowHint();
  }

  private startSlowHint(): void {
    this.clearSlowHint();

    // Not detection, and it must never be turned into one: whether a site refuses to be framed
    // (X-Frame-Options, CSP frame-ancestors) is not observable from JavaScript. A refused frame
    // usually fires `load` immediately and renders the browser's own error page, in which case
    // this hint never appears -- the ribbon's "open in a new browser tab" button is the actual
    // way out, and it is always present.
    this.slowHintTimeout = setTimeout(() => this.isSlow = true, this.configs.slowFrameHintDelay);
  }
  //#endregion
}
