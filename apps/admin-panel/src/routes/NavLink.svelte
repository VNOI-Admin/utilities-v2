<script lang="ts">
  import type { HTMLAnchorAttributes } from "svelte/elements";

  import { page } from "$app/stores";
  import Link from "$components/Link.svelte";
  import { clsx } from "$lib/clsx";

  interface NavLinkProps extends Omit<HTMLAnchorAttributes, "class" | "href"> {
    href: string;
  }

  const { href, children, ...rest } = $props<NavLinkProps>();
</script>

<Link
  {href}
  class={clsx(
    "inline-block w-full rounded-md px-2 py-1 shadow-md transition-colors duration-100",
    $page.url.pathname === href
      ? "bg-gray-200 text-black dark:bg-neutral-800 dark:text-white"
      : "bg-white text-neutral-700 hover:bg-gray-200 hover:text-black dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white",
  )}
  {...rest}
>
  {#if children}
    {@render children()}
  {/if}
</Link>
