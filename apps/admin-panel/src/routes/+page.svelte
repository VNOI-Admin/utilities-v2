<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import Button from "$components/Button.svelte";
  import Sort from "$components/icons/Sort.svelte";
  import Input from "$components/Input.svelte";
  import Link from "$components/Link.svelte";
  import Select from "$components/Select.svelte";
  import { addURLSearch } from "$lib/addURLSearch";
  import { clsx } from "$lib/clsx";
  import { range } from "$lib/range";

  import {
    DEVICE_KEYS,
    MAP_DEVICE_INFO_KEYS_TO_NAME,
    MAP_DEVICE_INFO_KEYS_TO_ORDER_BY,
    VALID_ORDER_BY_VALUES,
    VALID_ORDER_VALUES,
  } from "./$page.constants";
  import DeviceInfo from "./DeviceInfo.svelte";
  import PaginationButton from "./PaginationButton.svelte";

  const { data } = $props();
  const currentPage = $derived($page.url.searchParams.get("page"));
  const search = $derived($page.url.searchParams.get("q"));
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

  <h3>Search</h3>
  <div class="flex h-fit w-full flex-col gap-2">
    <form method="GET" action={`${base}/`} class="flex w-fit flex-row flex-wrap gap-2">
      <Input
        label="To page"
        id="home-quick-navigate-page"
        type="search"
        inputmode="numeric"
        pattern="[0-9]*"
        name="page"
        min={0}
        max={data.totalPages - 1}
        value={currentPage}
      />
      <Input label="Search user" id="home-quick-navigate-search" type="search" name="q" value={search} />
      <Select
        label="Order"
        id="home-quick-navigate-order"
        name="order"
        values={VALID_ORDER_VALUES}
        value={order}
      />
      <Select
        label="Order by"
        id="home-quick-navigate-order-by"
        name="orderBy"
        values={VALID_ORDER_BY_VALUES}
        value={orderBy}
      />
      <Button as="button" type="submit">Search</Button>
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
  </div>
  
  <h3 class="sr-only">Users</h3>
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
