import { onBeforeUnmount, shallowRef, watch } from 'vue';
import type { TickerMessage } from '../../types';

export function useTickerRotation(messages: () => TickerMessage[]) {
  const current = shallowRef<TickerMessage | null>(null);
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const show = (next: number) => {
    clearTimeout(timer);
    const list = messages();
    if (list.length === 0) {
      current.value = null;
      return;
    }
    index = next % list.length;
    current.value = list[index];
    timer = setTimeout(() => show(index + 1), Math.max(1000, current.value.periodMs));
  };

  watch(
    () => JSON.stringify(messages()),
    () => {
      const list = messages();
      const shown = current.value;
      const at = shown ? list.findIndex((message) => message.id === shown.id) : -1;
      if (at === -1) {
        show(shown ? index : 0);
        return;
      }
      index = at;
      if (JSON.stringify(list[at]) !== JSON.stringify(shown)) current.value = list[at];
    },
    { immediate: true },
  );

  onBeforeUnmount(() => clearTimeout(timer));

  return current;
}
