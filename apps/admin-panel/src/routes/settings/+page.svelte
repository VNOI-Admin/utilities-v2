<script lang="ts">
    import Input from "$components/Input.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { toast } from "$lib/stores/toast.svelte";

  let loading = $state(false);
  let formErrors = $state<Record<string, string | null>>({});

  const saveSettings = (event: SubmitEvent) => {
    const form = event.currentTarget;
    if (!form) return;
    loading = true;
    const data = new FormData(form as HTMLFormElement);
    const toastTimeout = data.get("toast-timeout");
    if (typeof toastTimeout !== "string") {
      return;
    }
    try {
      settings.toastTimeout = toastTimeout;
    } catch (err) {
      if (err instanceof Error) {
        formErrors.toastTimeout = err.message;
      }
    }
    loading = false;
    toast.push({
      variant: "success",
      title: "Settings updated!",
      message: "Settings have been updated successfully.",
      time: Date.now(),
    });
  };

  $effect(() => {
    formErrors;
    const timeout = setTimeout(() => {
      formErrors = {};
    }, 5000);
    return () => clearTimeout(timeout);
  });
</script>

<div class="flex h-full w-full flex-col gap-2 px-6 py-8">
  <h1>Settings</h1>
  <form onsubmit={saveSettings} class="flex w-full flex-col gap-2 overflow-y-auto">
    <div class="settings-item">
      <span class="p-2">Toast timeout</span>
      <div>
        <Input
          id="settings-toast-timeout-input"
          label="Toast timeout"
          name="toast-timeout"
          type="number"
          value={settings.toastTimeout}
          errorText={formErrors.toastTimeout || undefined}
          errorTextId="settings-toast-timeout-error-text"
        />
      </div>
    </div>
    <div>
      <button class="button filled" disabled={loading} type="submit">Save</button>
    </div>
  </form>
</div>
