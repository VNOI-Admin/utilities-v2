<script lang="ts">
  import { getPingColorClass } from "$lib/getPingColorClass";
  import { getUsageColorClass } from "$lib/getUsageColorClass";

  import type { Device } from "./$page.types";

  const { device } = $props<{ device: Device }>();

  const pingColor = $derived(getPingColorClass(device.ping)),
    cpuColor = $derived(getUsageColorClass(device.cpu)),
    ramColor = $derived(getUsageColorClass(device.memory));
</script>

<tr>
  <td>
    <a class="link" href={`/contestant/${device.username}`}>
      <h3>
        {device.username}
      </h3>
    </a>
  </td>
  <td>
    <h3>
      {device.vpnIpAddress || "N/A"}
    </h3>
  </td>
  <td>
    <h3>
      {device.isActive ? "✅" : "❌"}
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
</tr>
