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
    <p>
      {device.username}
    </p>
  </td>
  <td>
    <p>
      {device.fullName}
    </p>
  </td>
  <td>
    <p>
      {device.vpnIpAddress || "N/A"}
    </p>
  </td>
  <td>
    <p>
      {device.isOnline ? "✅" : "❌"}
    </p>
  </td>
  <td class={pingColor}>
    <p>
      {device.ping} ms
    </p>
  </td>
  <td class={cpuColor}>
    <p>
      {device.cpu}%
    </p>
  </td>
  <td class={ramColor}>
    <p>
      {device.memory}%
    </p>
  </td>
  <td class="[&>*]:inline-block [&>*]:w-full">
    {#if device.isOnline}
      <Button as="a" href={`${base}/contestant/${device.username}`}>View</Button>
    {:else}
      <Button as="button" disabled>Not Available</Button>
    {/if}
  </td>
</tr>
