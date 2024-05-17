<script lang="ts" generics="T extends keyof SvelteHTMLElements = 'button'">
  import type { SvelteHTMLElements } from "svelte/elements";

  type ButtonVariant = "nofill" | "light" | "filled";

  type ButtonProps = Omit<SvelteHTMLElements[T], "class"> & {
    as: T;
    variant?: ButtonVariant;
  };

  const { as = "button", variant = "filled", children, ...rest }: ButtonProps = $props();
</script>

<svelte:element
  this={as}
  class={`button ${variant}`}
  {...rest}
>
  {#if children}
    {@render children()}
  {/if}
</svelte:element>
