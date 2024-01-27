<script lang="ts">
  import "../app.css";

  import { fly } from "svelte/transition";

  import { page } from "$app/stores";
  import ToggleScheme from "$components/layouts/ToggleScheme.svelte";
  import { clsx } from "$lib/clsx";
  import { isColorScheme } from "$lib/isColorScheme";
  import { colorScheme } from "$lib/stores/colorScheme";

  import NavLink from "./NavLink.svelte";

  const title = $derived(
    $page.data.title ? `${$page.data.title} - VNCS Admin Panel` : "VNCS Admin Panel",
  );
  const isDark = $derived($colorScheme === "dark");
  const { children } = $props();
  let isNavMobileMenuOpened = $state(false);

  $effect(() => {
    const newTheme = document.documentElement.dataset.theme;
    $colorScheme = isColorScheme(newTheme) ? newTheme : "light";
    colorScheme.subscribe((value) => {
      document.documentElement.dataset.theme = value;
      localStorage.setItem("theme", value);
    });
  });

  interface AsideMenuLink {
    href: string;
    title: string;
  }

  const ASIDE_MENU_LINKS = [
    {
      href: "/",
      title: "Monitor",
    },
    {
      href: "/logging",
      title: "Logging",
    },
  ] satisfies AsideMenuLink[];
</script>

<svelte:head>
  <title>{title}</title>
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />
  <link rel="canonical" href={$page.url.href} />
  <meta name="theme-color" content={isDark ? "#000000" : "#FFFFFF"} />
  <style>
    :root {
      --latin-unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
        U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215,
        U+FEFF, U+FFFD;
    }

    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-display: swap;
      font-weight: 100;
      src: url("/fonts/geist-100.woff2") format("woff2");
      unicode-range: var(--latin-unicode-range);
    }

    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-display: swap;
      font-weight: 200;
      src: url("/fonts/geist-200.woff2") format("woff2");
      unicode-range: var(--latin-unicode-range);
    }

    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-display: swap;
      font-weight: 300;
      src: url("/fonts/geist-300.woff2") format("woff2");
      unicode-range: var(--latin-unicode-range);
    }

    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-display: swap;
      font-weight: 400;
      src: url("/fonts/geist-400.woff2") format("woff2");
      unicode-range: var(--latin-unicode-range);
    }

    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-display: swap;
      font-weight: 500;
      src: url("/fonts/geist-500.woff2") format("woff2");
      unicode-range: var(--latin-unicode-range);
    }

    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-display: swap;
      font-weight: 600;
      src: url("/fonts/geist-600.woff2") format("woff2");
      unicode-range: var(--latin-unicode-range);
    }

    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-display: swap;
      font-weight: 700;
      src: url("/fonts/geist-700.woff2") format("woff2");
      unicode-range: var(--latin-unicode-range);
    }

    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-display: swap;
      font-weight: 800;
      src: url("/fonts/geist-800.woff2") format("woff2");
      unicode-range: var(--latin-unicode-range);
    }

    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-display: swap;
      font-weight: 900;
      src: url("/fonts/geist-900.woff2") format("woff2");
      unicode-range: var(--latin-unicode-range);
    }
  </style>
</svelte:head>

<div class="flex h-full w-full flex-row">
  <div class="sticky left-0 top-0 z-50 flex h-full max-h-dvh flex-row">
    <nav
      class="hidden h-full w-[90dvw] max-w-[350px] flex-col items-center gap-4 bg-gray-50 px-4 py-8 md:flex dark:bg-neutral-950"
    >
      <div class="flex w-full items-center justify-between gap-2">
        <a
          href="/"
          class="flex items-center gap-2 [&>*]:!text-[#dd2219] dark:[&>*]:!text-[#fbfb00]"
          aria-label="Go to home"
        >
          <enhanced:img
            width={32}
            height={32}
            alt=""
            class="h-auto w-[32px] rounded-md content-[url(/vncs-light.png)] dark:content-[url(/vncs-dark.png)]"
          />
          <h2>VNCS</h2>
        </a>
        <ToggleScheme />
      </div>
      <ul class="mt-4 flex w-full flex-col gap-2">
        {#each ASIDE_MENU_LINKS as { href, title }}
          <li>
            <NavLink {href}>{title}</NavLink>
          </li>
        {/each}
      </ul>
    </nav>
    {#if isNavMobileMenuOpened}
      <nav
        class="dark:bg-neutral-1000 flex h-full w-[90dvw] max-w-[350px] flex-col items-center gap-4 bg-white px-4 py-8 md:hidden"
        transition:fly={{
          x: "-100%",
          duration: 250,
        }}
      >
        <div class="flex w-full items-center justify-between gap-2">
          <a
            href="/"
            class="flex items-center gap-2 [&>*]:!text-[#dd2219] dark:[&>*]:!text-[#fbfb00]"
            aria-label="Go to home"
          >
            <enhanced:img
              width={32}
              height={32}
              alt=""
              class="h-auto w-[32px] rounded-md content-[url(/vncs-light.png)] dark:content-[url(/vncs-dark.png)]"
            />
            <h2>VNCS</h2>
          </a>
          <ToggleScheme />
        </div>
        <ul class="mt-4 flex w-full flex-col gap-2">
          {#each ASIDE_MENU_LINKS as { href, title }}
            <li>
              <NavLink {href}>{title}</NavLink>
            </li>
          {/each}
        </ul>
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
</div>
