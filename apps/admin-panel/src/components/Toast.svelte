<script lang="ts">
  import type { ComponentType, SvelteComponent } from "svelte";
  import type { SVGAttributes } from "svelte/elements";
  import { fly } from "svelte/transition";

  import { settings } from "$lib/stores/settings.svelte";
  import { toast } from "$lib/stores/toast.svelte";
  import type { ToastVariant } from "$lib/types";

  import Check from "./icons/Check.svelte";
  import ExclamationMark from "./icons/ExclamationMark.svelte";
  import X from "./icons/X.svelte";

  const mapVariantToIcon = {
    error: X,
    success: Check,
    warning: ExclamationMark,
    info: ExclamationMark,
  } satisfies Record<ToastVariant, ComponentType<SvelteComponent<SVGAttributes<SVGElement>>>>;

  $effect(() => {
    let timeout: NodeJS.Timeout | undefined = undefined;
    if (toast.list.length > 0) {
      timeout = setTimeout(() => {
        toast.pop();
      }, settings.toastTimeout);
    }
    return () => clearTimeout(timeout);
  });
</script>

<div class="toast-container">
  {#each toast.list as { variant, time, title, message }, index (time)}
    {@const IconComponent = mapVariantToIcon[variant]}
    <div
      class={`toast toast-item ${variant}`}
      in:fly={{ y: 10, duration: 150 }}
      out:fly={{ y: -10, duration: 150 }}
    >
      <div class="flex flex-col gap-2" role="status">
        <div class="flex flex-row items-center gap-2">
          <span class="max-h-5 min-h-5 min-w-5 max-w-5">
            <IconComponent width={20} height={20} class={`toast-icon ${variant}`} />
          </span>
          <h4>{title}</h4>
        </div>
        <span class="[&>*]:!m-0">
          {message}
        </span>
      </div>
      <div class="flex min-w-max items-center">
        <button
          class={`toast max-h-9 min-h-9 min-w-9 max-w-9 rounded-md p-2 transition-all hover:brightness-75 dark:hover:brightness-150 ${variant}`}
          onclick={() => toast.delete(index)}
        >
          <X width={20} height={20} />
          <span class="sr-only">Acknowledge</span>
        </button>
      </div>
    </div>
  {/each}
</div>
