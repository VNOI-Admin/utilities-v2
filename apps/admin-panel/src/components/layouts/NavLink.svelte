<script lang="ts">
  import type { HTMLAnchorAttributes } from "svelte/elements";

  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import { clsx } from "$lib/clsx";

  interface NavLinkProps extends Omit<HTMLAnchorAttributes, "class" | "href"> {
    href: string;
  }

  const { href, children, ...rest }: NavLinkProps = $props();

  const resolvedHref = $derived(href.startsWith("/") ? `${base}${href}` : href);
</script>

<a
  href={resolvedHref}
  class={clsx(
    "flex size-full cursor-pointer flex-row items-center gap-2 break-words rounded-md px-3 py-2 text-base font-medium duration-100 md:text-sm line-clamp-1",
    $page.url.pathname === resolvedHref
      ? "bg-gray-200 text-black dark:bg-neutral-800 dark:text-white"
      : "bg-gray-100 text-neutral-700 hover:bg-gray-200 hover:text-black dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white",
  )}
  {...rest}
>
  {#if children}
    {@render children()}
  {/if}
</a>
