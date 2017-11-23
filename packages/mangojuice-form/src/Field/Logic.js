// @flow
import type { Model } from './Model';
import { LogicBase, cmd, debounce, task, utils } from 'mangojuice-core';


// Types
type MetaType = {
  optionsLoaderTask: ?Function,
  remoteFilterTask: ?Function,
  valueDisplayComparator: Function,
  optionSearcher: Function,
  valuesComparator: Function,
  validatorTask: Function
};


// Utils
const stringValueDisplayComparator = (value: string, display: string) => {
  return (
    utils.is.string(value) &&
    value.toUpperCase() === display.toUpperCase()
  );
};
const stringValuesComparator = (value1, value2) => {
  return utils.is.string(value1) && value1 === value2;
};
const defaultOptionsSearch = (option, display) => {
  const upperDisplay = display.toUpperCase();
  if (
    utils.is.string(option.value) &&
    option.value.toUpperCase().startsWith(upperDisplay)
  ) {
    return -1;
  } else if (option.display.toUpperCase().indexOf(upperDisplay) >= 0) {
    return 1;
  }
  return 0;
};
const defaultValidator = () => [
  // no errors by default
];


/**
 * Logical block for handling form field with autocomplete support
 * and async validation. It also could be used for regular input
 * fields
 */
export default class AutocompleteField extends LogicBase<Model<*>, any, MetaType> {
  config({
    optionsLoaderTask,
    remoteFilterTask,
    valueDisplayComparator = stringValueDisplayComparator,
    optionSearcher = defaultOptionsSearch,
    valuesComparator = stringValuesComparator,
    validatorTask = defaultValidator
  } = {}) {
    return {
      meta: { optionsLoaderTask, remoteFilterTask, valueDisplayComparator,
        optionSearcher, valuesComparator, validatorTask },
      initCommands: [ this.ValidateCurrentValue, this.LoadOptions ]
    };
  }

  computed() {
    const { model } = this;
    return {
      isSearhing: () =>
        model.searchingState.local === 'Searching' ||
        model.searchingState.remote === 'Searching',

      isOptionsLoaded: () =>
        model.loadingState === 'Ready',

      isOptionsLoading: () =>
        model.loadingState === 'Loading',

      isOptionSelected: () =>
        model.value && model.value.value,

      isValidating: () =>
        model.validationState === 'NotAsked' ||
        model.validationState === 'Loading',

      isValid: () =>
        model.validationState === 'Ready' &&
        !model.validationResult.length,

      hasErrors: () =>
        !model.isValidating && !model.isValid && model.touched,

      isLoading: () =>
        model.isValidating || model.isSearhing || model.isOptionsLoading,

      filteredOptions: () => {
        if (model.filteredIds) {
          return model.filteredIds.map(i => model.options[i]);
        }
        return model.options;
      }
    };
  }

  /**
   * Common commands for handling input field changes
   */
  @cmd FocusField() {
    return { focus: true };
  }

  @cmd BlurField() {
    return {
      focus: false,
      touched: true
    };
  }

  @cmd UntouchField() {
    return { touched: false };
  }

  @cmd TouchField() {
    return { touched: true };
  }

  /**
   * Commands for handling flight field, search, loading options, etc
   * @type {Object}
   */
  @cmd LoadOptions() {
    if (!this.meta.optionsLoaderTask) return;
    return [
      this.SetLoadingState('Loading'),
      this.DoLoadOptions()
    ];
  }

  @cmd DoLoadOptions() {
    if (this.meta.optionsLoaderTask) {
      return task(this.meta.optionsLoaderTask)
        .success(this.SuccessLoaded);
    }
  }

  @cmd SuccessLoaded(options) {
    let selectedValue = { display: '' };
    let existingOption = null;

    if (this.model.value.value) {
      existingOption = options.find(x =>
        this.meta.valuesComparator(x.value, this.model.value.value));
    } else {
      existingOption = options.find(x =>
        this.meta.valueDisplayComparator(x.value, this.model.value.display));
      existingOption = existingOption || this.model.value;
    }

    return [
      this.SetOptions(options),
      this.SetValue(existingOption || selectedValue),
      this.SetLoadingState('Ready'),
      this.FilterOptionsLocal()
    ];
  }

  @cmd SetOptions(value) {
    return {
      options: value,
      filteredIds: null
    };
  }

  @cmd SetValue(value) {
    return [
      this.DoSetValue(value),
      this.ValidateCurrentValue()
    ];
  }

  @cmd ResetValue() {
    return this.DoSetValue(this.model.initialValue);
  }

  @cmd DoSetValue(value) {
    return { value };
  }

  @cmd ChangeInput(e) {
    const textVal = e.target.value;
    const newVal = this.model.value.value ? { display: '' } : { display: textVal };
    return [
      this.SetValue(newVal),
      !this.model.focus && this.FocusField,
      this.model.isOptionsLoaded && [
        this.FilterOptionsLocal(),
        this.FilterOptionsRemote()
      ]
    ];
  }

  @cmd SetLoadingState(newState) {
    return { loadingState: newState };
  }

  @cmd SelectItem(i) {
    return [
      this.SetValue(this.model.filteredOptions[i]),
      this.BlurField
    ];
  }

  /**
   * Logic for filtering options locally and remotely
   */
  @cmd FilterOptionsLocal() {
    if (!this.meta.optionsLoaderTask) return;
    return [
      this.SetSearchingState('local', 'Searching'),
      this.DoFilterOptionsLocal()
    ];
  }

  @debounce(330)
  @cmd DoFilterOptionsLocal() {
    let indexes = null;
    const val = this.model.value;

    if (val.value) {
      indexes = [
        this.model.options.findIndex(x => x.value === val.value)
      ];
    } else if (val.display) {
      indexes = this.model.options.reduce((acc, x, i) => {
        const res = this.meta.optionSearcher(x, val.display);
        if (res < 0) {
          acc.unshift(i);
        } else if (res > 0) {
          acc.push(i);
        }
        return acc;
      }, []);
    }

    return [
      this.SetFilteredIndexes(indexes),
      this.SetSearchingState('local', 'Ready')
    ];
  }

  @cmd SetFilteredIndexes(indexes) {
    return { filteredIds: indexes };
  }

  @cmd FilterOptionsRemote() {
    if (!this.meta.remoteFilterTask) return;
    return [
      this.SetSearchingState('remote', 'Searching'),
      this.DoFilterOptionsRemote()
    ];
  }

  @debounce(330)
  @cmd DoFilterOptionsRemote() {
    if (this.meta.remoteFilterTask) {
      return task(this.meta.remoteFilterTask)
        .success(this.SuccessRemoteFiltered);
    }
  }

  @cmd SuccessRemoteFiltered(options) {
    return [
      this.SetOptions(options),
      this.SetSearchingState('remote', 'Ready')
    ];
  }

  @cmd SetSearchingState(name, newState) {
    return { searchingState: {
      ...this.model.searchingState,
      [name]: newState
    } };
  }

  /**
   * Logic for validation of the current value
   */
  @cmd ValidateCurrentValue() {
    return [
      this.SetValidationState('Loading'),
      this.DoValidation()
    ];
  }

  @cmd SetValidationState(newState) {
    return { validationState: newState };
  }

  @cmd SetValidationResult(newResult) {
    return { validationResult: newResult || [] };
  }

  @debounce(330)
  @cmd DoValidation() {
    return task(this.meta.validatorTask)
      .success(this.SuccessValidation)
  }

  @cmd SuccessValidation(errors) {
    return [
      this.SetValidationState('Ready'),
      this.SetValidationResult(errors || [])
    ];
  }
}
