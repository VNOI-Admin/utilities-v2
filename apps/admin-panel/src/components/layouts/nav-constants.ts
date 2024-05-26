import Eye from "$components/icons/Eye.svelte";
import Home from "$components/icons/Home.svelte";
import Login from "$components/icons/Login.svelte";
import Settings from "$components/icons/Settings.svelte";
import type { AsideMenuLink } from "$lib/types";

export const ASIDE_MENU_LINKS: readonly AsideMenuLink[] = [
  {
    href: "/",
    title: "Home",
    icon: Home,
  },
  {
    href: "/settings",
    title: "Settings",
    icon: Settings,
  },
  {
    href: "/contestant",
    title: "Contestants",
    icon: Eye,
    authOnly: true,
  },
  {
    href: "/login",
    title: "Login",
    icon: Login,
    unauthOnly: true,
  },
];
