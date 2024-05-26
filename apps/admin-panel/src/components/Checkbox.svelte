<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  import { clsx } from "$lib/clsx";

  interface CheckboxProps
    extends Omit<HTMLInputAttributes, "type" | "class" | "aria-invalid" | "aria-describedby"> {
    label: string;
    id: string;
    errorTextId?: string;
    errorText?: string;
  }

  const { label, id, errorTextId, errorText, ...rest }: CheckboxProps = $props();
</script>

<div class="flex flex-col gap-3">
  <div class="container relative block h-5 select-none pl-7 text-2xl">
    <input
      {id}
      type="checkbox"
      class="peer sr-only"
      aria-invalid={!!errorText}
      aria-describedby={errorTextId}
      {...rest}
    />
    <label
      class={clsx(
        // Reading the following code is unadvised
        // Overall style for the checkbox
        "checkmark absolute left-0 top-0 size-5 select-none rounded-[4px] border-[1px] p-[1px] text-sm transition-colors duration-100",
        // The checkbox in default state
        "border-neutral-300 bg-white dark:border-neutral-800 dark:bg-black",
        // The checkbox when not disabled
        "peer-[:not(:disabled)]:cursor-pointer",
        // The checkbox when hovered and not disabled
        "peer-[:not(:disabled):not(:checked)]:peer-hover:bg-gray-200 peer-[:not(:disabled):not(:checked)]:peer-hover:dark:bg-neutral-800",
        // The checkbox when checked
        "peer-checked:bg-accent-light dark:peer-checked:bg-accent-dark",
        "peer-checked:border-accent-light dark:peer-checked:border-accent-dark",
        // The checkbox when checked or disabled
        "peer-[:is(:disabled,:checked)]:border-accent-light dark:peer-[:is(:disabled,:checked)]:border-accent-dark",
        "peer-[:is(:disabled,:not(:disabled):checked:hover)]:bg-accent-light/80 dark:peer-[:is(:disabled,:not(:disabled):checked:hover)]:bg-accent-dark/80",
        "peer-[:is(:disabled,:not(:disabled):checked:hover)]:border-transparent",
        // The checkmark at the center of the checkbox
        "after:absolute after:left-1/2 after:top-1/2 after:hidden after:-translate-x-1/2 after:-translate-y-1/2 peer-checked:after:block",
        "after:text-base after:text-white after:content-[''] peer-checked:after:content-['✓'] after:dark:text-black peer-checked:after:animate-checkbox-icon",
      )}
      for={id}
    >
      <span class="pl-7">{label}</span>
    </label>
  </div>
  {#if !!errorText && errorTextId}
    <p class="text-error" id={errorTextId}>{errorText}</p>
  {/if}
</div>
