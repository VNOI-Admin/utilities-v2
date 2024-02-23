<script lang="ts">
  // import { browser } from "$app/environment";
  import { invalidate } from "$app/navigation";
  import { page } from "$app/stores";
  import ChevronRight from "$components/icons/ChevronRight.svelte";
  import Sort from "$components/icons/Sort.svelte";
  import Input from "$components/Input.svelte";
  import Link from "$components/Link.svelte";
  import { addURLSearch } from "$lib/addURLSearch";
  import { clsx } from "$lib/clsx";
  import { range } from "$lib/range";

  import {
    DEVICE_KEYS,
    MAP_DEVICE_INFO_KEYS_TO_NAME,
    MAP_DEVICE_INFO_KEYS_TO_ORDER_BY,
  } from "./$page.constants";
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
</script>

<div class="flex h-full w-full flex-col gap-2 px-6 py-8">
  <h2>Monitor</h2>

  <h3 class="text-accent-light dark:text-accent-dark inline-block">
    <!-- Show number of online by counting isOnline in devices -->
    {data.onlineCount} online +
    <!-- Show number of offline by counting isOnline in devices -->
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
      <form method="GET" action="/" class="w-fit">
        <Input
          label="To page"
          id="home-quick-navigate-page"
          type="search"
          inputmode="numeric"
          pattern="[0-9]*"
          name="page"
          min={0}
          max={data.totalPages - 1}
        />
      </form>
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
    {/if}
  </div>
  <Link
    class="text-accent-light dark:text-accent-dark underline"
    href={addURLSearch($page.url, {
      order: order === "desc" ? "asc" : "desc",
    }).toString()}
  >
    Sort by {order === "desc" ? "ascending" : "descending"} order
  </Link>
  <div class="dark:bg-neutral-1000 h-full w-full rounded-xl bg-white shadow-2xl">
    <div class="relative h-full w-full overflow-x-auto overflow-y-auto">
      <table class="absolute w-full table-auto border-separate border-spacing-4">
        <thead>
          <tr
            class="dark:[&>th]:bg-neutral-1000 z-10 [&>th]:sticky [&>th]:top-0 [&>th]:bg-white [&>th]:transition-colors [&>th]:duration-100"
          >
            {#each DEVICE_KEYS as key}
              {@const keyAsOrderByValue = MAP_DEVICE_INFO_KEYS_TO_ORDER_BY[key]}
              <th class="text-left md:w-[calc(100%/7)]">
                <div class="flex items-center gap-2">
                  <h3>{MAP_DEVICE_INFO_KEYS_TO_NAME[key]}</h3>
                  {#if !!keyAsOrderByValue}
                    {@const isCurrentOrder = orderBy === keyAsOrderByValue}
                    <Link
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
                    </Link>
                  {/if}
                </div>
              </th>
            {/each}
            <th class="text-left md:w-[calc(100%/7)]">
              <span class="sr-only">View user</span>
            </th>
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
</div>
