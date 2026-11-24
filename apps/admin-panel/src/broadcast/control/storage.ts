import { ref, watch, type Ref } from 'vue';

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function useStored<T>(key: string, fallback: T): Ref<T> {
  const value = ref(readStored(key, fallback)) as Ref<T>;
  watch(
    value,
    (next) => {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        return;
      }
    },
    { deep: true },
  );
  return value;
}
