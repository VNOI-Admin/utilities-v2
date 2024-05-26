<script lang="ts">
  import { page } from "$app/stores";
  import Checkbox from "$components/Checkbox.svelte";
  import ChevronRight from "$components/icons/ChevronRight.svelte";
  import Input from "$components/Input.svelte";
  import Select from "$components/Select.svelte";
  import { setURLSearch } from "$lib/setURLSearch";
  import { range } from "$lib/range";
  import { clsx } from "$lib/clsx";

  import {
    VALID_ORDER_BY_VALUES,
    VALID_ORDER_BY_VALUES_MACHINE,
    VALID_ROLE_SELECT_VALUES,
  } from "./$page.constants";
  import type { Device } from "./$page.types";
  import DevicesTable from "./DevicesTable.svelte";
  import PaginationButton from "./PaginationButton.svelte";
  import { convertOrderByValueToText } from "./$page.utils";

  interface MonitorProps {
    allowFilterRole?: boolean;
    devices: Device[];
    isAdmin: boolean;
    offlineCount: number;
    onlineCount: number;
    showMachineInfo: boolean;
    totalPages: number;
  }

  const {
    allowFilterRole = false,
    devices,
    isAdmin,
    offlineCount,
    onlineCount,
    showMachineInfo,
    totalPages,
  }: MonitorProps = $props();

  const currentPage = $derived($page.url.searchParams.get("page"));
  const asc = $derived($page.url.searchParams.getAll("asc"));
  const desc = $derived($page.url.searchParams.getAll("desc"));
  const role = $derived($page.url.searchParams.get("role"));
  const search = $derived($page.url.searchParams.get("q"));
  const validOrderByValues = $derived(
    showMachineInfo
      ? [...VALID_ORDER_BY_VALUES, ...VALID_ORDER_BY_VALUES_MACHINE]
      : VALID_ORDER_BY_VALUES,
  );

  let searchForm = $state<HTMLFormElement | null>(null);
</script>

<h2 class="text-accent-light dark:text-accent-dark inline-block">
  <!-- Show number of online by counting isOnline in devices -->
  {onlineCount} online +
  <!-- Show number of offline by counting isOnline in devices -->
  {offlineCount} offline =
  <!-- Total -->
  {onlineCount + offlineCount} total
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
      {#each range(0, totalPages - 1) as navigatePage}
        <PaginationButton
          as="a"
          href={setURLSearch($page.url, { page: "" + navigatePage }).toString()}
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
        action={$page.url.pathname}
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
          max={totalPages - 1}
          value={currentPage}
        />
        <Input
          label="Search user"
          id="home-quick-navigate-search"
          type="search"
          name="q"
          value={search}
        />
        {#if allowFilterRole}
          <Select
            label="Role"
            id="home-quick-navigate-filter-role"
            name="roleFilter"
            values={VALID_ROLE_SELECT_VALUES}
            initialValue={role}
            onchange={() => searchForm?.requestSubmit()}
          />
        {/if}
        {#each ["asc", "desc"] as sortType}
          {@const sortSearch = sortType === "asc" ? asc : desc}
          <details class="group relative">
            <summary
              id="home-quick-navigate-order-asc"
              class={clsx(
                "transition-colors-opacity z-[1] flex h-[44px] w-full items-center gap-2 rounded-lg px-2.5 shadow-md disabled:opacity-50",
                "group-open:border-accent-light dark:group-open:border-accent-dark border border-neutral-400 group-open:outline-none dark:border-neutral-700",
                "dark:bg-neutral-1000 bg-white text-sm text-black opacity-80 dark:text-white",
              )}
            >
              <span>Sort by {sortType === "asc" ? "ascending" : "descending"}</span>
              <ChevronRight
                width={14}
                height={14}
                class="h-auto w-[14px] transition-transform duration-100 group-open:rotate-90"
              />
            </summary>
            <div class="absolute z-20 w-[150px]">
              <div
                class="relative top-2 max-h-[60dvh] space-y-1 overflow-y-auto rounded-[11px] border border-neutral-300 bg-white p-2 dark:border-neutral-800 dark:bg-black"
              >
                {#each validOrderByValues as orderByValue}
                  <Checkbox
                    id={`home-quick-navigate-${sortType}-${orderByValue}`}
                    label={convertOrderByValueToText(orderByValue)}
                    name={sortType}
                    value={orderByValue}
                    checked={sortSearch.includes(orderByValue)}
                  />
                {/each}
              </div>
            </div>
          </details>
        {/each}
        <button class="button filled" type="submit">Search</button>
      </form>
    </div>
  </div>
</details>

<h2 class="sr-only">Users</h2>
<div class="dark:bg-neutral-1000 h-full w-full rounded-xl bg-white shadow-2xl">
  <div class="relative h-full w-full overflow-x-auto overflow-y-auto">
    <DevicesTable {devices} {isAdmin} {asc} {desc} {showMachineInfo} />
  </div>
</div>
