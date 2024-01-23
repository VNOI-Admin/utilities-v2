'use client';
import { useFormState, useFormStatus } from 'react-dom';

import { Input } from '../components/Input';
import { login } from './action';

export function Form() {
  const { pending } = useFormStatus();
  const [state, formAction] = useFormState(login, {
    usernameMessages: [],
    passwordMessages: [],
    messages: [],
  });
  return (
    <form action={formAction} className="flex flex-col gap-2 text-lg">
      <div>
        <Input
          type="text"
          name="username"
          id="login-username-input"
          label="Username"
          errorText={
            state.usernameMessages.length > 0 ? state.usernameMessages.join('\n') : undefined
          }
          errorTextId="login-username-error-text"
        />
      </div>
      <div>
        <Input
          type="password"
          name="password"
          id="login-password-input"
          label="Password"
          errorText={
            state.passwordMessages.length > 0 ? state.passwordMessages.join('\n') : undefined
          }
          errorTextId="login-password-error-text"
        />
      </div>
      <button
        disabled={pending}
        className="rounded-md bg-green-300 p-2 text-lg disabled:opacity-50"
        type="submit"
      >
        Login
      </button>
      {state.messages.length > 0 && (
        <p className="text-red-500 dark:text-red-400">{state.messages.join('\n')}</p>
      )}
    </form>
  );
}
