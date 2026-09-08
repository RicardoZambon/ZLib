import { HttpBackend } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { MultiTranslateHttpLoader, TranslationResource } from 'ngx-translate-multi-http-loader';

export interface AngularAssetPattern {
  glob: string;
  input: string;
  output: string;
}

export const ZAMBON_SHARED_I18N_ASSET_PATH = 'assets/i18n/zambon-dev/shared';

export const ZAMBON_SHARED_I18N_ASSET: AngularAssetPattern = {
  glob: '**/*.json',
  input: 'node_modules/@zambon-dev/shared/i18n',
  output: ZAMBON_SHARED_I18N_ASSET_PATH,
};

export const ZAMBON_SHARED_I18N_RESOURCES: TranslationResource[] = [
  { prefix: `/${ZAMBON_SHARED_I18N_ASSET_PATH}/external-content/`, suffix: '.json' },
  { prefix: `/${ZAMBON_SHARED_I18N_ASSET_PATH}/language-selector/`, suffix: '.json' },
  { prefix: `/${ZAMBON_SHARED_I18N_ASSET_PATH}/login/`, suffix: '.json' },
  { prefix: `/${ZAMBON_SHARED_I18N_ASSET_PATH}/operations-history/`, suffix: '.json' },
  { prefix: `/${ZAMBON_SHARED_I18N_ASSET_PATH}/top-bar/`, suffix: '.json' },
];

export interface ZambonSharedTranslateConfig {
  defaultLanguage?: string;
  appResources?: (string | TranslationResource)[];
}

export function createZambonSharedTranslateLoader(
  httpBackend: HttpBackend,
  appResources: (string | TranslationResource)[] = [],
): MultiTranslateHttpLoader {
  return new MultiTranslateHttpLoader(httpBackend, [
    ...ZAMBON_SHARED_I18N_RESOURCES,
    ...appResources,
  ]);
}

export function provideZambonSharedTranslateLoader(
  appResources: (string | TranslationResource)[] = [],
): Provider {
  return {
    provide: TranslateLoader,
    useFactory: (httpBackend: HttpBackend) => createZambonSharedTranslateLoader(httpBackend, appResources),
    deps: [HttpBackend],
  };
}

export function provideZambonSharedTranslateService(
  config: ZambonSharedTranslateConfig = {},
): EnvironmentProviders {
  return provideTranslateService({
    defaultLanguage: config.defaultLanguage,
    loader: provideZambonSharedTranslateLoader(config.appResources),
  });
}
