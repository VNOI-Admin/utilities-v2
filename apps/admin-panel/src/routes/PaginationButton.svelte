<script lang="ts">
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

  import { clsx } from "$lib/clsx";

  type PaginationButtonProps = (
    | (HTMLAnchorAttributes & {
        as: "a";
      })
    | (HTMLButtonAttributes & {
        as: "button";
      })
  ) & {
    active?: boolean;
    class?: string;
  };

  const { as, active = false, class: className, ...rest } = $props<PaginationButtonProps>();
</script>

<svelte:element
  this={as}
  class={clsx(
    "transition-colors-opacity relative inline-flex h-[2.5rem] w-fit min-w-[2.5rem] items-center justify-center rounded-md",
    "select-none p-2 text-sm font-medium shadow-md duration-100 focus:z-20 disabled:opacity-50",
    active
      ? "bg-gray-200 text-black dark:bg-neutral-800 dark:text-white"
      : clsx(
          "bg-white [&:not(:disabled)]:hover:bg-gray-200",
          "dark:[&:not(:disabled)]:bg-neutral-1000 dark:[&:not(:disabled)]:hover:bg-neutral-800",
          "text-neutral-700 dark:text-gray-300 [&:not(:disabled)]:hover:text-black dark:[&:not(:disabled)]:hover:text-white",
        ),
    className,
  )}
  {...rest}
>
  <slot />
</svelte:element>
