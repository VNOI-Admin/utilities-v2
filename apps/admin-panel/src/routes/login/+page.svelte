<script>
  import { enhance } from "$app/forms";
  import Button from "$components/Button.svelte";
  import Input from "$components/Input.svelte";

  const { form } = $props();
  let isLoading = $state(false);
</script>

<div class="flex h-full w-full items-center justify-center p-4">
  <div
    class="dark:bg-neutral-1000 flex w-[90dvw] max-w-[500px] items-center gap-6 rounded-lg bg-white p-8 shadow-xl"
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
        errorText={form?.usernameError}
        errorTextId="login-username-error-text"
      />
      <Input
        id="login-password-input"
        label="Password"
        name="password"
        type="password"
        errorText={form?.passwordError}
        errorTextId="login-password-error-text"
      />
      <span>
        <Button as="button" disabled={isLoading} type="submit">Login</Button>
      </span>
      {#if form?.error}
        <p class="text-error">{form.error}</p>
      {/if}
    </form>
  </div>
</div>
