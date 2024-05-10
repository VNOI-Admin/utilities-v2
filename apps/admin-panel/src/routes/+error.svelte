<script>
  import { page } from "$app/stores";
</script>

<div class="flex h-full w-full items-center justify-center">
  <div class="flex w-[90dvw] max-w-[500px] flex-col justify-center gap-6 rounded-md p-10">
    <h1>
      <span class="sr-only">An error occurred - </span>{$page.status}
    </h1>
    <h2>{$page.error?.message}</h2>
    <div class="flex flex-row items-center gap-2">
      <enhanced:img src="$images/VNOI.png" alt="" class="min-w-8 max-w-8 min-h-8 max-h-8" />
      <h2>VCS Admin Panel</h2>
    </div>
    <button class="button filled" onclick={() => window.location.reload()}>Refresh</button>
  </div>
</div>
