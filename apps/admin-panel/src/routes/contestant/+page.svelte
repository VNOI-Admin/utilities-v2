<script lang="ts">
  import { invalidate } from "$app/navigation";

  import Monitor from "./Monitor.svelte";

  const { data } = $props();

  const isAdmin = $derived(data.user?.isAdmin ?? false);

  $effect(() => {
    const interval = setInterval(() => invalidate("contestants:query"), 10000);

    return () => clearInterval(interval);
  });
</script>

<div class="flex h-full w-full flex-col gap-2 px-6 py-8">
  <h1>Contestants</h1>

  <Monitor
    allowFilterRole
    devices={data.devices}
    {isAdmin}
    offlineCount={data.offlineCount}
    onlineCount={data.onlineCount}
    showMachineInfo={isAdmin}
    totalPages={data.totalPages}
  />
</div>
