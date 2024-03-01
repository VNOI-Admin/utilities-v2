<script lang="ts">
  import type { ComponentType, SvelteComponent } from "svelte";
  import type { SVGAttributes } from "svelte/elements";

  import { enhance } from "$app/forms";
  import { base } from "$app/paths";
  import Eye from "$components/icons/Eye.svelte";
  import Logout from "$components/icons/Logout.svelte";
  import Settings from "$components/icons/Settings.svelte";
  import ToggleScheme from "$components/layouts/ToggleScheme.svelte";
  import Link from "$components/Link.svelte";
  import { toast } from "$lib/stores/toast.svelte";

  import type { QuickSwitch } from "./$page.types";
  import NavLink from "./NavLink.svelte";

  interface NavProps {
    isLoggedIn: boolean;
    quickSwitch: QuickSwitch;
  }

  const { isLoggedIn, quickSwitch } = $props<NavProps>();
  let isLoggingOut = $state(false);

  interface AsideMenuLink {
    href: string;
    title: string;
    icon: ComponentType<SvelteComponent<SVGAttributes<SVGElement>>>;
  }

  const ASIDE_MENU_LINKS = [
    {
      href: "/",
      title: "Monitor",
      icon: Eye,
    },
    {
      href: "/settings",
      title: "Settings",
      icon: Settings,
    },
  ] satisfies AsideMenuLink[];
</script>

<div class="flex w-full flex-col justify-between gap-2">
  <Link
    href="/"
    class="flex items-center gap-2 [&>*]:!text-[#a51a12] dark:[&>*]:!text-[#fbfb00]"
    aria-label="Go to home"
  >
    <enhanced:img src="$images/VNOI.png" class="max-h-8 min-h-8 min-w-8 max-w-8" alt="" />
    <h2>VCS</h2>
  </Link>
  <div class="flex items-center gap-2">
    <ToggleScheme />
    {#if isLoggedIn}
      <form
        method="POST"
        action={`${base}/login?/logout`}
        use:enhance={() => {
          isLoggingOut = true;
          return async ({ result, update }) => {
            isLoggingOut = false;
            if (result.type === "failure") {
              toast.push({
                variant: "error",
                title: "Failed to log out.",
                message:
                  typeof result.data?.error === "string" ? result.data.error : "Unknown error.",
                time: Date.now(),
              });
            }
            update();
          };
        }}
      >
        <button type="submit" disabled={isLoggingOut} class="nav-button disabled:opacity-70">
          <Logout width={24} height={24} />
          <p class="sr-only">Logout</p>
        </button>
      </form>
    {/if}
  </div>
</div>
<ul class="flex w-full flex-col gap-2">
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
      <ul class="mt-4 flex max-h-full w-full flex-col gap-2 overflow-y-auto">
        {#each quickSwitchMenu as { username }}
          <li>
            <NavLink href={`/contestant/${username}`}>{username}</NavLink>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
{/await}
