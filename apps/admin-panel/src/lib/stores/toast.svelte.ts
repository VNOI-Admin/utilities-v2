import type { ToastItem } from "$lib/types";

const createToastStore = () => {
  const _list = $state<ToastItem[]>([]);
  return {
    pop() {
      return _list.pop();
    },
    push(data: ToastItem) {
      _list.push(data);
    },
    delete(index: number) {
      _list.splice(index, 1);
    },
    get list(): readonly ToastItem[] {
      return _list;
    },
  };
};

export const toast = createToastStore();
