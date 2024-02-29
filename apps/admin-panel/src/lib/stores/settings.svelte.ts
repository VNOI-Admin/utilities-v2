const createSettingsStore = () => {
  let _toastTimeout = $state<number>(null!);
  const saveSettings = <T>(
    key: string,
    value: string,
    validator: (value: string) => T | null,
    set: (value: T) => void,
  ) => {
    const validated = validator(value);
    if (validated !== null) {
      localStorage.setItem(key, value);
      set(validated);
    } else {
      throw new Error(`You provided an invalid '${key}'!`);
    }
  };
  return {
    get toastTimeout(): number {
      return _toastTimeout;
    },
    set toastTimeout(value: string) {
      saveSettings(
        "toastTimeout",
        value,
        (value) => {
          const parsed = Number.parseInt(value);
          if (Number.isNaN(parsed)) {
            return null;
          }
          return parsed;
        },
        (value) => {
          _toastTimeout = value;
        },
      );
    },
  };
};

export const settings = createSettingsStore();
