<script lang="ts">
	import type { Action } from "svelte/action";

	import { CHART_MAX_LENGTH } from "$lib/constants";
	import CanvasWorker from "$lib/cpuRamChartWorker?worker";
	import { colorScheme } from "$lib/stores/colorScheme";
	import type { CpuRamChartType, CpuRamChartWorkerEvent } from "$lib/types";

	interface CpuRamChartProps {
		chartType: CpuRamChartType;
		chartWidth: number;
		chartHeight: number;
		chartLabel: string;
		chartUsage: number;
	}

	const { chartType, chartWidth, chartHeight, chartLabel, chartUsage }: CpuRamChartProps = $props();

	const initChart: Action<HTMLCanvasElement, number> = (canvas, initialData) => {
		const ctx = canvas.transferControlToOffscreen();

		const canvasWorker = new CanvasWorker();

		canvasWorker.postMessage(
			{
				type: "__INIT_CHART__",
				chartType,
				canvas: ctx,
				width: chartWidth,
				height: chartHeight,
				config: {
					type: "line",
					data: {
						labels: Array(CHART_MAX_LENGTH).fill(" "),
						datasets: [
							{
								label: chartLabel,
								data: [initialData as number],
								borderWidth: 1,
								fill: "start",
							},
						],
					},
					options: {
						scales: {
							y: {
								beginAtZero: true,
							},
						},
						elements: {
							line: {
								tension: 0,
							},
						},
					},
				},
			} satisfies CpuRamChartWorkerEvent,
			[ctx],
		);

		const unsubscribeColorScheme = colorScheme.subscribe((value) => {
			canvasWorker.postMessage({
				type: "__UPDATE_SCHEME__",
				chartType,
				colorScheme: value,
			} satisfies CpuRamChartWorkerEvent);
		});

		return {
			update(newData) {
				canvasWorker.postMessage({
					type: "__UPDATE_CHART__",
					chartType,
					newData,
				} satisfies CpuRamChartWorkerEvent);
			},
			destroy() {
				unsubscribeColorScheme();
				canvasWorker.postMessage({
					type: "__DESTROY_CHART__",
					chartType,
				} satisfies CpuRamChartWorkerEvent);
			},
		};
	};
</script>

<div class="h-full w-full">
	<canvas class="block" use:initChart={chartUsage}></canvas>
</div>
