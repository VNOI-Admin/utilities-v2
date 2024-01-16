<script lang="ts">
  import MoonStars from "$components/icons/MoonStars.svelte";
  import Sun from "$components/icons/Sun.svelte";
  import { clsx } from "$lib/clsx";
  import { colorScheme, toggleColorScheme } from "$lib/stores/colorScheme";

  const dark = $derived($colorScheme === "dark");
</script>

<div>
  <button
    on:click={() => toggleColorScheme()}
    class={clsx(
      "transition-colors_opa flex size-7 cursor-pointer items-center justify-center rounded-[4px] border bg-transparent duration-100",
      dark
        ? "border-sky-400 text-sky-400 hover:bg-sky-600/[0.2]"
        : "border-yellow-500 text-yellow-500 hover:bg-yellow-200/[0.6]",
    )}
    aria-label="Toggle color scheme"
  >
    {#if dark}
      <MoonStars width={18} height={18} />
    {:else}
      <Sun width={18} height={18} />
    {/if}
  </button>
</div>
