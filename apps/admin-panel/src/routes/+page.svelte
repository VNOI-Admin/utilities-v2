<script lang="ts">
  import Link from "$components/Link.svelte";
  import { filterAsideLinks } from "$components/layouts/nav-utils.js";

  const { data } = $props();
  const asideMenuLinks = $derived(filterAsideLinks(!!data.user, data.user?.isAdmin ?? false).filter(e => e.href !== "/"));
</script>

<div class="flex h-full w-full flex-col gap-4 p-4 md:p-10">
  <div
    class="dark:bg-neutral-1000 flex w-full flex-row flex-wrap items-center gap-8 rounded-xl bg-white p-8 shadow-lg"
  >
    <enhanced:img src="$images/no-avatar.webp" class="h-auto w-[150px] rounded-full" alt=""
    ></enhanced:img>
    <div>
      <h1>
        <span class="sr-only">Home of</span>
        {#if data.user?.username}
          {data.user.username}
        {:else}
          Guest
        {/if}
      </h1>
      <h2 class="line-clamp-3">Welcome to The VCS Project. Stay frosty.</h2>
    </div>
  </div>
  <div class="flex w-fit max-w-full flex-wrap gap-12 p-8">
    {#each asideMenuLinks as { href, title, icon: Icon }}
      <Link
        {href}
        class="group flex w-fit flex-1 flex-col items-center justify-center gap-4 rounded-lg p-2"
      >
        <Icon width={48} height={48} class="max-h-12 min-h-12 min-w-12 max-w-12" />
        <p
          class="text-comment group-hover:bg-accent-light dark:group-hover:bg-accent-dark p-1 transition-colors duration-75 group-hover:text-white dark:group-hover:text-black"
        >
          {title}
        </p>
      </Link>
    {/each}
  </div>
</div>
