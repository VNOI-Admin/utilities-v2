<script lang="ts">
  import { enhance } from "$app/forms";
  import { base } from "$app/paths";
  import Logout from "$components/icons/Logout.svelte";
  import ToggleScheme from "$components/layouts/ToggleScheme.svelte";
  import Link from "$components/Link.svelte";

  import type { QuickSwitch } from "./$page.types";
  import NavLink from "./NavLink.svelte";

  interface NavProps {
    isLoggedIn: boolean;
    quickSwitch: QuickSwitch;
  }

  const { isLoggedIn, quickSwitch } = $props<NavProps>();

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

<div class="flex w-full flex-col justify-between gap-2">
  <Link
    href="/"
    class="flex items-center gap-2 [&>*]:!text-[#a51a12] dark:[&>*]:!text-[#fbfb00]"
    aria-label="Go to home"
  >
    <enhanced:img src="$images/VNOI.png" class="h-8 w-8" alt="" />
    <h2>VCS</h2>
  </Link>
  <div class="flex items-center gap-2">
    <ToggleScheme />
    {#if isLoggedIn}
      <form method="POST" action={`${base}/login?/logout`} use:enhance>
        <button type="submit" class="nav-button">
          <Logout width={24} height={24} />
          <p class="sr-only">Logout</p>
        </button>
      </form>
    {/if}
  </div>
</div>
<ul class="mt-4 flex w-full flex-col gap-2">
  {#each ASIDE_MENU_LINKS as { href, title }}
    <li>
      <NavLink {href}>{title}</NavLink>
    </li>
  {/each}
</ul>
{#await quickSwitch then quickSwitchMenu}
  {#if quickSwitchMenu}
    {#if "error" in quickSwitchMenu}
      <p class="text-error">{quickSwitchMenu.error}</p>
    {:else}
      <h2>Quick switch</h2>
      <ul class="mt-4 flex w-full flex-col gap-2">
        {#each quickSwitchMenu as { username }}
          <li>
            <NavLink href={`/contestant/${username}`}>{username}</NavLink>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
{/await}
