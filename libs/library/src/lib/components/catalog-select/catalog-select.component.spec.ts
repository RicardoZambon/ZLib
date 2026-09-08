import { FormControl, FormGroup } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
import { CatalogSelectComponent } from './catalog-select.component';
import { ICatalogEntry, ICatalogResult } from '../../models';

// Mock CDK portal to avoid real DOM template instantiation.
jest.mock('@angular/cdk/portal', () => ({
  TemplatePortal: jest.fn(),
}));

// Test the logic of CatalogSelectComponent using a minimal instance
// with mocked dependencies (same pattern as button-views.component.spec.ts).

describe('CatalogSelectComponent', () => {
  let component: any;
  let form: FormGroup;
  let mockCatalogService: { search: jest.Mock };
  let mockOverlayRef: {
    detach: jest.Mock;
    dispose: jest.Mock;
    attach: jest.Mock;
    updateSize: jest.Mock;
    overlayElement: { querySelector: jest.Mock };
  };
  let mockOverlay: { create: jest.Mock; scrollStrategies: { reposition: jest.Mock } };
  let originalRAF: typeof requestAnimationFrame;

  const sampleEntries: ICatalogEntry[] = [
    { display: 'Entry 1', value: 1 },
    { display: 'Entry 2', value: 2 },
    { display: 'Entry 3', value: 3 },
    { display: 'Entry 4', value: 4 },
    { display: 'Entry 5', value: 5 },
  ];

  function createApiResult(entries: ICatalogEntry[], shouldUseCriteria: boolean): ICatalogResult {
    return { entries, shouldUseCriteria };
  }

  function setupComponent(options?: {
    searchEndpoint?: string;
    readOnly?: boolean;
    minimumLengthSearch?: number;
    disabled?: boolean;
    apiResult?: ICatalogResult;
  }): void {
    const opts = options ?? {};

    form = new FormGroup({
      testControl: new FormControl(null),
      testDisplayControl: new FormControl(''),
    });

    if (opts.disabled) {
      form.disable();
    }

    const apiResult: ICatalogResult = opts.apiResult ?? createApiResult([], false);
    mockCatalogService = {
      search: jest.fn().mockReturnValue(of(apiResult)),
    };

    mockOverlayRef = {
      detach: jest.fn(),
      dispose: jest.fn(),
      attach: jest.fn(),
      updateSize: jest.fn(),
      overlayElement: { querySelector: jest.fn().mockReturnValue(null) },
    };

    const mockPositionStrategy: any = { withPositions: jest.fn().mockReturnThis() };
    const mockPositionBuilder: any = {
      flexibleConnectedTo: jest.fn().mockReturnValue(mockPositionStrategy),
    };

    mockOverlay = {
      create: jest.fn().mockReturnValue(mockOverlayRef),
      scrollStrategies: { reposition: jest.fn() },
    };

    component = Object.create(CatalogSelectComponent.prototype);

    // BaseComponent
    component.destroy$ = new Subject();

    // Inputs
    component.controlName = 'testControl';
    component.displayControlName = 'testDisplayControl';
    component.minimumLengthSearch = opts.minimumLengthSearch ?? 3;
    component.readOnly = opts.readOnly ?? false;
    component.maxEntries = 100;
    component.autofocus = false;
    component.label = 'Test';
    component.notes = '';
    component.validations = {};
    component.displayProperty = 'display';
    component.valueProperty = 'value';
    component.searchEndpoint = opts.searchEndpoint;

    // Internal state
    component.displayedEntries = [];
    component.focusedIndex = -1;
    component.isDropDownShown = false;
    component.isFocused = false;
    component.isLoading = false;
    component.selectedValue = undefined;
    component.shouldUseCriteria = false;
    component.showFailureMessage = false;
    component.showMinimumCharactersMessage = false;
    component.showNoResultsMessage = false;
    component._entriesList = undefined;
    component._filters = {};
    component.entriesDataSource = [];
    component.isDataInitialized = false;
    component.isSubscriptionInitialized = false;
    component.lastCriteriaUsed = null;
    component.wasClickedOutside = false;
    component.instanceId = 0;
    component.searchSubject = new Subject();
    component.overlayRef = undefined;

    // Inject mocks
    (component as any).catalogService = mockCatalogService;
    (component as any).dataGridDataset = null;
    (component as any).formGroup = { form };
    (component as any).formGroupName = null;
    (component as any).keyValueDiffers = {
      find: jest.fn().mockReturnValue({
        create: jest.fn().mockReturnValue({ diff: jest.fn().mockReturnValue(null) }),
      }),
    };
    (component as any).overlay = mockOverlay;
    (component as any).positionBuilder = mockPositionBuilder;
    (component as any).viewContainerRef = {};
    (component as any).inputElement = {
      nativeElement: {
        getBoundingClientRect: jest.fn().mockReturnValue({ width: 200 }),
        querySelector: jest.fn().mockReturnValue(null),
      },
    };
    (component as any).dropdownTemplate = {};
  }

  function initComponent(): void {
    component.ngOnInit();
  }

  function openDropdown(): void {
    component.onContainerFocus();
  }

  function closeDropdown(): void {
    component.isDropDownShown = false;
    component.focusedIndex = -1;
  }

  function keyDown(key: string): void {
    const event: any = { key, preventDefault: jest.fn(), stopPropagation: jest.fn() };
    component.onKeyDown(event);
    return event;
  }

  beforeEach(() => {
    originalRAF = global.requestAnimationFrame;
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => { cb(0); return 0; }) as any;
  });

  afterEach(() => {
    if (component?.destroy$) {
      component.destroy$.next(true);
      component.destroy$.complete();
    }
    global.requestAnimationFrame = originalRAF;
    jest.restoreAllMocks();
  });

  //#region Initialization
  describe('initialization', () => {
    it('should add display control to form if it does not exist', () => {
      form = new FormGroup({
        testControl: new FormControl(null),
      });

      setupComponent();
      (component as any).formGroup = { form };
      initComponent();

      expect(form.get('testDisplayControl')).toBeTruthy();
    });

    it('should not overwrite existing display control', () => {
      setupComponent();
      const displayControl: FormControl = form.get('testDisplayControl') as FormControl;
      displayControl.setValue('Existing');

      initComponent();

      expect((form.get('testDisplayControl') as FormControl).value).toBe('Existing');
    });

    it('should trigger initial search on init', () => {
      setupComponent({ searchEndpoint: '/api/search' });
      initComponent();

      expect(mockCatalogService.search).toHaveBeenCalledTimes(1);
    });

    it('should set shouldUseCriteria from initial API response', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], true),
      });
      initComponent();

      expect(component.shouldUseCriteria).toBe(true);
    });

    it('should set showMinimumCharactersMessage when shouldUseCriteria is true and entries are empty', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], true),
      });
      initComponent();

      expect(component.showMinimumCharactersMessage).toBe(true);
    });

    it('should set showMinimumCharactersMessage based on empty entries even when shouldUseCriteria is false', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], false),
      });
      initComponent();

      // The property is set based on empty entries; the template guards display with shouldUseCriteria.
      expect(component.showMinimumCharactersMessage).toBe(true);
      expect(component.shouldUseCriteria).toBe(false);
    });

    it('should populate displayedEntries from API response', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();

      expect(component.displayedEntries).toEqual(sampleEntries);
    });

    it('should not set showNoResultsMessage when showMinimumCharactersMessage is already true', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], false),
      });
      initComponent();

      // showMinimumCharactersMessage is true (empty entries), which prevents showNoResultsMessage.
      expect(component.showMinimumCharactersMessage).toBe(true);
      expect(component.showNoResultsMessage).toBe(false);
    });

    it('should set showNoResultsMessage when entries are empty and no other message is active', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
      mockCatalogService.search.mockClear();
      mockCatalogService.search.mockReturnValue(of(createApiResult([], false)));

      // Trigger a new search (isDataInitialized is already true, so showMinimumCharactersMessage won't be set again)
      component.searchSubject.next('xyz');

      expect(component.showNoResultsMessage).toBe(true);
    });

    it('should only set shouldUseCriteria on first API response (isDataInitialized guard)', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();

      expect(component.shouldUseCriteria).toBe(false);

      // Simulate a second API response with shouldUseCriteria: true
      mockCatalogService.search.mockReturnValue(of(createApiResult([], true)));
      component.searchSubject.next('abc');

      expect(component.shouldUseCriteria).toBe(false);
    });

    it('should restore form disabled state if it was disabled before init', () => {
      setupComponent({ disabled: true });
      initComponent();

      expect(form.disabled).toBe(true);
    });
  });
  //#endregion

  //#region Dropdown opening
  describe('dropdown opening', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
    });

    it('should open dropdown on focus', () => {
      component.onContainerFocus();

      expect(component.isDropDownShown).toBe(true);
      expect(component.isFocused).toBe(true);
    });

    it('should open dropdown on click', () => {
      component.onContainerClick();

      expect(component.isDropDownShown).toBe(true);
    });

    it('should not open dropdown on focus when readOnly', () => {
      component.readOnly = true;

      component.onContainerFocus();

      expect(component.isDropDownShown).toBe(false);
    });

    it('should allow opening dropdown on click when readOnly (viewing entries)', () => {
      component.readOnly = true;

      component.onContainerClick();

      expect(component.isDropDownShown).toBe(true);
    });

    it('should not open dropdown when form is disabled', () => {
      form.disable();

      component.onContainerFocus();

      expect(component.isDropDownShown).toBe(false);
    });

    it('should not open dropdown when control is disabled', () => {
      form.get('testControl')!.disable();

      component.onContainerFocus();

      expect(component.isDropDownShown).toBe(false);
    });

    it('should not re-open dropdown if already shown (click)', () => {
      component.onContainerClick();
      expect(mockOverlay.create).toHaveBeenCalledTimes(1);

      component.onContainerClick();
      expect(mockOverlay.create).toHaveBeenCalledTimes(1);
    });

    it('should open dropdown on ArrowDown when closed', () => {
      keyDown('ArrowDown');

      expect(component.isDropDownShown).toBe(true);
    });
  });
  //#endregion

  //#region Dropdown closing
  describe('dropdown closing', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
      openDropdown();
    });

    it('should close dropdown on Escape', () => {
      keyDown('Escape');

      expect(component.isDropDownShown).toBe(false);
    });

    it('should close dropdown on Tab', () => {
      keyDown('Tab');

      expect(component.isDropDownShown).toBe(false);
    });

    it('should reset focusedIndex on close', () => {
      component.focusedIndex = 2;
      keyDown('Escape');

      expect(component.focusedIndex).toBe(-1);
    });

    it('should dispose overlay on close', () => {
      keyDown('Escape');

      expect(mockOverlayRef.detach).toHaveBeenCalled();
      expect(mockOverlayRef.dispose).toHaveBeenCalled();
    });

    it('should clean up stale overlay when opening a new one', () => {
      const firstOverlayRef: any = component.overlayRef;
      closeDropdown();
      // Simulate stale overlayRef still present
      component.overlayRef = firstOverlayRef;

      openDropdown();

      expect(firstOverlayRef.detach).toHaveBeenCalled();
      expect(firstOverlayRef.dispose).toHaveBeenCalled();
    });
  });
  //#endregion

  //#region Keyboard navigation
  describe('keyboard navigation', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
      openDropdown();
    });

    it('should move focusedIndex down on ArrowDown', () => {
      keyDown('ArrowDown');
      expect(component.focusedIndex).toBe(0);

      keyDown('ArrowDown');
      expect(component.focusedIndex).toBe(1);
    });

    it('should not exceed last entry on ArrowDown', () => {
      component.focusedIndex = sampleEntries.length - 1;

      keyDown('ArrowDown');

      expect(component.focusedIndex).toBe(sampleEntries.length - 1);
    });

    it('should move focusedIndex up on ArrowUp', () => {
      component.focusedIndex = 3;

      keyDown('ArrowUp');

      expect(component.focusedIndex).toBe(2);
    });

    it('should not go below 0 on ArrowUp', () => {
      component.focusedIndex = 0;

      keyDown('ArrowUp');

      expect(component.focusedIndex).toBe(0);
    });

    it('should select focused item on Enter', () => {
      component.focusedIndex = 2;

      keyDown('Enter');

      expect(form.get('testControl')!.value).toBe(3);
    });

    it('should not select on Enter when no item is focused', () => {
      component.focusedIndex = -1;

      keyDown('Enter');

      expect(form.get('testControl')!.value).toBeNull();
    });

    it('should close dropdown on Enter after selecting', () => {
      component.focusedIndex = 0;

      keyDown('Enter');

      expect(component.isDropDownShown).toBe(false);
    });
  });
  //#endregion

  //#region Selection
  describe('selection', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
      openDropdown();
    });

    it('should set formControl value on item click', () => {
      component.onDropDownItemClick(sampleEntries[2]);

      expect(form.get('testControl')!.value).toBe(3);
    });

    it('should set displayControl value on item click', () => {
      component.onDropDownItemClick(sampleEntries[2]);

      expect(form.get('testDisplayControl')!.value).toBe('Entry 3');
    });

    it('should mark controls as dirty and touched on item click', () => {
      component.onDropDownItemClick(sampleEntries[0]);

      expect(form.get('testControl')!.dirty).toBe(true);
      expect(form.get('testControl')!.touched).toBe(true);
      expect(form.get('testDisplayControl')!.dirty).toBe(true);
    });

    it('should close dropdown after item click', () => {
      component.onDropDownItemClick(sampleEntries[0]);

      expect(component.isDropDownShown).toBe(false);
    });

    it('should close dropdown on message click', () => {
      component.onDropDownMessageClick();

      expect(component.isDropDownShown).toBe(false);
    });
  });
  //#endregion

  //#region Clear button
  describe('clear', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
      openDropdown();
      component.onDropDownItemClick(sampleEntries[2]);
    });

    it('should reset formControl and displayControl on clear', () => {
      const event: any = { stopPropagation: jest.fn() };
      component.onClearClick(event);

      expect(form.get('testControl')!.value).toBeNull();
      expect(form.get('testDisplayControl')!.value).toBe('');
    });

    it('should reset selectedValue on clear', () => {
      const event: any = { stopPropagation: jest.fn() };
      component.onClearClick(event);

      expect(component.selectedValue).toBeNull();
    });

    it('should stop event propagation on clear', () => {
      const event: any = { stopPropagation: jest.fn() };
      component.onClearClick(event);

      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should show clear button when value is selected and not readOnly', () => {
      expect(component.showClearButton).toBe(true);
    });

    it('should not show clear button when readOnly', () => {
      component.readOnly = true;

      expect(component.showClearButton).toBe(false);
    });

    it('should not show clear button when no value is selected', () => {
      component.selectedValue = null;

      expect(component.showClearButton).toBe(false);
    });
  });
  //#endregion

  //#region Focus on selected item (edge case)
  describe('focusedIndex starts at selected item', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
    });

    it('should set focusedIndex to selected entry when dropdown opens', () => {
      // Select entry 3 (index 2)
      openDropdown();
      component.onDropDownItemClick(sampleEntries[2]);

      // Reopen dropdown
      openDropdown();

      expect(component.focusedIndex).toBe(2);
    });

    it('should set focusedIndex to -1 when no entry is selected', () => {
      openDropdown();

      expect(component.focusedIndex).toBe(-1);
    });

    it('should move from selected item to next on ArrowDown', () => {
      // Select entry 3 (index 2)
      openDropdown();
      component.onDropDownItemClick(sampleEntries[2]);

      // Reopen and press ArrowDown
      openDropdown();
      keyDown('ArrowDown');

      expect(component.focusedIndex).toBe(3);
    });

    it('should move from selected item to previous on ArrowUp', () => {
      // Select entry 3 (index 2)
      openDropdown();
      component.onDropDownItemClick(sampleEntries[2]);

      // Reopen and press ArrowUp
      openDropdown();
      keyDown('ArrowUp');

      expect(component.focusedIndex).toBe(1);
    });

    it('should scroll selected item into view when dropdown opens', () => {
      openDropdown();
      component.onDropDownItemClick(sampleEntries[3]);

      const scrollElement: HTMLElement = document.createElement('li');
      scrollElement.scrollIntoView = jest.fn();
      mockOverlayRef.overlayElement.querySelector.mockReturnValue(scrollElement);

      openDropdown();

      expect(global.requestAnimationFrame).toHaveBeenCalled();
      expect(scrollElement.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('should not scroll when no item is selected', () => {
      openDropdown();

      expect(component.focusedIndex).toBe(-1);
      expect(mockOverlayRef.overlayElement.querySelector).not.toHaveBeenCalled();
    });
  });
  //#endregion

  //#region shouldUseCriteria and minimum characters message
  describe('shouldUseCriteria message behavior', () => {
    it('should show minimum characters message when shouldUseCriteria is true and criteria is short', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], true),
        minimumLengthSearch: 3,
      });
      initComponent();

      expect(component.shouldUseCriteria).toBe(true);
      expect(component.showMinimumCharactersMessage).toBe(true);
    });

    it('should re-evaluate minimum characters message when opening dropdown with shouldUseCriteria', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], true),
      });
      initComponent();

      // Simulate messages being incorrectly cleared
      component.showMinimumCharactersMessage = false;

      openDropdown();

      expect(component.showMinimumCharactersMessage).toBe(true);
    });

    it('should not re-evaluate message when not shouldUseCriteria', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();

      component.showMinimumCharactersMessage = false;

      openDropdown();

      expect(component.showMinimumCharactersMessage).toBe(false);
    });

    it('should not show minimum characters message when criteria meets minimum length', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], true),
        minimumLengthSearch: 3,
      });
      initComponent();

      // Simulate typing enough characters
      (form.get('testDisplayControl') as FormControl).setValue('abc', { emitEvent: false });

      openDropdown();

      expect(component.showMinimumCharactersMessage).toBe(false);
    });

    it('should not reset messages from tap when component is not focused', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], true),
      });
      initComponent();

      expect(component.showMinimumCharactersMessage).toBe(true);

      // Simulate programmatic display control value change (e.g., parent form patch)
      // while not focused — messages should not be reset
      component.isFocused = false;
      (form.get('testDisplayControl') as FormControl).setValue('patched');

      expect(component.showMinimumCharactersMessage).toBe(true);
    });
  });
  //#endregion

  //#region Search with API endpoint
  describe('search with API endpoint', () => {
    it('should call catalogService.search with correct parameters', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();

      expect(mockCatalogService.search).toHaveBeenCalledWith(
        '/api/search', 100, '', {}
      );
    });

    it('should short-circuit API call when criteria is below minimum length and shouldUseCriteria', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], true),
      });
      initComponent();
      mockCatalogService.search.mockClear();

      // Trigger search with short criteria
      component.shouldUseCriteria = true;
      component.searchSubject.next('ab');

      expect(mockCatalogService.search).not.toHaveBeenCalled();
      expect(component.showMinimumCharactersMessage).toBe(true);
    });

    it('should call API when criteria meets minimum length', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult([], true),
      });
      initComponent();
      mockCatalogService.search.mockClear();
      mockCatalogService.search.mockReturnValue(of(createApiResult([sampleEntries[0]], true)));

      component.searchSubject.next('abc');

      expect(mockCatalogService.search).toHaveBeenCalledWith(
        '/api/search', 100, 'abc', {}
      );
    });

    it('should show failure message on API error', () => {
      setupComponent({ searchEndpoint: '/api/search' });
      mockCatalogService.search.mockReturnValue(throwError(() => new Error('Server error')));

      initComponent();

      expect(component.showFailureMessage).toBe(true);
      expect(component.displayedEntries).toEqual([]);
    });

    it('should re-initialize search subscription after error to allow retry', () => {
      setupComponent({ searchEndpoint: '/api/search' });
      mockCatalogService.search.mockReturnValue(throwError(() => new Error('Server error')));

      initComponent();

      // After error, retry via error click (which calls refreshSearch → applySearchCriteria → resets messages)
      mockCatalogService.search.mockReturnValue(of(createApiResult(sampleEntries, false)));
      component.onDropDownErrorClick();

      expect(component.displayedEntries).toEqual(sampleEntries);
      expect(component.showFailureMessage).toBe(false);
    });
  });
  //#endregion

  //#region Search with local entries
  describe('display after a form reset', () => {
    // FormService.resetForm clears every control and then patches the model back. When the
    // stored value equals the control's initial value the value never changes, so the display
    // has to be restored on its own account; otherwise the field renders empty.
    function resetAndPatch(value: any): void {
      form.reset();
      form.patchValue({ testControl: value });
    }

    it('should restore the display when the value equals the initial value', () => {
      setupComponent();

      // The control has to carry the value as its initial one, so that the reset puts the very
      // same value back and the component sees no change. Rebuilt after setupComponent because
      // that helper installs a form of its own.
      form = new FormGroup({
        testControl: new FormControl(0, { nonNullable: true }),
        testDisplayControl: new FormControl(''),
      });
      (component as any).formGroup = { form };
      component._entriesList = [{ display: 'None', value: 0 }, ...sampleEntries];
      initComponent();
      expect(form.get('testDisplayControl')?.value).toBe('None');

      resetAndPatch(0);

      expect(form.get('testDisplayControl')?.value).toBe('None');
    });

    it('should restore the display when the value differs from the initial value', () => {
      setupComponent();
      component._entriesList = sampleEntries;
      initComponent();

      resetAndPatch(2);

      expect(form.get('testDisplayControl')?.value).toBe('Entry 2');
    });
  });

  describe('search with local entries', () => {
    it('should filter local entries by display text', () => {
      setupComponent();
      component._entriesList = sampleEntries;
      initComponent();

      component.searchSubject.next('Entry 3');

      expect(component.displayedEntries).toEqual([{ display: 'Entry 3', value: 3 }]);
    });

    it('should show all entries when criteria is empty', () => {
      setupComponent();
      component._entriesList = sampleEntries;
      initComponent();

      expect(component.displayedEntries).toEqual(sampleEntries);
    });

    it('should show no results message when filter matches nothing', () => {
      setupComponent();
      component._entriesList = sampleEntries;
      initComponent();

      component.searchSubject.next('nonexistent');

      expect(component.displayedEntries).toEqual([]);
      expect(component.showNoResultsMessage).toBe(true);
    });

    it('should filter case-insensitively', () => {
      setupComponent();
      component._entriesList = sampleEntries;
      initComponent();

      component.searchSubject.next('entry 2');

      expect(component.displayedEntries).toEqual([{ display: 'Entry 2', value: 2 }]);
    });
  });
  //#endregion

  //#region Focus and blur
  describe('focus and blur', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
    });

    it('should set isFocused on focus', () => {
      component.onContainerFocus();

      expect(component.isFocused).toBe(true);
    });

    it('should unset isFocused on blur', () => {
      component.onContainerFocus();
      component.onContainerBlur();

      expect(component.isFocused).toBe(false);
    });

    it('should open dropdown when gaining focus via Tab (not just click)', () => {
      // Simulate Tab focus — only fires focus, not click
      component.onContainerFocus();

      expect(component.isDropDownShown).toBe(true);
    });
  });
  //#endregion

  //#region Outside click handling
  describe('outside click handling', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
      openDropdown();
    });

    it('should mark wasClickedOutside on mousedown outside the dropdown', () => {
      const target: HTMLElement = document.createElement('div');
      target.closest = jest.fn().mockReturnValue(null);

      const event: any = { target, button: 0 };
      component.bodyMouseDown(event);

      expect(component.wasClickedOutside).toBe(true);
    });

    it('should not mark wasClickedOutside when clicking inside dropdown-container', () => {
      const container: HTMLElement = document.createElement('div');
      const target: HTMLElement = document.createElement('li');
      target.closest = jest.fn().mockImplementation((selector: string) => {
        if (selector === '.dropdown-container') {
          return container;
        }
        return null;
      });

      const event: any = { target, button: 0 };
      component.bodyMouseDown(event);

      expect(component.wasClickedOutside).toBe(false);
    });

    it('should close dropdown on mouseup after outside mousedown', () => {
      component.wasClickedOutside = true;

      const event: any = {};
      component.bodyMouseUp(event);

      expect(component.isDropDownShown).toBe(false);
      expect(component.wasClickedOutside).toBe(false);
    });
  });
  //#endregion

  //#region Aria attributes
  describe('ARIA attributes', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
    });

    it('should return correct activeDescendantId when focused', () => {
      component.focusedIndex = 2;

      expect(component.activeDescendantId).toBe('catalog-select-0-option-2');
    });

    it('should return null activeDescendantId when no item is focused', () => {
      component.focusedIndex = -1;

      expect(component.activeDescendantId).toBeNull();
    });

    it('should return correct listboxId', () => {
      expect(component.listboxId).toBe('catalog-select-0-listbox');
    });

    it('should return correct option ID', () => {
      expect(component.getOptionId(3)).toBe('catalog-select-0-option-3');
    });
  });
  //#endregion

  //#region Form control sync
  describe('form control synchronization', () => {
    beforeEach(() => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
    });

    it('should update selectedValue when formControl value changes', () => {
      form.get('testControl')!.setValue(3);

      expect(component.selectedValue).toBe(3);
    });

    it('should reset display control when formControl is set to null (API mode)', () => {
      form.get('testControl')!.setValue(3);
      form.get('testControl')!.setValue(null);

      expect(form.get('testDisplayControl')!.value).toBeNull();
    });

    it('should update display control from local entries when formControl changes', () => {
      setupComponent();
      component._entriesList = sampleEntries;
      initComponent();

      form.get('testControl')!.setValue(2);

      expect(form.get('testDisplayControl')!.value).toBe('Entry 2');
    });

    it('should sync display control on init when form control already has a value (local entries)', () => {
      setupComponent();
      component._entriesList = sampleEntries;

      // Set the form control value BEFORE initializing the component,
      // simulating the scenario where the model was loaded before the
      // catalog-select component was created (e.g., direct URL navigation to a sub-view).
      form.get('testControl')!.setValue(3);

      initComponent();

      expect(component.selectedValue).toBe(3);
      expect(form.get('testDisplayControl')!.value).toBe('Entry 3');
    });
  });
  //#endregion

  //#region Destroy cleanup
  describe('destroy', () => {
    it('should close dropdown overlay on destroy', () => {
      setupComponent({
        searchEndpoint: '/api/search',
        apiResult: createApiResult(sampleEntries, false),
      });
      initComponent();
      openDropdown();

      component.ngOnDestroy();

      expect(component.isDropDownShown).toBe(false);
      expect(mockOverlayRef.detach).toHaveBeenCalled();
      expect(mockOverlayRef.dispose).toHaveBeenCalled();
    });
  });
  //#endregion
});
