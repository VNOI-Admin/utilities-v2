<script lang="ts">
  import { base } from "$app/paths";
  import Button from "$components/Button.svelte";
  import { getPingColorClass } from "$lib/getPingColorClass";
  import { getUsageColorClass } from "$lib/getUsageColorClass";

  import type { Device } from "./$page.types";

  const { device } = $props<{ device: Device }>();

  const pingColor = $derived(getPingColorClass(device.ping));
  const cpuColor = $derived(getUsageColorClass(device.cpu));
  const ramColor = $derived(getUsageColorClass(device.memory));
</script>

<tr>
  <td>
    <h3>
      {device.username}
    </h3>
  </td>
  <td>
    <h3>
      {device.vpnIpAddress || "N/A"}
    </h3>
  </td>
  <td>
    <h3>
      {device.isOnline ? "✅" : "❌"}
    </h3>
  </td>
  <td class={pingColor}>
    <h3>
      {device.ping} ms
    </h3>
  </td>
  <td class={cpuColor}>
    <h3>
      {device.cpu}%
    </h3>
  </td>
  <td class={ramColor}>
    <h3>
      {device.memory}%
    </h3>
  </td>
  <td class="[&>*]:inline-block [&>*]:w-full">
    {#if device.isOnline}
      <Button as="a" href={`${base}/contestant/${device.username}`}>View</Button>
    {:else}
      <span class="text-center">Not Available</span>
    {/if}
  </td>
</tr>
