import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TabService, TabViewService } from '@zambon-dev/framework';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { of } from 'rxjs';
import { ExternalContentConfigs, IExternalContentEntry } from '../../models';
import { ExternalContentService, ExternalUrlResolverService } from '../../services';
import { ExternalContentComponent } from './external-content.component';

describe(ExternalContentComponent.name, () => {
  let bypassSecurityTrustResourceUrl: jest.Mock;
  let component: ExternalContentComponent;
  let configs: ExternalContentConfigs;
  let entry: IExternalContentEntry | undefined;
  let isAllowed: jest.Mock;
  let menuID: string | null;
  let resolve: jest.Mock;
  let updateActiveTabRootTitle: jest.Mock;

  /** Reads a member the template uses but TypeScript keeps protected. */
  function read<T>(name: string): T {
    return <T>(<Record<string, unknown>>(<unknown>component))[name];
  }

  function build(): void {
    component = Object.create(ExternalContentComponent.prototype);

    Object.assign(<Record<string, unknown>><unknown>component, {
      activatedRoute: { snapshot: { paramMap: { get: () => menuID } } },
      configs,
      destroy$: new Subject<boolean>(),
      externalContentService: { find: jest.fn(() => of(entry)) },
      externalUrlResolverService: { isAllowed, resolve },
      isBlocked: false,
      isSlow: false,
      isUnavailable: false,
      label: '',
      resolvedUrl: '',
      sanitizer: { bypassSecurityTrustResourceUrl },
      tabService: { updateActiveTabRootTitle },
    });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    bypassSecurityTrustResourceUrl = jest.fn((url: string) => ({ trusted: url }));
    configs = new ExternalContentConfigs();
    entry = { id: 1, label: 'Monthly report', url: 'https://reports/r?u={userId}' };
    isAllowed = jest.fn(() => true);
    menuID = '1';
    resolve = jest.fn((url: string) => url.replace('{userId}', '42'));
    updateActiveTabRootTitle = jest.fn();

    build();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('trusts the resolved URL exactly once', () => {
    component.ngOnInit();

    expect(resolve).toHaveBeenCalledWith('https://reports/r?u={userId}');
    expect(bypassSecurityTrustResourceUrl).toHaveBeenCalledTimes(1);
    expect(bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('https://reports/r?u=42');
  });

  it('keeps the trusted URL referentially stable, so change detection cannot reload the frame', () => {
    component.ngOnInit();

    expect(read('frameUrl')).toBe(read('frameUrl'));
  });

  it('validates the resolved URL, not the configured one', () => {
    component.ngOnInit();

    expect(isAllowed).toHaveBeenCalledWith('https://reports/r?u=42');
  });

  it('sets the tab title itself, so a tab restored after a refresh does not spin forever', () => {
    component.ngOnInit();

    expect(updateActiveTabRootTitle).toHaveBeenCalledWith('Monthly report');
  });

  it('shows the unavailable state and no frame when the destination cannot be recovered', () => {
    entry = undefined;
    build();

    component.ngOnInit();

    expect(read('isUnavailable')).toBe(true);
    expect(read('frameUrl')).toBeUndefined();
    expect(bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
  });

  it('shows the unavailable state when the route carries no menu id', () => {
    menuID = null;
    build();

    component.ngOnInit();

    expect(read('isUnavailable')).toBe(true);
  });

  it('never trusts a URL the resolver rejects, so poisoned storage cannot be framed', () => {
    isAllowed = jest.fn(() => false);
    entry = { id: 1, label: 'Bad', url: 'javascript:alert(1)' };
    build();

    component.ngOnInit();

    expect(read('isBlocked')).toBe(true);
    expect(bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
  });

  it('blocks an origin outside a populated allowlist', () => {
    configs = new ExternalContentConfigs({ allowedOrigins: ['https://reports.example.com'] });
    entry = { id: 1, label: 'Elsewhere', url: 'https://elsewhere.example.com/r' };
    build();

    component.ngOnInit();

    expect(read('isBlocked')).toBe(true);
    expect(bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
  });

  it('allows an origin inside a populated allowlist', () => {
    configs = new ExternalContentConfigs({ allowedOrigins: ['https://reports.example.com'] });
    entry = { id: 1, label: 'Report', url: 'https://reports.example.com/r' };
    build();

    component.ngOnInit();

    expect(read('isBlocked')).toBe(false);
    expect(bypassSecurityTrustResourceUrl).toHaveBeenCalledTimes(1);
  });

  it('hints that framing may be refused once the frame has stayed silent', () => {
    component.ngOnInit();

    expect(read('isSlow')).toBe(false);

    jest.advanceTimersByTime(configs.slowFrameHintDelay);

    expect(read('isSlow')).toBe(true);
  });

  it('cancels the hint as soon as the frame loads', () => {
    component.ngOnInit();

    (<{ onFrameLoad(): void }><unknown>component).onFrameLoad();
    jest.advanceTimersByTime(configs.slowFrameHintDelay);

    expect(read('isSlow')).toBe(false);
  });

  it('opens the destination in a new browser tab with no access back to this window', () => {
    const open: jest.SpyInstance = jest.spyOn(window, 'open').mockImplementation(() => null);
    component.ngOnInit();

    (<{ onOpenInNewTab(): void }><unknown>component).onOpenInNewTab();

    expect(open).toHaveBeenCalledWith('https://reports/r?u=42', '_blank', 'noopener,noreferrer');
  });
});

// The suite above stubs the component with Object.create, which never renders the template — and
// that is exactly how NG0910 slipped through: Angular refuses to apply `sandbox` to an iframe whose
// `src` is already set, and the whole element silently fails to render. These tests render for real.
describe(`${ExternalContentComponent.name} template`, () => {
  let entry: IExternalContentEntry | undefined;
  let updateRibbonTemplate: jest.Mock;

  function render(): ComponentFixture<ExternalContentComponent> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ExternalContentComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        { provide: ExternalContentService, useValue: { find: () => of(entry) } },
        {
          provide: ExternalUrlResolverService,
          useValue: {
            isAllowed: (url: string) => url.startsWith('https://'),
            resolve: (url: string) => url.replace('{userName}', 'ada'),
          },
        },
        { provide: TabService, useValue: { updateActiveTabRootTitle: () => undefined } },
        { provide: TabViewService, useValue: { updateRibbonTemplate } },
      ],
    });

    const fixture: ComponentFixture<ExternalContentComponent> = TestBed.createComponent(ExternalContentComponent);
    fixture.detectChanges();

    return fixture;
  }

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    entry = { id: 1, label: 'Monthly report', url: 'https://reports.example.com/r?u={userName}' };
    updateRibbonTemplate = jest.fn();
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders the frame with the sandbox applied, which NG0910 would have prevented', () => {
    const iframe: HTMLIFrameElement = render().nativeElement.querySelector('iframe.external-content-frame');

    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('src')).toBe('https://reports.example.com/r?u=ada');
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-top-navigation');
    expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe.getAttribute('title')).toBe('Monthly report');
  });

  it('publishes its actions to the application ribbon rather than rendering a bar of its own', () => {
    const host: HTMLElement = render().nativeElement;

    expect(host.querySelector('.external-content-toolbar')).toBeNull();

    // The #ribbon template is rendered by DefaultTabViewComponent, not by this component, so what
    // matters here is that the view actually hands it over. Losing this — by dropping the template
    // or breaking the TabViewBase chain — would leave the screen with no way out to a browser tab,
    // and framing refusal is not detectable, so that way out is the whole fallback.
    expect(updateRibbonTemplate).toHaveBeenCalledTimes(1);
    expect(updateRibbonTemplate.mock.calls[0][0]).toBeTruthy();
  });

  it('renders the unavailable state, and no frame, when the destination cannot be recovered', () => {
    entry = undefined;

    const host: HTMLElement = render().nativeElement;

    expect(host.querySelector('iframe')).toBeNull();
    expect(host.textContent).toContain('ExternalContent-Unavailable-Title');
  });

  it('renders the blocked state, and no frame, for a destination that is not an http address', () => {
    entry = { id: 1, label: 'Bad', url: 'javascript:alert(1)' };

    const host: HTMLElement = render().nativeElement;

    expect(host.querySelector('iframe')).toBeNull();
    expect(host.textContent).toContain('ExternalContent-Blocked-Title');
  });
});
