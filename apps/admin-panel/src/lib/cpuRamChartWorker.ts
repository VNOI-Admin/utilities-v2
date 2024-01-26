// Since we are not doing anything too complex, repeating code seems fine for now.
import {
	CategoryScale,
	Chart,
	Filler,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
} from "chart.js";

import { CHART_MAX_LENGTH } from "./constants";
import type { CpuRamChartType, CpuRamChartWorkerEvent } from "./types";

Chart.register(LineController, LinearScale, CategoryScale, PointElement, LineElement, Filler);

Chart.defaults.elements.point.pointStyle = "circle";
Chart.defaults.elements.point.radius = 0;

const charts: Record<CpuRamChartType, Chart<"line", number[], string> | undefined> = {
	cpu: undefined,
	ram: undefined,
};

onmessage = (event: MessageEvent<CpuRamChartWorkerEvent>) => {
	switch (event.data.type) {
		case "__INIT_CHART__": {
			const { chartType, canvas, width, height, config } = event.data;

			charts[chartType] = new Chart(canvas as unknown as HTMLCanvasElement, config);

			// Resizing the chart must be done manually, since OffscreenCanvas does not include event listeners.
			canvas.width = width;
			canvas.height = height;

			charts[chartType]?.resize();
			break;
		}
		case "__UPDATE_CHART__": {
			const { chartType, newData } = event.data;
			const chart = charts[chartType];
			if (chart !== undefined) {
				const newDataset = [...chart.data.datasets[0].data, newData];
				if (newDataset.length > CHART_MAX_LENGTH) {
					chart.data.datasets[0].data = newDataset.slice(
						newDataset.length - CHART_MAX_LENGTH,
					);
				} else {
					chart.data.datasets[0].data = newDataset;
				}
				chart.update("none");
			}
			break;
		}
		case "__UPDATE_SCHEME__": {
			const { colorScheme, chartType } = event.data;
			const chart = charts[chartType];
			if (chart !== undefined) {
				switch (colorScheme) {
					case "dark": {
						(chart.options.backgroundColor as unknown as string[]) = [
							"rgba(255, 99, 132, 0.2)",
							"rgba(54, 162, 235, 0.2)",
							"rgba(255, 206, 86, 0.2)",
							"rgba(75, 192, 192, 0.2)",
							"rgba(153, 102, 255, 0.2)",
							"rgba(255, 159, 64, 0.2)",
						];
						(chart.options.borderColor as unknown as string[]) = [
							"rgba(255, 99, 132, 1)",
							"rgba(54, 162, 235, 1)",
							"rgba(255, 206, 86, 1)",
							"rgba(75, 192, 192, 1)",
							"rgba(153, 102, 255, 1)",
							"rgba(255, 159, 64, 1)",
						];
						for (const grid in chart.options.scales) {
							const border = chart.options.scales[grid]?.grid;
							if (border !== undefined) {
								border.color = "rgba(255, 255, 255, 0.1)";
							}
						}
						break;
					}
					case "light": {
						(chart.options.backgroundColor as unknown as string[]) = [
							"rgba(255, 99, 132, 0.2)",
							"rgba(54, 162, 235, 0.2)",
							"rgba(255, 206, 86, 0.2)",
							"rgba(75, 192, 192, 0.2)",
							"rgba(153, 102, 255, 0.2)",
							"rgba(255, 159, 64, 0.2)",
						];
						(chart.options.borderColor as unknown as string[]) = [
							"rgba(255, 99, 132, 1)",
							"rgba(54, 162, 235, 1)",
							"rgba(255, 206, 86, 1)",
							"rgba(75, 192, 192, 1)",
							"rgba(153, 102, 255, 1)",
							"rgba(255, 159, 64, 1)",
						];
						for (const grid in chart.options.scales) {
							const border = chart.options.scales[grid]?.grid;
							if (border !== undefined) {
								border.color = "rgba(0, 0, 0, 0.1)";
							}
						}
						break;
					}
				}
				chart.update();
			}
			break;
		}
		case "__RESIZE_CHART__": {
			const { chartType, newWidth, newHeight } = event.data;
			charts[chartType]?.resize(newWidth, newHeight);
			break;
		}
		case "__DESTROY_CHART__": {
			const { chartType } = event.data;
			charts[chartType]?.destroy();
			break;
		}
	}
};
