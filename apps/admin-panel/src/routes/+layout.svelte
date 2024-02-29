<script lang="ts">
  import "../app.css";

  import { fly } from "svelte/transition";

  import { page } from "$app/stores";
  import Toast from "$components/Toast.svelte";
  import { clsx } from "$lib/clsx";
  import { isColorScheme } from "$lib/isColorScheme";
  import { colorScheme } from "$lib/stores/colorScheme";
  import { settings } from "$lib/stores/settings.svelte";

  import Nav from "./Nav.svelte";

  const title = $derived(
    $page.data.title ? `${$page.data.title} - VCS Admin Panel` : "VCS Admin Panel",
  );
  const isDark = $derived($colorScheme === "dark");
  const { children, data } = $props();
  let isNavMobileMenuOpened = $state(false);

  $effect(() => {
    const newTheme = document.documentElement.dataset.theme;
    $colorScheme = isColorScheme(newTheme) ? newTheme : "light";
    colorScheme.subscribe((value) => {
      document.documentElement.dataset.theme = value;
      localStorage.setItem("theme", value);
    });
  });

  $effect(() => {
    settings.toastTimeout = localStorage.getItem("toastTimeout") || "5000";
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />
  <link rel="canonical" href={$page.url.href} />
  <meta name="theme-color" content={isDark ? "#000000" : "#FFFFFF"} />
</svelte:head>

<div class="flex h-full w-full flex-row">
  <div class="sticky left-0 top-0 z-50 flex h-full max-h-dvh flex-row">
    {#snippet navbarContent()}
      <Nav isLoggedIn={data.isLoggedIn} quickSwitch={data.quickSwitch} />
    {/snippet}
    <nav
      class="hidden h-full w-[90dvw] max-w-[350px] flex-col gap-4 bg-gray-50 px-4 py-8 md:flex dark:bg-neutral-950"
    >
      {@render navbarContent()}
    </nav>
    {#if isNavMobileMenuOpened}
      <nav
        class="dark:bg-neutral-1000 flex h-full w-[90dvw] max-w-[350px] flex-col gap-4 bg-white px-4 py-8 shadow-lg md:hidden"
        transition:fly={{
          x: "-100%",
          duration: 250,
        }}
      >
        {@render navbarContent()}
      </nav>
    {/if}
    <div>
      <span class="absolute">
        <input
          type="checkbox"
          id="navbar-mobile-menu-toggle"
          class="hidden"
          aria-labelledby="navbar-mobile-menu-toglab"
          aria-expanded={isNavMobileMenuOpened}
          aria-controls="navbar-mobile-menu"
          bind:checked={isNavMobileMenuOpened}
        />
        <label
          id="navbar-mobile-menu-toglab"
          for="navbar-mobile-menu-toggle"
          class={clsx(
            "flex size-[2.5rem] cursor-pointer flex-col justify-center gap-[0.3rem] md:hidden",
            "dark:bg-neutral-1000 rounded-e-lg bg-white p-2 shadow-lg",
            "[&>span]:bg-black [&>span]:transition-all [&>span]:dark:bg-white",
            "[&>span]:h-[0.2rem] [&>span]:w-full [&>span]:rounded-md",
            isNavMobileMenuOpened && [
              "[&>:nth-child(1)]:rotate-45",
              "[&>:nth-child(1)]:translate-y-[0.5rem]",
              "[&>:nth-child(2)]:opacity-0",
              "[&>:nth-child(3)]:translate-y-[-0.5rem]",
              "[&>:nth-child(3)]:-rotate-45",
            ],
          )}
          aria-label="Toggle navbar menu"
        >
          <span class="origin-center duration-300" />
          <span class="duration-200 ease-out" />
          <span class="origin-center duration-300" />
        </label>
      </span>
    </div>
  </div>
  <main class="md:flex-[5_5_0 h-full w-full" id="main-content">
    <section class="flex h-full w-full gap-2">
      {@render children()}
    </section>
  </main>
  <Toast />
</div>
