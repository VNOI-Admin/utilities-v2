<script lang="ts" generics="T extends keyof SvelteHTMLElements = 'button'">
  import type { SvelteHTMLElements } from "svelte/elements";

  import { clsx } from "$lib/clsx";

  type ButtonVariant = "nofill" | "light" | "filled";

  type ButtonProps = Omit<SvelteHTMLElements[T], "class"> & {
    as: T;
    variant?: ButtonVariant;
  };

  const { as = "button", variant = "filled", children, ...rest } = $props<ButtonProps>();
</script>

<svelte:element
  this={as}
  class={clsx(
    "transition-colors-opacity rounded-md px-5 py-2.5 text-center text-sm font-medium duration-100 disabled:opacity-60",
    "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800",
    {
      nofill: clsx(
        "bg-blue-100 text-blue-500 dark:bg-neutral-800 dark:text-sky-200",
        "[&:not(:disabled)]:hover:bg-blue-200 dark:[&:not(:disabled)]:hover:bg-neutral-900",
      ),
      light: clsx(
        "bg-blue-200 text-blue-900 dark:bg-neutral-700 dark:text-sky-200",
        "[&:not(:disabled)]:hover:bg-blue-300 dark:[&:not(:disabled)]:hover:bg-neutral-800",
      ),
      filled: clsx(
        "bg-blue-800 text-white dark:bg-sky-300 dark:text-black",
        "[&:not(:disabled)]:hover:bg-blue-900 dark:[&:not(:disabled)]:hover:bg-sky-200",
      ),
    }[variant],
  )}
  {...rest}
>
  {#if children}
    {@render children()}
  {/if}
</svelte:element>
