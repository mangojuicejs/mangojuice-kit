// @flow
export type Option<ValueType = string> = {
  display: string,
  value: ValueType
};

export type Model<ValueType = string> = {
  +validationState: 'NotAsked' | 'Loading' | 'Ready',
  +validationResult: Array<any>,
  +loadingState: 'NotAsked' | 'Loading' | 'Ready' | 'Error',
  +searchingState: {
    +local: 'Searching' | 'Ready',
    +remote: 'Searching' | 'Ready'
  },
  +options: Array<Option<ValueType>>,
  +filteredIds: ?Array<number>,
  +value: Option<ValueType>,
  +selected: Array<Option<ValueType>>,
  +focus: bool,
  +touched: bool,

  // Computed
  +isSearhing: bool,
  +isOptionsLoaded: bool,
  +isOptionsLoading: bool,
  +isOptionSelected: bool,
  +isValidating: bool,
  +isValid: bool,
  +hasErrors: bool,
  +isLoading: bool,
  +filteredOptions: []
};

export const createModel = <T>(props: Object = {}): Model<T> => ({
  ...props,
  validationState: 'NotAsked',
  validationResult: [],
  searchingState: {
    local: 'Ready',
    remote: 'Ready'
  },
  loadingState: 'NotAsked',
  options: [],
  filteredIds: null,
  initialValue: props.initialValue || { display: '' },
  value: props.value || { display: '' },
  selected: [],
  focus: false,
  touched: false,

  // Computed
  isSearhing: false,
  isOptionsLoaded: false,
  isOptionsLoading: false,
  isOptionSelected: false,
  isValidating: false,
  isValid: false,
  hasErrors: false,
  isLoading: false,
  filteredOptions: []
});
