<script lang="ts">
  import type { HTMLSelectAttributes } from "svelte/elements";

  import { clsx } from "$lib/clsx";

  interface SelectProps extends HTMLSelectAttributes {
    id: string;
    label: string;
    values: readonly string[];
  }

  const { id, label, values, ...rest } = $props<SelectProps>();
</script>

<div class="relative">
  <label for={id} class="z-[2] top-0.5 text-xs text-neutral-700 dark:text-gray-300 absolute left-2.5 block font-medium transition-all duration-100 ease-in">
    {label}
  </label>
  <select
    {id}
    class={clsx(
      "z-[1] block h-[44px] w-full rounded-lg px-2.5 pt-2.5 text-sm shadow-md transition-opacity disabled:opacity-50",
      "focus:border-accent-light dark:focus:border-accent-dark border border-neutral-400 focus:outline-none dark:border-neutral-700",
      "dark:bg-neutral-1000 bg-white text-black opacity-80 dark:text-white",
    )}
    {...rest}
  >
    {#each values as value}
      <option {value}>{value}</option>
    {/each}
  </select>
</div>
