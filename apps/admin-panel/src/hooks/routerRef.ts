import { WritableComputedRef } from 'vue';

// need to do this because the `router.replace` is an async function
// which can cause race conditions if the value is set multiple times in a short period
// so we need to keep track of the current route query in a sync way

// im not sure if this is the best way to do it, but it works for now
// i have tested it and it works as expected
let currentRouteQuery = {
  path: '',
  query: {},
};

export default function routerRef<T>(key: string, defaultValue?: T): WritableComputedRef<T> {
  const route = useRoute();
  const router = useRouter();
  return computed({
    get: () => {
      const value = route.query[key];
      if (value) {
        if (typeof value === 'number') {
          return value as T;
        } else {
          return JSON.parse(value as string);
        }
      }
      return defaultValue;
    },
    set: (value: T) => {
      if (currentRouteQuery.path !== route.path) {
        currentRouteQuery = {
          path: route.path,
          query: route.query,
        };
      }

      const query = {
        ...currentRouteQuery.query,
        [key]: JSON.stringify(value),
      };
      currentRouteQuery.query = query;
      void router.replace({ query });
    },
  });
}
