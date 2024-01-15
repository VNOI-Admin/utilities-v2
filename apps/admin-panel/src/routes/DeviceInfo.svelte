<script lang="ts">
	import { getPingColorClass } from "$lib/getPingColorClass";
	import { getUsageColorClass } from "$lib/getUsageColorClass";

	import type { Device } from "./-page.types";

	const { device } = $props<{ device: Device }>();

	const pingColor = $derived(getPingColorClass(device.ping)),
		cpuColor = $derived(getUsageColorClass(device.cpu)),
		ramColor = $derived(getUsageColorClass(device.ram));
</script>

<tr>
	<td>
		<a class="link" href={`/contestant/${device.userId}`}>
			<h3>
				{device.userId}
			</h3>
		</a>
	</td>
	<td>
		<h3>
			{device.ip}
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
			{device.ram}%
		</h3>
	</td>
</tr>
