<script lang="ts">
  import type { HTMLAnchorAttributes } from "svelte/elements";

  import { base } from "$app/paths";

  interface LinkProps extends Omit<HTMLAnchorAttributes, "href"> {
    href: string;
  }

  const { href, children, ...props }: LinkProps = $props();
</script>

<a href={href.startsWith("/") ? `${base}${href}` : href} {...props}>
  {#if children}
    {@render children()}
  {/if}
</a>
