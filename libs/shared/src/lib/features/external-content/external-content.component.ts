import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TabService } from '@zambon-dev/framework';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, take, takeUntil } from 'rxjs';
import { EXTERNAL_CONTENT_CONFIGS, ExternalContentConfigs, IExternalContentEntry } from '../../models';
import { ExternalContentService, ExternalUrlResolverService } from '../../services';

/**
 * Displays an external destination inside an application tab.
 *
 * Routed as `/external-content/:menuID` — the destination itself never travels in the URL, so no
 * one can hand-craft a link that makes the application frame an arbitrary site.
 */
@Component({
  selector: 'shared-external-content',
  templateUrl: './external-content.component.html',
  styleUrls: ['./external-content.component.scss'],
  imports: [
    TranslatePipe,
  ]
})
export class ExternalContentComponent implements OnInit, OnDestroy {
  //#region ViewChilds, Inputs, Outputs
  //#endregion

  //#region Variables
  /**
   * Fixed for every destination, and deliberately not configurable per menu item.
   *
   * - `allow-same-origin` keeps the frame in the *destination's* own origin so its cookies and
   *   storage work; without it an SSO'd report will not render. It grants no access to ours,
   *   provided the destination is cross-origin — never point an embedded item at this
   *   application's own origin, use an internal route for that.
   * - `allow-top-navigation` is absent on purpose: a framed site must not be able to navigate the
   *   whole application away.
   * - `allow-popups-to-escape-sandbox` keeps print and download popups usable.
   */
  protected readonly sandbox: string = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads';

  protected frameUrl?: SafeResourceUrl;
  protected isBlocked: boolean = false;
  protected isSlow: boolean = false;
  protected isUnavailable: boolean = false;
  protected label: string = '';

  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private configs: ExternalContentConfigs = inject(EXTERNAL_CONTENT_CONFIGS);
  private destroy$: Subject<boolean> = new Subject<boolean>();
  private externalContentService: ExternalContentService = inject(ExternalContentService);
  private externalUrlResolverService: ExternalUrlResolverService = inject(ExternalUrlResolverService);
  private resolvedUrl: string = '';
  private sanitizer: DomSanitizer = inject(DomSanitizer);
  private slowHintTimeout?: ReturnType<typeof setTimeout>;
  private tabService: TabService = inject(TabService);
  //#endregion

  //#region Properties
  //#endregion

  //#region Constructor and Angular life cycle methods
  public ngOnDestroy(): void {
    this.clearSlowHint();

    this.destroy$.next(true);
    this.destroy$.complete();
  }

  public ngOnInit(): void {
    const menuID: number = Number(this.activatedRoute.snapshot.paramMap.get('menuID'));

    if (!menuID) {
      this.isUnavailable = true;
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
    // this hint never appears -- the toolbar's "open in a new browser tab" button is the actual
    // way out, and it is always present.
    this.slowHintTimeout = setTimeout(() => this.isSlow = true, this.configs.slowFrameHintDelay);
  }
  //#endregion
}
