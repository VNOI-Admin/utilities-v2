<script lang="ts">
	// import { browser } from "$app/environment";
	import { invalidate } from "$app/navigation";
	import { page } from "$app/stores";
	import ChevronRight from "$components/icons/ChevronRight.svelte";
	import Sort from "$components/icons/Sort.svelte";
	import Input from "$components/Input.svelte";
	import { addURLSearch } from "$lib/addURLSearch";
	import { clsx } from "$lib/clsx";
	import { range } from "$lib/range";

	import type { DeviceInfoKeys, OrderBy } from "./-page.types";
	import DeviceInfo from "./DeviceInfo.svelte";
	import PaginationButton from "./PaginationButton.svelte";

	const { data } = $props();
	let isQuickNavigateOpen = $state(false);
	const currentPage = $derived($page.url.searchParams.get("page"));
	const order = $derived($page.url.searchParams.get("order"));
	const orderBy = $derived($page.url.searchParams.get("orderBy"));

	$effect(() => {
		const interval = setInterval(() => invalidate("home:query"), 10000);

		return () => clearInterval(interval);
	});

	const mapDeviceInfoKeyToName: Record<DeviceInfoKeys, string> = {
		userId: "ID",
		ip: "IP",
		isOnline: "Online",
		ping: "Ping",
		cpu: "CPU usage",
		ram: "RAM usage",
	};

	const mapDeviceInfoKeyToOrderBy: Partial<Record<DeviceInfoKeys, OrderBy>> = {
		userId: "username",
		ip: "ip",
		ping: "ping",
		cpu: "cpu",
		ram: "ram",
	};

	// This should be in the same order as the one used in DeviceInfo.
	const deviceKeys = ["userId", "ip", "isOnline", "ping", "cpu", "ram"] satisfies DeviceInfoKeys[];
</script>

<h2>Monitor</h2>

<h3 class="text-accent-light dark:text-accent-dark inline-block">
	<!-- Show number of online by counting isOnline in devices -->
	<span aria-hidden="true">✓</span>
	{data.onlineCount} online +
	<!-- Show number of offline by counting isOnline in devices -->
	<span aria-hidden="true">⛌</span>
	{data.offlineCount} offline =
	<!-- Total -->
	{data.onlineCount + data.offlineCount} total
</h3>

<button
	class="flex flex-row items-center gap-2 [&>*]:select-none"
	on:click={() => (isQuickNavigateOpen = !isQuickNavigateOpen)}
>
	<ChevronRight
		width={24}
		height={24}
		class={clsx(
			"max-h-[24px] min-h-[24px] min-w-[24px] max-w-[24px] transition duration-100 dark:text-white",
			isQuickNavigateOpen && "rotate-90",
		)}
	/>
	<p>Quick navigate</p>
</button>
<div class="flex h-fit w-full flex-col gap-2">
	{#if isQuickNavigateOpen}
		<form method="GET" action="/">
			<Input
				label="To page"
				id="home-quick-navigate-page"
				type="search"
				inputmode="numeric"
				pattern="[0-9]*"
				name="page"
				min={0}
				max={data.totalPages - 1}
				sameLine
			/>
		</form>
	{/if}
	<div class="flex h-fit w-full flex-row flex-wrap gap-2">
		{#each range(0, data.totalPages - 1) as navigatePage}
			<PaginationButton
				as="a"
				href={addURLSearch($page.url, { page: "" + navigatePage }).toString()}
				active={!!currentPage && +currentPage === navigatePage}
			>
				{navigatePage}
			</PaginationButton>
		{/each}
	</div>

	<!-- Create a filter input with content from filter in url search param -->
	<form method="GET" action="/">
		<Input
			label="Filter"
			id="home-filter"
			type="search"
			name="filter"
			value={$page.url.searchParams.get("filter") ?? ""}
			sameLine
		/>
	</form>
</div>
<a
	class="text-accent-light dark:text-accent-dark underline"
	href={addURLSearch($page.url, {
		order: order === "desc" ? "asc" : "desc",
	}).toString()}
>
	Sort by {order === "desc" ? "ascending" : "descending"} order
</a>
<div class="dark:bg-neutral-1000 h-full w-full rounded-xl bg-white shadow-2xl">
	<div class="relative h-full w-full overflow-x-auto overflow-y-auto">
		<table class="absolute w-full table-auto border-separate border-spacing-4">
			<thead>
				<tr
					class="dark:[&>th]:bg-neutral-1000 z-10 [&>th]:sticky [&>th]:top-0 [&>th]:bg-white [&>th]:transition-colors [&>th]:duration-100"
				>
					{#each deviceKeys as key}
						{@const keyAsOrderByValue = mapDeviceInfoKeyToOrderBy[key]}
						<th class="text-left md:w-[calc(100%/6)]">
							<div class="flex items-center gap-2">
								<h3>{mapDeviceInfoKeyToName[key]}</h3>
								{#if !!keyAsOrderByValue}
									{@const isCurrentOrder = orderBy === keyAsOrderByValue}
									<a
										href={addURLSearch($page.url, {
											orderBy: keyAsOrderByValue,
										}).toString()}
										class={clsx(
											"rounded p-2 transition-colors duration-100",
											isCurrentOrder && "bg-accent-light dark:bg-accent-dark",
										)}
									>
										<Sort
											width={24}
											height={24}
											class={clsx(
												"transition-[filter] duration-100",
												isCurrentOrder
													? "text-white dark:text-black"
													: "text-black dark:text-white",
											)}
										/>
									</a>
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data.devices as device}
					<DeviceInfo {device} />
				{/each}
			</tbody>
		</table>
	</div>
</div>
