<script lang="ts">
  import { fly } from "svelte/transition";

  import { clsx } from "$lib/clsx";

  import NavLink from "../NavLink.svelte";

  let isQuickSwitchMenuOpened = $state(false);
  const { data, children } = $props();
</script>

<div class="h-full w-full">
  {@render children()}
  {#await data.quickSwitch then quickSwitchMenu}
    <div class="absolute right-0 top-0 flex h-full flex-row">
      <div class="w-fit">
        <input
          type="checkbox"
          id="quick-switch-menu-toggle"
          class="hidden"
          aria-labelledby="quick-switch-menu-toglab"
          aria-expanded={isQuickSwitchMenuOpened}
          aria-controls="quick-switch-menu"
          bind:checked={isQuickSwitchMenuOpened}
        />
        <label
          id="quick-switch-menu-toglab"
          for="quick-switch-menu-toggle"
          class="z-10 flex cursor-pointer items-center rounded-s-lg bg-gray-50 p-2 shadow-lg dark:bg-neutral-950"
          aria-label="Toggle quick switch menu"
        >
          <span
            class={clsx(
              "flex size-[2.5rem] flex-col justify-center gap-[0.3rem] p-2 [&>span]:bg-black [&>span]:transition-all [&>span]:dark:bg-white",
              "[&>span]:h-[0.2rem] [&>span]:w-full [&>span]:rounded-md",
              isQuickSwitchMenuOpened && [
                "[&>:nth-child(1)]:rotate-45",
                "[&>:nth-child(1)]:translate-y-[0.5rem]",
                "[&>:nth-child(2)]:opacity-0",
                "[&>:nth-child(3)]:translate-y-[-0.5rem]",
                "[&>:nth-child(3)]:-rotate-45",
              ],
            )}
          >
            <span class="origin-center duration-300" />
            <span class="duration-200 ease-out" />
            <span class="origin-center duration-300" />
          </span>
          <span class="mr-2">Quick switch</span>
        </label>
      </div>
      {#if isQuickSwitchMenuOpened}
        <nav
          class="z-10 flex h-full max-h-dvh w-[90dvw] max-w-[350px] flex-col gap-4 bg-gray-50 px-4 py-8 dark:bg-neutral-950"
          transition:fly={{
            x: "100%",
            duration: 250,
          }}
        >
          {#if "error" in quickSwitchMenu}
            <p class="text-error">{quickSwitchMenu.error}</p>
          {:else}
            <h2>Quick switch</h2>
            <ul class="flex w-full h-full overflow-y-auto flex-col gap-2">
              {#each quickSwitchMenu as { username }}
                <li>
                  <NavLink href={`/contestant/${username}`}>{username}</NavLink>
                </li>
              {/each}
            </ul>
          {/if}
        </nav>
      {/if}
    </div>
  {/await}
</div>
