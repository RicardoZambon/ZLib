import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ICurrentUserInfo } from '../models';
import { AuthenticationService } from './authentication.service';
import { ExternalUrlResolverService } from './external-url-resolver.service';

describe(ExternalUrlResolverService.name, () => {
  let service: ExternalUrlResolverService;
  let translate: { currentLang: string, defaultLang: string };
  let user: ICurrentUserInfo | null;

  function configure(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthenticationService, useValue: { getUserInfo: () => user } },
        { provide: TranslateService, useValue: translate },
      ],
    });

    service = TestBed.inject(ExternalUrlResolverService);
  }

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    translate = { currentLang: 'pt', defaultLang: 'en' };
    user = { costCenterName: 'CC', name: 'Ada Lovelace', email: 'ada@example.com', userID: 42, username: 'ada' };

    configure();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('resolve', () => {
    it('substitutes every supported placeholder', () => {
      const resolved: string = service.resolve('https://reports/r?u={userId}&n={userName}&e={email}&l={language}');

      expect(resolved).toBe('https://reports/r?u=42&n=ada&e=ada%40example.com&l=pt');
    });

    it('substitutes a placeholder that appears more than once', () => {
      expect(service.resolve('https://reports/{language}/r?l={language}')).toBe('https://reports/pt/r?l=pt');
    });

    it('falls back to the default language when no language is active yet', () => {
      translate = { currentLang: '', defaultLang: 'en' };
      configure();

      expect(service.resolve('https://reports/r?l={language}')).toBe('https://reports/r?l=en');
    });

    it('percent-encodes a value so it cannot inject an extra query parameter', () => {
      user = { costCenterName: 'CC', name: 'x', username: 'a&admin=1 b' };
      configure();

      const resolved: string = service.resolve('https://reports/r?n={userName}');

      expect(resolved).toBe('https://reports/r?n=a%26admin%3D1%20b');
      expect(new URL(resolved).searchParams.get('admin')).toBeNull();
      expect(new URL(resolved).searchParams.get('n')).toBe('a&admin=1 b');
    });

    it('substitutes an empty string when a supported placeholder has no value for this user', () => {
      user = { costCenterName: 'CC', name: 'x' };
      configure();

      const resolved: string = service.resolve('https://reports/r?u={userId}&e={email}');

      expect(resolved).toBe('https://reports/r?u=&e=');
      expect(resolved).not.toContain('{');
    });

    it('substitutes an empty string when there is no signed-in user at all', () => {
      user = null;
      configure();

      expect(service.resolve('https://reports/r?u={userId}')).toBe('https://reports/r?u=');
    });

    it('leaves an unrecognized placeholder exactly as configured', () => {
      expect(service.resolve('https://reports/r?x={somethingElse}')).toBe('https://reports/r?x={somethingElse}');
    });

    it('does not corrupt a URL whose braces are legitimate report parameters', () => {
      const url: string = 'https://reports/r?filter={"a":1}&l={language}';

      expect(service.resolve(url)).toBe('https://reports/r?filter={"a":1}&l=pt');
    });

    it('returns a URL that holds no placeholders untouched', () => {
      expect(service.resolve('https://reports/r?a=1')).toBe('https://reports/r?a=1');
    });

    it('returns an empty URL untouched', () => {
      expect(service.resolve('')).toBe('');
    });
  });

  describe('isAllowed', () => {
    it.each([
      ['https://reports.example.com/x', true],
      ['http://reports.example.com', true],
      ['HTTPS://Reports.Example.com/X', true],
      ['javascript:alert(1)', false],
      ['data:text/html,<script>alert(1)</script>', false],
      ['blob:https://example.com/abc', false],
      ['file://server/share/x.pdf', false],
      ['//evil.example.com/x', false],
      ['/security/menus', false],
      ['not a url', false],
      ['', false],
    ])('returns %s -> %s', (url: string, expected: boolean) => {
      expect(service.isAllowed(url)).toBe(expected);
    });
  });
});
