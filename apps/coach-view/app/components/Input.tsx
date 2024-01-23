import type { InputHTMLAttributes } from 'react';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'placeholder'> {
  label: string;
  id: string;
  errorTextId?: string;
  errorText?: string;
  value?: any;
}

export function Input({ id, label, errorText, errorTextId, ...rest }: InputProps) {
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          className="input focus:border-accent-light dark:focus:border-accent-dark dark:bg-neutral-1000 block h-[44px] w-full rounded-lg border border-neutral-400 bg-white
        px-2.5 pt-2.5 text-sm text-black shadow-md transition-opacity
        focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:text-white"
          aria-invalid={!!errorText}
          aria-describedby={errorTextId}
          placeholder=" "
          {...rest}
        />
        <label
          className="label absolute left-2.5 block font-medium transition-all duration-100 ease-in"
          htmlFor={id}
        >
          {label}
        </label>
      </div>
      {!!errorText && errorTextId && (
        <p id={errorTextId} className="text-red-500 dark:text-red-400">
          {errorText}
        </p>
      )}
    </div>
  );
}
