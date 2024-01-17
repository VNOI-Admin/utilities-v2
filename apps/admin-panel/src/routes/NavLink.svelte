<script lang="ts">
  import type { HTMLAnchorAttributes } from "svelte/elements";

  import { page } from "$app/stores";
  import { clsx } from "$lib/clsx";

  type NavLinkProps = Omit<HTMLAnchorAttributes, "class">;

  const { href, children, ...rest } = $props<NavLinkProps>();
</script>

<a
  {href}
  class={clsx(
    "inline-block w-full rounded-md px-2 py-1 shadow-md transition-colors duration-100",
    $page.url.pathname === href
      ? "bg-gray-200 text-black dark:bg-neutral-800 dark:text-white"
      : "dark:bg-neutral-1000 text-neutral-700 hover:bg-gray-200 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white",
  )}
  {...rest}
>
  {#if children}
    {@render children()}
  {/if}
</a>
