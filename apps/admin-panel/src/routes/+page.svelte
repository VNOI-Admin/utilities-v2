<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { base } from "$app/paths";
  import { page } from "$app/stores";
    import ChevronRight from "$components/icons/ChevronRight.svelte";
  import Sort from "$components/icons/Sort.svelte";
  import Input from "$components/Input.svelte";
  import Link from "$components/Link.svelte";
  import Select from "$components/Select.svelte";
  import { addURLSearch } from "$lib/addURLSearch";
  import { clsx } from "$lib/clsx";
  import { range } from "$lib/range";

  import {
    DEVICE_KEYS,
    VALID_ORDER_BY_SELECT_VALUES,
    VALID_ORDER_SELECT_VALUES,
  } from "./$page.constants";
  import DeviceInfo from "./DeviceInfo.svelte";
  import PaginationButton from "./PaginationButton.svelte";

  const { data } = $props();
  const currentPage = $derived($page.url.searchParams.get("page"));
  const search = $derived($page.url.searchParams.get("q"));
  const order = $derived($page.url.searchParams.get("order"));
  const orderBy = $derived($page.url.searchParams.get("orderBy"));

  let searchForm = $state<HTMLFormElement | null>(null);

  $effect(() => {
    const interval = setInterval(() => invalidate("home:query"), 10000);

    return () => clearInterval(interval);
  });
</script>

<div class="flex h-full w-full flex-col gap-2 px-6 py-8">
  <h1>Monitor</h1>

  <h2 class="text-accent-light dark:text-accent-dark inline-block">
    <!-- Show number of online by counting isOnline in devices -->
    {data.onlineCount} online +
    <!-- Show number of offline by counting isOnline in devices -->
    {data.offlineCount} offline =
    <!-- Total -->
    {data.onlineCount + data.offlineCount} total
  </h2>

  <details open class="[&[open]>summary>svg]:rotate-90">
    <summary class="flex flex-row items-center gap-2">
      <h2>Search</h2>
      <ChevronRight
        width={24}
        height={24}
        class="-mt-1 max-h-6 min-h-6 min-w-6 max-w-6 transition-transform duration-100"
      />
    </summary>
    <div class="flex h-fit w-full flex-col gap-2">
      <div class="flex h-fit w-full gap-2 overflow-x-auto md:flex-wrap md:overflow-x-visible">
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
      <div class="w-full overflow-x-auto md:overflow-x-visible">
        <form
          bind:this={searchForm}
          method="GET"
          action={`${base}/`}
          class="flex w-fit min-w-max max-w-full flex-row gap-2 md:min-w-0 md:flex-wrap"
        >
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
          <Input
            label="Search user"
            id="home-quick-navigate-search"
            type="search"
            name="q"
            value={search}
          />
          <Select
            label="Order"
            id="home-quick-navigate-order"
            name="order"
            values={VALID_ORDER_SELECT_VALUES}
            initialValue={order}
            onchange={() => searchForm?.requestSubmit()}
          />
          <Select
            label="Order by"
            id="home-quick-navigate-order-by"
            name="orderBy"
            values={VALID_ORDER_BY_SELECT_VALUES}
            initialValue={orderBy}
            onchange={() => searchForm?.requestSubmit()}
          />
          <button class="button filled" type="submit">Search</button>
        </form>
      </div>
    </div>
  </details>

  <h2 class="sr-only">Users</h2>
  <div class="dark:bg-neutral-1000 h-full w-full rounded-xl bg-white shadow-2xl">
    <div class="relative h-full w-full overflow-x-auto overflow-y-auto">
      <table class="absolute w-full table-auto border-separate border-spacing-4">
        <thead>
          <tr
            class="dark:[&>th]:bg-neutral-1000 [&>th]:z-10 [&>th]:sticky [&>th]:top-0 [&>th]:bg-white [&>th]:transition-colors [&>th]:duration-100"
          >
            {#each DEVICE_KEYS as [_, name, keyOrderBy]}
              <th class="text-left md:w-[calc(100%/7)]">
                <div class="flex items-center gap-3">
                  <h3>{name}</h3>
                  {#if !!keyOrderBy}
                    {@const isCurrentOrder = orderBy === keyOrderBy}
                    <Link
                      href={addURLSearch($page.url, { orderBy: keyOrderBy }).toString()}
                      class={clsx(
                        "max-h-9 min-h-9 min-w-9 max-w-9 rounded p-2 transition-colors duration-100",
                        isCurrentOrder && "bg-accent-light dark:bg-accent-dark",
                      )}
                    >
                      <Sort
                        width={20}
                        height={20}
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
