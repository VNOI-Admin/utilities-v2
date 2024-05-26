<script lang="ts">
  import { base } from "$app/paths";
  import { getPingColorClass } from "$lib/getPingColorClass";
  import { getUsageColorClass } from "$lib/getUsageColorClass";

  import type { Device } from "./$page.types";

  interface DeviceInfoProps {
    device: Device;
    isAdmin: boolean;
    showMachineInfo: boolean;
  }

  const { device, isAdmin, showMachineInfo }: DeviceInfoProps = $props();

  const pingColor = $derived(device.ping ? getPingColorClass(device.ping) : undefined);
  const cpuColor = $derived(device.cpu ? getUsageColorClass(device.cpu) : undefined);
  const ramColor = $derived(device.memory ? getUsageColorClass(device.memory) : undefined);
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
  {#if showMachineInfo}
    <td>
      <p>
        {device.vpnIpAddress}
      </p>
    </td>
  {/if}
  <td>
    <p class="select-none">
      {device.isOnline ? "✅" : "❌"}
    </p>
  </td>
  {#if showMachineInfo}
    <td class={pingColor}>
      <p>
        {device.ping || "N/A"} ms
      </p>
    </td>
    <td class={cpuColor}>
      <p>
        {device.cpu || "N/A"}%
      </p>
    </td>
    <td class={ramColor}>
      <p>
        {device.memory || "N/A"}%
      </p>
    </td>
  {/if}
  <td class="[&>*]:inline-block [&>*]:w-full">
    {#if device.isOnline}
      <a class="button filled" href={`${base}/contestant/${device.username}`}>View</a>
    {:else}
      <button class="button filled" disabled>Not Available</button>
    {/if}
  </td>
  {#if isAdmin}
    <td class="[&>*]:inline-block [&>*]:w-full">
      <a class="button filled" href={`${base}/contestant/${device.username}/edit`}>Edit</a>
    </td>
  {/if}
</tr>
