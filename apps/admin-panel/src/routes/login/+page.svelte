<script>
  import { enhance } from "$app/forms";
  import Input from "$components/Input.svelte";

  const { form } = $props();
  let isLoading = $state(false);
</script>

<div class="flex h-full w-full items-center justify-center p-4">
  <div
    class="flex w-[90dvw] max-w-[500px] items-center gap-6 rounded-lg border-[0.5px] border-neutral-300 bg-white p-8 shadow-xl dark:border-neutral-800 dark:bg-neutral-950"
  >
    <form
      method="POST"
      action="?/login"
      class="flex w-full flex-col gap-3"
      use:enhance={() => {
        isLoading = true;
        return async ({ update }) => {
          isLoading = false;
          await update();
        };
      }}
    >
      <h1>Login</h1>
      <Input
        id="login-username-input"
        label="Username"
        name="username"
        type="text"
        required
        errorText={form?.usernameError}
        errorTextId="login-username-error-text"
      />
      <Input
        id="login-password-input"
        label="Password"
        name="password"
        type="password"
        required
        errorText={form?.passwordError}
        errorTextId="login-password-error-text"
      />
      <span>
        <button class="button filled" disabled={isLoading} type="submit">Login</button>
      </span>
      {#if form?.error}
        <p class="text-error">{form.error}</p>
      {/if}
    </form>
  </div>
</div>
