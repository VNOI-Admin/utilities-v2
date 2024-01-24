<script>
  import Button from "$components/Button.svelte";
  import Input from "$components/Input.svelte";
</script>

<div class="flex h-full w-full items-center justify-center p-4">
  <div
    class="dark:bg-neutral-1000 flex w-[90dvw] max-w-[500px] items-center gap-6 rounded-lg bg-white p-8 shadow-xl"
  >
    <form method="POST" class="flex w-full flex-col gap-3">
      <h1>Login</h1>
      <Input
        label="Username"
        name="username"
        id="login-username-input"
        errorTextId="login-username-error-text"
      />
      <Input
        label="Password"
        name="password"
        id="login-password-input"
        errorTextId="login-password-error-text"
      />
      <span>
        <Button type="submit">Login</Button>
      </span>
    </form>
  </div>
</div>
