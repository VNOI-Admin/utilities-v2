<script>
  import { enhance } from "$app/forms";
  import Input from "$components/Input.svelte";
  import Select from "$components/Select.svelte";

  const { data, form } = $props();

  let isLoading = $state(false);
</script>

<div class="flex h-full w-full items-center justify-center">
  <div class="flex w-[90vw] max-w-[500px] flex-col gap-3">
    <div class="flex flex-row items-center gap-2">
      <enhanced:img src="$images/VNOI.png" alt="" class="max-h-8 min-h-8 min-w-8 max-w-8"
      ></enhanced:img>
      <h2>VCS</h2>
    </div>
    <h2>Edit contestant</h2>
    <form
      method="POST"
      class="flex flex-col gap-3"
      use:enhance={() => {
        isLoading = true;
        return async ({ update }) => {
          isLoading = false;
          await update();
        };
      }}
    >
      <div class="flex w-full flex-col gap-3 md:flex-row [&>*]:flex-1">
        <Input
          id="edit-username-input"
          label="Username"
          name="username"
          type="text"
          required
          errorText={form?.validationErrors?.username?.join("\n")}
          errorTextId="edit-username-error-text"
          value={data.userId}
        />
        <Input
          id="edit-fullname-input"
          label="Full name"
          name="fullName"
          type="text"
          required
          errorText={form?.validationErrors?.fullName?.join("\n")}
          errorTextId="edit-username-error-text"
          value={data.fullName}
        />
      </div>
      <Input
        id="edit-password-input"
        label="Password"
        name="password"
        type="password"
        required
        errorText={form?.validationErrors?.password?.join("\n")}
        errorTextId="edit-password-error-text"
      />
      <Select
        label="Role"
        id="edit-role-select"
        name="role"
        required
        values={[
          ["admin", "Admin"],
          ["user", "User"],
        ]}
        initialValue={data.role}
      />
      <span>
        <button class="button filled" disabled={isLoading} type="submit">Update</button>
      </span>
      {#if form?.error}
        <p class="text-error">{form.error}</p>
      {/if}
    </form>
  </div>
</div>
