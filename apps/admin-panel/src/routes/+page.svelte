<script lang="ts">
  import { invalidate } from "$app/navigation";

  import Monitor from "./contestant/Monitor.svelte";

  const { data } = $props();

  $effect(() => {
    const interval = setInterval(() => invalidate("home:query"), 10000);

    return () => clearInterval(interval);
  });
</script>

<div class="flex h-full w-full flex-col gap-4 p-4 md:p-10">
  <h1>Monitor</h1>

  <Monitor
    devices={data.devices}
    isAdmin={data.user?.isAdmin ?? false}
    offlineCount={data.offlineCount}
    onlineCount={data.onlineCount}
    showMachineInfo={false}
    totalPages={data.totalPages}
  />
</div>
