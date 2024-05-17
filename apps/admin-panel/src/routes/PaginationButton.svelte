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
  };

  const {
    as,
    active = false,
    class: className,
    children,
    ...rest
  }: PaginationButtonProps = $props();
</script>

<svelte:element
  this={as}
  class={clsx("pagination-button", active ? "active" : "inactive", className)}
  {...rest}
>
  {#if children}
    {@render children()}
  {/if}
</svelte:element>
