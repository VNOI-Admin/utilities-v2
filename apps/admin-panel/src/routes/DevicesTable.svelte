<script lang="ts">
  import { page } from "$app/stores";
  import Link from "$components/Link.svelte";
  import Sort from "$components/icons/Sort.svelte";
  import { addURLSearch } from "$lib/addURLSearch";
  import { clsx } from "$lib/clsx";
  import { readonlyArrayIncludes } from "$lib/readonlyArrayIncludes";
  import { DEVICE_KEYS, VALID_ORDER_BY_VALUES_ADMIN } from "./$page.constants";
  import type { Device } from "./$page.types";
  import DeviceInfo from "./DeviceInfo.svelte";

  interface DevicesTableProps {
    isAdmin: boolean;
    orderBy: string | null;
    devices: Device[];
  }

  const { isAdmin, orderBy, devices }: DevicesTableProps = $props();

  const deviceKeys = $derived(
    isAdmin
      ? DEVICE_KEYS
      : DEVICE_KEYS.filter((e) => !readonlyArrayIncludes(VALID_ORDER_BY_VALUES_ADMIN, e[2])),
  );
</script>

<table class="absolute w-full table-auto border-separate border-spacing-4">
  <thead>
    <tr
      class="dark:[&>th]:bg-neutral-1000 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-white [&>th]:transition-colors [&>th]:duration-100"
    >
      {#each deviceKeys as [_, name, keyOrderBy]}
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
                    isCurrentOrder ? "text-white dark:text-black" : "text-black dark:text-white",
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
    {#each devices as device}
      <DeviceInfo {isAdmin} {device} />
    {/each}
  </tbody>
</table>
