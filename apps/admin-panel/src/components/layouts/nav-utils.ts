import { ASIDE_MENU_LINKS } from "./nav-constants";

export const filterAsideLinks = (isLoggedIn: boolean, isAdmin: boolean) => {
  return ASIDE_MENU_LINKS.filter(
    (e) =>
      (!e.authOnly || isLoggedIn) && (!e.adminOnly || isAdmin) && (!e.unauthOnly || !isLoggedIn),
  );
};
