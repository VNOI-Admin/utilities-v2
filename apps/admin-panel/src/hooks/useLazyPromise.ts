import type { ToRefs } from 'vue';

interface Options<T> {
  onComplete?: (result: T | null) => void;
  onError?: (error: any) => void;
}

export default function useLazyPromise<T = any>(fn?: () => Promise<T>, options?: Options<T>) {
  const response = shallowReactive<{
    loading: boolean;
    result: T | null;
    error: any;
  }>({
    loading: false,
    result: null,
    error: null,
  });

  async function run(): Promise<void> {
    if (!fn) return;
    response.loading = true;
    response.result = null;
    response.error = null;

    try {
      response.result = await fn();
      options?.onComplete?.(response.result);
    } catch (error: any) {
      response.error = error?.response?.data;
      options?.onError?.(response.error);
    } finally {
      response.loading = false;
    }
  }

  return [run, toRefs(response)] as [
    () => Promise<void>,
    ToRefs<{ loading: boolean; result: T | undefined; error: any }>,
  ];
}
