import { provideHttpClient } from '@angular/common/http';
import { APP_INITIALIZER, EnvironmentProviders, Provider } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { APP_CONFIG, AppConfig, AuthService } from '@zambon-dev/framework';
import {
  DataGridConfigsProvider,
  DataGridDataset,
  DataProviderService,
  FormService,
  GridConfigsProvider,
  MultiSelectResultDataset,
} from '@zambon-dev/library';
import { AuthenticationService } from '@zambon-dev/shared';
import { provideTranslateService, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

// Real translations for the keys used across the stories, so the `translate` pipe resolves
// keys to text instead of echoing the key. Keys not listed here fall back to the key itself.
const storybookTranslations: Record<string, Record<string, string>> = {
  en: {
    'TopBar-Sidebar-Toggle': 'Toggle menu',
    'TopBar-Notifications-Title': 'Notifications',
    'TopBar-Notifications-Empty': 'No notifications',
    'TopBar-Notifications-MarkAllRead': 'Mark all as read',
    'Main-Logout': 'Logout',
    'Main-Logout-Modal-Message': 'Are you sure you want to log out?',
    'Main-Logout-Modal-Message-Cancel': 'Cancel',
    'Main-Logout-Modal-Message-Confirm': 'Logout',
    'LanguageSelector-Title': 'Select language',
    'Language-en': 'English',
    'Language-pt': 'Portuguese',
    // Framework button and modal labels — shared by every library's Storybook.
    'Button-Cancel-Edit': 'Cancel',
    'Button-Delete': 'Delete',
    'Button-Edit': 'Edit',
    'Button-Modal-Cancel': 'Cancel',
    'Button-Modal-Close': 'Close',
    // Rendered by lib-multi-editor's own template, so any multi-editor story needs it.
    'Button-Modal-MultiEditor-Confirm': 'Confirm changes',
    'Button-New': 'New',
    'Button-Open-Record': 'Open',
    'Button-Refresh': 'Refresh',
    'Loading': 'Loading',
    'Button-Save': 'Save',
    'Button-Save-And-Close': 'Save & Close',
    'Button-Save-And-New': 'Save & New',
    'Button-Views': 'Views',
    // Export and Filters — copied verbatim from the framework's shipped i18n (libs/framework/src/i18n/en.json).
    'Button-Export': 'Export',
    'Button-Export-Excel': 'Excel',
    'Button-Export-PDF': 'PDF',
    'Button-Export-CSV': 'CSV',
    'Button-Export-XML': 'XML',
    'Button-Export-MHTML': 'Web Archive',
    'Button-Export-LimitExceeded': 'Export exceeds the {{ max }}-row limit. Narrow your filters and try again.',
    'Button-Filters': 'Filter',
    'Button-Filters-Clear': 'Clear filters',
    'Button-Filters-Modal-Confirm': 'Confirm filter',
    'Modal-Delete-Confirm': 'Confirm delete',
    'Modal-Delete-Message': 'You are about to delete records, is not possible to reverse this action. Are you sure you want to continue?',
    'Modal-Delete-Title': 'Confirm the record deletion',
    'Modal-Failed-Administrator': 'If the problem persists, please contact your administrator.',
    'Modal-Failed-DefaultMessage': 'An error occurred in the server. Please try again later.',
    'Modal-Failed-Title': 'An error occurred',
    'Modal-NotFound-Message': 'The requested record was not found.\nIt may have been deleted or the URL may be incorrect.',
    'Modal-NotFound-Title': 'Record not found',
    'RibbonGroup-Page': 'Page',
    // Framework keys still missing from the Storybook translations — Format-DateTime's absence
    // makes DatePipe receive the literal key as its format pattern.
    'Format-Date': 'MM/dd/yyyy',
    'Format-DateTime': 'MM/dd/yyyy hh:mm a',
    'Grid-Loading': 'Loading...',
    'Grid-Message-Empty': 'No results',
    'Grid-Message-Failed': 'Failed to load the data',
    'Grid-Message-LazyLoad': 'Loading more records...',
    'RibbonGroup-Entity': 'Entity',
    'RibbonGroup-General': 'General',
    'Button-Views-Details': 'Details',
    'Button-Views-History': 'History',
    'OperationsHistory-Modal-Title': 'Operation details',
    // Embedded external content — copied verbatim from the shipped i18n (libs/shared/src/i18n/external-content/en.json).
    'ExternalContent-Blocked-Title': 'Cannot be displayed',
    'ExternalContent-Blocked-Message': 'This menu item points to an address that is not allowed. Ask an administrator to review it.',
    'ExternalContent-OpenInNewTab': 'Open in a new browser tab',
    'ExternalContent-SlowHint': 'Still loading. Some sites do not allow being displayed inside another application — try opening it in a new browser tab.',
    'ExternalContent-Unavailable-Title': 'Content unavailable',
    'ExternalContent-Unavailable-Message': 'Reopen this item from the menu to load it.',
    // App Showcase story — sidebar, dashboard, datasets, forms and route titles.
    'Showcase-Region-Main': 'MAIN',
    'Showcase-Region-Administration': 'ADMINISTRATION',
    'Showcase-Region-Reports': 'REPORTS',
    'Showcase-Menus-Dashboard': 'Dashboard',
    'Showcase-Menus-General': 'General',
    'Showcase-Menus-Security': 'Security',
    'Showcase-Menus-Customers': 'Customers',
    'Showcase-Menus-Units': 'Units',
    'Showcase-Menus-Users': 'Users',
    'Showcase-Menus-Reports-NewTab': 'Monthly report',
    'Showcase-Menus-Reports-Embedded': 'Quarterly report',
    'Showcase-Dashboard-Card-Users': 'Users',
    'Showcase-Dashboard-Card-Customers': 'Customers',
    'Showcase-Dashboard-Card-Units': 'Units',
    'Showcase-Dashboard-RecentActivity': 'Recent activity',
    'Showcase-Dashboard-Activity-1': 'Ada Lovelace updated customer Acme Industries',
    'Showcase-Dashboard-Activity-2': 'Alan Turing created unit BR-05 Downtown Branch',
    'Showcase-Dashboard-Activity-3': 'Grace Hopper deactivated user Edsger Dijkstra',
    'Showcase-Dashboard-Activity-4': 'Barbara Liskov exported the customers list',
    'Showcase-Users-Column-Name': 'Name',
    'Showcase-Users-Column-Username': 'Username',
    'Showcase-Users-Column-Email': 'Email',
    'Showcase-Users-Field-Name': 'Name',
    'Showcase-Users-Field-Username': 'Username',
    'Showcase-Users-Field-Email': 'Email',
    'Showcase-Users-Field-IsActive': 'Active',
    'Showcase-Users-Field-MustChangePassword': 'Must change password',
    'Showcase-Users-Validations-Name-Required': 'Name is required',
    'Showcase-Users-Validations-Username-Required': 'Username is required',
    'Showcase-Users-FormGroup-User': 'User',
    'Showcase-Users-Details-Title-New': 'New user',
    'Showcase-Users-Filters-Title': 'Filter users',
    'Showcase-Customers-Column-Name': 'Name',
    'Showcase-Customers-Column-City': 'City',
    'Showcase-Customers-Column-Email': 'Email',
    'Showcase-Customers-Column-IsActive': 'Active',
    'Showcase-Customers-Field-Name': 'Name',
    'Showcase-Customers-Field-Email': 'Email',
    'Showcase-Customers-Field-Phone': 'Phone',
    'Showcase-Customers-Field-IsActive': 'Active',
    'Showcase-Customers-Field-City': 'City',
    'Showcase-Customers-Validations-Name-Required': 'Name is required',
    'Showcase-Customers-FormGroup-Customer': 'Customer',
    'Showcase-Customers-Details-Title-New': 'New customer',
    'Showcase-Customers-Filters-Title': 'Filter customers',
    'Showcase-Addresses-Column-Street': 'Street',
    'Showcase-Addresses-Column-City': 'City',
    'Showcase-Addresses-Column-PostalCode': 'Postal code',
    'Showcase-Addresses-Column-Country': 'Country',
    'Showcase-Addresses-Field-Street': 'Street',
    'Showcase-Addresses-Field-City': 'City',
    'Showcase-Addresses-Field-PostalCode': 'Postal code',
    'Showcase-Addresses-Field-Country': 'Country',
    'Showcase-Addresses-Validations-Street-Required': 'Street is required',
    'Showcase-Addresses-Validations-City-Required': 'City is required',
    'Showcase-Addresses-Modal-Title': 'Customer addresses',
    'Showcase-Addresses-Button-Add': 'Add address',
    'Showcase-Addresses-Button-Remove': 'Remove address',
    'Showcase-Units-Column-Code': 'Code',
    'Showcase-Units-Column-Name': 'Name',
    'Showcase-Units-Column-Description': 'Description',
    'Showcase-Units-Filters-Title': 'Filter units',
    // Shared across entities, unlike the entity-prefixed keys above.
    'Showcase-EditSection-Details': 'Details',
    'Showcase-EditSection-Addresses': 'Addresses',
  },
  pt: {
    'TopBar-Sidebar-Toggle': 'Alternar menu',
    'TopBar-Notifications-Title': 'Notificações',
    'TopBar-Notifications-Empty': 'Nenhuma notificação',
    'TopBar-Notifications-MarkAllRead': 'Marcar todas como lidas',
    'Main-Logout': 'Sair',
    'Main-Logout-Modal-Message': 'Tem certeza de que deseja sair?',
    'Main-Logout-Modal-Message-Cancel': 'Cancelar',
    'Main-Logout-Modal-Message-Confirm': 'Sair',
    'LanguageSelector-Title': 'Selecionar idioma',
    'Language-en': 'Inglês',
    'Language-pt': 'Português',
    // Framework button and modal labels — shared by every library's Storybook.
    'Button-Cancel-Edit': 'Cancelar',
    'Button-Delete': 'Excluir',
    'Button-Edit': 'Editar',
    'Button-Modal-Cancel': 'Cancelar',
    'Button-Modal-Close': 'Fechar',
    'Button-Modal-MultiEditor-Confirm': 'Confirmar alterações',
    'Button-New': 'Novo',
    'Button-Open-Record': 'Abrir',
    'Button-Refresh': 'Atualizar',
    'Loading': 'Carregando',
    'Button-Save': 'Salvar',
    'Button-Save-And-Close': 'Salvar e Fechar',
    'Button-Save-And-New': 'Salvar e Novo',
    'Button-Views': 'Visões',
    // Export and Filters — copied verbatim from the framework's shipped i18n (libs/framework/src/i18n/pt.json).
    'Button-Export': 'Exportar',
    'Button-Export-Excel': 'Excel',
    'Button-Export-PDF': 'PDF',
    'Button-Export-CSV': 'CSV',
    'Button-Export-XML': 'XML',
    'Button-Export-MHTML': 'Arquivo Web',
    'Button-Export-LimitExceeded': 'A exportação ultrapassa o limite de {{ max }} linhas. Refine os filtros e tente novamente.',
    'Button-Filters': 'Filtrar',
    'Button-Filters-Clear': 'Limpar filtros',
    'Button-Filters-Modal-Confirm': 'Confirmar filtros',
    'Modal-Delete-Confirm': 'Confirmar exclusão',
    'Modal-Delete-Message': 'Você está prestes a excluir registros do sistema, não é possível reverter esta ação. Tem certeza que deseja continuar?',
    'Modal-Delete-Title': 'Confirmação da exclusão do registro',
    'Modal-Failed-Administrator': 'Se o problema persistir, por favor, entre em contato com o administrador.',
    'Modal-Failed-DefaultMessage': 'Ocorreu um erro no servidor. Por favor, tente novamente mais tarde.',
    'Modal-Failed-Title': 'Ocorreu um erro',
    'Modal-NotFound-Message': 'O registro solicitado não foi encontrado.\nEle pode ter sido excluído ou a URL pode estar incorreta.',
    'Modal-NotFound-Title': 'Registro não encontrado',
    'RibbonGroup-Page': 'Página',
    // Framework keys still missing from the Storybook translations — Format-DateTime's absence
    // makes DatePipe receive the literal key as its format pattern.
    'Format-Date': 'dd/MM/yyyy',
    'Format-DateTime': 'dd/MM/yyyy HH:mm',
    'Grid-Loading': 'Carregando...',
    'Grid-Message-Empty': 'Nenhum resultado',
    'Grid-Message-Failed': 'Falha ao carregar os dados',
    'Grid-Message-LazyLoad': 'Carregando mais registros...',
    'RibbonGroup-Entity': 'Entidade',
    'RibbonGroup-General': 'Geral',
    'Button-Views-Details': 'Detalhes',
    'Button-Views-History': 'Histórico',
    'OperationsHistory-Modal-Title': 'Detalhes da operação',
    // Embedded external content — copied verbatim from the shipped i18n (libs/shared/src/i18n/external-content/pt.json).
    'ExternalContent-Blocked-Title': 'Não é possível exibir',
    'ExternalContent-Blocked-Message': 'Este item de menu aponta para um endereço não permitido. Peça a um administrador para revisá-lo.',
    'ExternalContent-OpenInNewTab': 'Abrir em nova aba do navegador',
    'ExternalContent-SlowHint': 'Ainda carregando. Alguns sites não permitem ser exibidos dentro de outra aplicação — tente abrir em uma nova aba do navegador.',
    'ExternalContent-Unavailable-Title': 'Conteúdo indisponível',
    'ExternalContent-Unavailable-Message': 'Reabra este item pelo menu para carregá-lo.',
    // App Showcase story — sidebar, dashboard, datasets, forms and route titles.
    'Showcase-Region-Main': 'PRINCIPAL',
    'Showcase-Region-Administration': 'ADMINISTRAÇÃO',
    'Showcase-Region-Reports': 'RELATÓRIOS',
    'Showcase-Menus-Dashboard': 'Painel',
    'Showcase-Menus-General': 'Geral',
    'Showcase-Menus-Security': 'Segurança',
    'Showcase-Menus-Customers': 'Clientes',
    'Showcase-Menus-Units': 'Unidades',
    'Showcase-Menus-Users': 'Usuários',
    'Showcase-Menus-Reports-NewTab': 'Relatório mensal',
    'Showcase-Menus-Reports-Embedded': 'Relatório trimestral',
    'Showcase-Dashboard-Card-Users': 'Usuários',
    'Showcase-Dashboard-Card-Customers': 'Clientes',
    'Showcase-Dashboard-Card-Units': 'Unidades',
    'Showcase-Dashboard-RecentActivity': 'Atividade recente',
    'Showcase-Dashboard-Activity-1': 'Ada Lovelace atualizou o cliente Acme Industries',
    'Showcase-Dashboard-Activity-2': 'Alan Turing criou a unidade BR-05 Downtown Branch',
    'Showcase-Dashboard-Activity-3': 'Grace Hopper desativou o usuário Edsger Dijkstra',
    'Showcase-Dashboard-Activity-4': 'Barbara Liskov exportou a lista de clientes',
    'Showcase-Users-Column-Name': 'Nome',
    'Showcase-Users-Column-Username': 'Usuário',
    'Showcase-Users-Column-Email': 'E-mail',
    'Showcase-Users-Field-Name': 'Nome',
    'Showcase-Users-Field-Username': 'Nome de usuário',
    'Showcase-Users-Field-Email': 'E-mail',
    'Showcase-Users-Field-IsActive': 'Ativo',
    'Showcase-Users-Field-MustChangePassword': 'Deve alterar a senha',
    'Showcase-Users-Validations-Name-Required': 'O nome é obrigatório',
    'Showcase-Users-Validations-Username-Required': 'O usuário é obrigatório',
    'Showcase-Users-FormGroup-User': 'Usuário',
    'Showcase-Users-Details-Title-New': 'Novo usuário',
    'Showcase-Users-Filters-Title': 'Filtrar usuários',
    'Showcase-Customers-Column-Name': 'Nome',
    'Showcase-Customers-Column-City': 'Cidade',
    'Showcase-Customers-Column-Email': 'E-mail',
    'Showcase-Customers-Column-IsActive': 'Ativo',
    'Showcase-Customers-Field-Name': 'Nome',
    'Showcase-Customers-Field-Email': 'E-mail',
    'Showcase-Customers-Field-Phone': 'Telefone',
    'Showcase-Customers-Field-IsActive': 'Ativo',
    'Showcase-Customers-Field-City': 'Cidade',
    'Showcase-Customers-Validations-Name-Required': 'O nome é obrigatório',
    'Showcase-Customers-FormGroup-Customer': 'Cliente',
    'Showcase-Customers-Details-Title-New': 'Novo cliente',
    'Showcase-Customers-Filters-Title': 'Filtrar clientes',
    'Showcase-Addresses-Column-Street': 'Rua',
    'Showcase-Addresses-Column-City': 'Cidade',
    'Showcase-Addresses-Column-PostalCode': 'CEP',
    'Showcase-Addresses-Column-Country': 'País',
    'Showcase-Addresses-Field-Street': 'Rua',
    'Showcase-Addresses-Field-City': 'Cidade',
    'Showcase-Addresses-Field-PostalCode': 'CEP',
    'Showcase-Addresses-Field-Country': 'País',
    'Showcase-Addresses-Validations-Street-Required': 'A rua é obrigatória',
    'Showcase-Addresses-Validations-City-Required': 'A cidade é obrigatória',
    'Showcase-Addresses-Modal-Title': 'Endereços do cliente',
    'Showcase-Addresses-Button-Add': 'Adicionar endereço',
    'Showcase-Addresses-Button-Remove': 'Remover endereço',
    'Showcase-Units-Column-Code': 'Código',
    'Showcase-Units-Column-Name': 'Nome',
    'Showcase-Units-Column-Description': 'Descrição',
    'Showcase-Units-Filters-Title': 'Filtrar unidades',
    // Shared across entities, unlike the entity-prefixed keys above.
    'Showcase-EditSection-Details': 'Detalhes',
    'Showcase-EditSection-Addresses': 'Endereços',
  },
};

class StorybookTranslateLoader implements TranslateLoader {
  public getTranslation(lang: string): Observable<Record<string, string>> {
    return of(storybookTranslations[lang] ?? {});
  }
}

class StorybookDataGridDataset extends DataGridDataset {
  public override columns = [
    { field: 'id', headerName: 'ID', size: '5rem' },
    { field: 'name', headerName: 'Name', size: 'minmax(12rem, 1fr)' },
    { field: 'status', headerName: 'Status', size: '10rem' },
  ];

  public getData(): Observable<any[]> {
    return of([
      { id: 1, name: 'Alpha record', status: 'Active' },
      { id: 2, name: 'Beta record', status: 'Pending' },
      { id: 3, name: 'Gamma record', status: 'Archived' },
    ]);
  }
}

class StorybookMultiSelectResultDataset extends MultiSelectResultDataset {
  public getData(): Observable<any[]> {
    return of([
      { id: 1, name: 'Selected alpha', status: 'Active' },
      { id: 2, name: 'Selected beta', status: 'Pending' },
    ]);
  }

  protected saveData(changedIds: any): Observable<any> {
    return of(changedIds);
  }
}

const dataProviderMock = {
  entityID: 1,
  hasEntityID: true,
  getError$: () => of(),
  getModel$: () => of({ id: 1, name: 'Storybook record' }),
  getTitle: (model: any) => model?.name ?? 'Storybook record',
  resetForNewEntity: () => undefined,
  saveModel: (model: any) => of(model),
  updateModel: () => undefined,
};

const authServiceMock = {
  adminAction: 'AdministrativeMaster',
  authenticate: () => of(undefined),
  checkActionIsAllowed: () => of(true),
  checkActionsAreAllowed: (actions: string[]) => of(actions.map(() => true)),
  getActions: () => of(['AdministrativeMaster']),
  getUserInfo: () => ({ id: 1, name: 'Storybook User', username: 'storybook' }),
  isAuthenticated: true,
  isTokenExpired: false,
  signOut: () => undefined,
  token: 'storybook-token',
  tryRefreshToken: () => of('storybook-token'),
  userID: 1,
};

function initializeTranslate(translateService: TranslateService): () => void {
  return () => {
    translateService.addLangs(['en', 'pt']);
    translateService.setDefaultLang('en');
    translateService.use('en');
  };
}

export const storybookApplicationProviders: Array<Provider | EnvironmentProviders> = [
  provideAnimations(),
  provideHttpClient(),
  provideRouter([]),
  provideTranslateService({
    defaultLanguage: 'en',
    loader: {
      provide: TranslateLoader,
      useClass: StorybookTranslateLoader,
    },
  }),
  {
    provide: APP_INITIALIZER,
    multi: true,
    useFactory: initializeTranslate,
    deps: [TranslateService],
  },
  { provide: APP_CONFIG, useValue: new AppConfig('') },
  JwtHelperService,
  DataGridConfigsProvider,
  { provide: GridConfigsProvider, useExisting: DataGridConfigsProvider },
  FormService,
  { provide: DataGridDataset, useClass: StorybookDataGridDataset },
  { provide: MultiSelectResultDataset, useClass: StorybookMultiSelectResultDataset },
  { provide: DataProviderService, useValue: dataProviderMock },
  { provide: AuthService, useValue: authServiceMock },
  { provide: AuthenticationService, useValue: authServiceMock },
];
