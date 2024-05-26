<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  import { clsx } from "$lib/clsx";

  interface InputProps extends Omit<HTMLInputAttributes, "placeholder" | "class" | "aria-invalid" | "aria-describedby"> {
    label: string;
    id: string;
    errorTextId?: string;
    errorText?: string;
  }

  const { label, id, errorTextId, errorText, ...rest }: InputProps = $props();
</script>

<div class="flex flex-col gap-3">
  <div class="relative">
    <input
      {id}
      class={clsx(
        "input block h-[44px] w-full rounded-md px-2.5 pt-2.5 text-sm shadow-md transition-opacity disabled:opacity-50",
        "focus:border-accent-light dark:focus:border-accent-dark border border-neutral-300 focus:outline-none dark:border-neutral-800",
        "bg-white text-black opacity-80 dark:bg-neutral-900 dark:text-white",
      )}
      aria-invalid={!!errorText}
      aria-describedby={errorTextId}
      placeholder=" "
      {...rest}
    />
    <label
      class="label absolute left-2.5 line-clamp-1 select-none font-medium transition-all duration-100 ease-in"
      for={id}
    >
      {label}
    </label>
  </div>
  {#if !!errorText && errorTextId}
    <p class="text-error" id={errorTextId}>{errorText}</p>
  {/if}
</div>
