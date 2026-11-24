import { computed, ref, watch, type Ref } from 'vue';
import type { ScrollDirection } from '../../types';

export function useScroller(
  total: Ref<number>,
  onPage: Ref<number>,
  interval: () => number,
  direction: () => ScrollDirection | undefined,
) {
  const page = ref(0);
  const perScreen = computed(() => Math.max(1, onPage.value));
  const numPages = computed(() => Math.max(1, Math.ceil(total.value / perScreen.value)));
  const perPage = computed(() => Math.ceil(total.value / numPages.value));
  const currentPage = computed(() => Math.min(page.value, numPages.value - 1));

  watch(
    [direction, numPages],
    ([value]) => {
      if (value === 'FirstPage') page.value = 0;
      else if (value === 'LastPage') page.value = numPages.value - 1;
    },
    { immediate: true },
  );

  watch(
    [direction, interval],
    ([value, ms], _, onCleanup) => {
      if (value === 'Pause' || value === 'FirstPage' || value === 'LastPage') return;
      const timer = setInterval(() => {
        const next = currentPage.value + (value === 'Back' ? -1 : 1);
        page.value = next < 0 ? numPages.value - 1 : next >= numPages.value ? 0 : next;
      }, ms);
      onCleanup(() => clearInterval(timer));
    },
    { immediate: true },
  );

  return computed(() => {
    const end = Math.min((currentPage.value + 1) * perPage.value, total.value);
    return Math.max(0, end - perScreen.value);
  });
}
