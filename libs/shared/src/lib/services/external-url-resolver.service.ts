import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ICurrentUserInfo } from '../models';
import { AuthenticationService } from './authentication.service';

/**
 * Resolves the runtime placeholders in an external menu URL, and vets the result before it is
 * handed to the browser.
 *
 * Placeholder syntax is `{name}`, case-sensitive, drawn from a **closed** set:
 *
 * | Token        | Source                                              |
 * |--------------|-----------------------------------------------------|
 * | `{email}`    | `ICurrentUserInfo.email`                            |
 * | `{language}` | `TranslateService.currentLang`, then `defaultLang`  |
 * | `{userId}`   | `ICurrentUserInfo.userID`                           |
 * | `{userName}` | `ICurrentUserInfo.username`                         |
 *
 * The set is closed by construction rather than reflected off the stored user info, and that is a
 * security property, not a style choice: `AuthenticationService` persists the entire sign-in
 * response under `userInfo`, tokens included, so a reflective implementation would let a menu URL
 * configured as `?t={token}` hand the JWT to a third party. No authentication token is ever
 * substituted.
 */
@Injectable({
  providedIn: 'root'
})
export class ExternalUrlResolverService {
  //#region Variables
  private authenticationService: AuthenticationService = inject(AuthenticationService);
  private translate: TranslateService = inject(TranslateService);

  /** Placeholder grammar, used only to *detect* tokens this version does not know. */
  private readonly unknownPlaceholderPattern: RegExp = /\{[A-Za-z][A-Za-z0-9_]*\}/g;
  //#endregion

  //#region Properties
  //#endregion

  //#region Constructor and Angular life cycle methods
  //#endregion

  //#region Public methods
  /**
   * Whether `url` is an absolute `http`/`https` address.
   *
   * Rejects relative paths, malformed values, protocol-relative `//host/path` (which throws
   * without a base), and the schemes that would execute rather than navigate: `javascript:`,
   * `data:`, `blob:`, `file:`.
   */
  public isAllowed(url: string): boolean {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      return false;
    }

    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  }

  /**
   * Substitutes every known placeholder, URL-encoding each value.
   *
   * Because every value is percent-encoded, a placeholder must occupy one *whole* value — a full
   * path segment, or a full query-parameter value. Encoding is what stops a display name that
   * contains `&` from injecting an extra query parameter into the destination.
   *
   * A known placeholder with no value becomes an empty string; an unrecognized `{…}` is left
   * exactly as configured, so a report URL that legitimately contains braces is not corrupted.
   */
  public resolve(url: string): string {
    if (!url || url.indexOf('{') === -1) {
      return url;
    }

    const values: Map<string, string> = this.getPlaceholderValues();

    let resolved: string = url;

    values.forEach((value: string, token: string) => {
      if (resolved.indexOf(token) === -1) {
        return;
      }

      if (value.length === 0) {
        console.warn(`External URL placeholder ${token} has no value for the current user; substituting an empty string.`, url);
      }

      // split/join rather than String.replace: replace() interprets `$&` and `$1` in the
      // replacement text, and without a global regex it would only swap the first occurrence.
      resolved = resolved.split(token).join(encodeURIComponent(value));
    });

    this.warnAboutUnknownPlaceholders(url, resolved);

    return resolved;
  }
  //#endregion

  //#region Private methods
  private getPlaceholderValues(): Map<string, string> {
    const user: ICurrentUserInfo | null = this.authenticationService.getUserInfo();

    return new Map<string, string>([
      ['{email}', user?.email ?? ''],
      ['{language}', this.translate.currentLang || this.translate.defaultLang || ''],
      ['{userId}', user?.userID?.toString() ?? ''],
      ['{userName}', user?.username ?? ''],
    ]);
  }

  private warnAboutUnknownPlaceholders(url: string, resolved: string): void {
    const unknown: string[] = resolved.match(this.unknownPlaceholderPattern) ?? [];

    if (unknown.length > 0) {
      console.warn(`External URL contains unrecognized placeholders and was left as configured: ${unknown.join(', ')}`, url);
    }
  }
  //#endregion
}
