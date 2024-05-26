<script lang="ts">
  import { page } from "$app/stores";
  import Link from "$components/Link.svelte";
  import ArrowUp from "$components/icons/ArrowUp.svelte";
  import { addURLSearch } from "$lib/addURLSearch";
  import { removeURLSearch } from "$lib/removeURLSearch";
  import { clsx } from "$lib/clsx";
  import { readonlyArrayIncludes } from "$lib/readonlyArrayIncludes";
  import { DEVICE_KEYS, VALID_ORDER_BY_VALUES_MACHINE } from "./$page.constants";
  import type { Device } from "./$page.types";
  import DeviceInfo from "./DeviceInfo.svelte";

  interface DevicesTableProps {
    asc: string[];
    desc: string[];
    devices: Device[];
    isAdmin: boolean;
    showMachineInfo: boolean;
  }

  const { asc, desc, devices, isAdmin, showMachineInfo }: DevicesTableProps = $props();

  const deviceKeys = $derived(
    showMachineInfo
      ? DEVICE_KEYS
      : DEVICE_KEYS.filter((e) => !readonlyArrayIncludes(VALID_ORDER_BY_VALUES_MACHINE, e[2])),
  );

  const tableHeadWidth = $derived.by(() => {
    if (showMachineInfo) {
      return isAdmin ? "md:w-[calc(100%/9)]" : "md:w-[calc(100%/8)]";
    }
    return isAdmin ? "md:w-[calc(100%/5)]" : "md:w-[calc(100%/4)]";
  });

  const tableHeadStyle = $derived(clsx("text-left", tableHeadWidth));
</script>

<table class="absolute w-full table-auto border-separate border-spacing-4">
  <thead>
    <tr
      class="dark:[&>th]:bg-neutral-1000 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-white [&>th]:transition-colors [&>th]:duration-100"
    >
      {#each deviceKeys as [_, name, keyOrderBy]}
        <th class={tableHeadStyle}>
          <div class="flex items-center gap-3">
            <h3>{name}</h3>
            {#if !!keyOrderBy}
              {@const isAsc = asc.includes(keyOrderBy)}
              {@const isDesc = desc.includes(keyOrderBy)}
              {@const isOrder = isAsc || isDesc}
              {@const trimmedUrl = removeURLSearch($page.url, [
                ["asc", keyOrderBy],
                ["desc", keyOrderBy],
              ])}
              <Link
                href={(isDesc
                  ? trimmedUrl
                  : addURLSearch(trimmedUrl, [[isAsc ? "desc" : "asc", keyOrderBy]])
                ).toString()}
                class={clsx(
                  "max-h-9 min-h-9 min-w-9 max-w-9 rounded p-2 transition-[background-color_opacity] duration-100",
                  isOrder
                    ? "bg-accent-light dark:bg-accent-dark hover:opacity-80"
                    : "hover:bg-gray-200 dark:hover:bg-neutral-800",
                )}
              >
                <ArrowUp
                  width={20}
                  height={20}
                  class={clsx(
                    "transition-[filter_transform] duration-100",
                    isOrder ? "text-white dark:text-black" : "text-black dark:text-white",
                    isDesc && "rotate-180",
                  )}
                />
              </Link>
            {/if}
          </div>
        </th>
      {/each}
      <th class={tableHeadStyle}>
        <span class="sr-only">View user</span>
      </th>
      {#if isAdmin}
        <th class={tableHeadStyle}>
          <span class="sr-only">Edit user</span>
        </th>
      {/if}
    </tr>
  </thead>
  <tbody>
    {#each devices as device}
      <DeviceInfo {device} {isAdmin} {showMachineInfo} />
    {/each}
  </tbody>
</table>
