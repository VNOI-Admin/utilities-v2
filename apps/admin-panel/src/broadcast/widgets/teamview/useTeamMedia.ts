import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { internalClient } from '~/services/api';
import type { MediaKind } from '../../types';

interface StreamSource {
  username: string;
  streamUrl?: string | null;
  webcamUrl?: string | null;
}

const RETRY_MS = 5000;

export function useTeamMedia(user: Ref<string | null>) {
  const sources = ref<Record<MediaKind, string | null>>({ screen: null, camera: null });
  let retry: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  const load = async (username: string | null, current: number) => {
    if (retry) clearTimeout(retry);
    retry = null;
    if (!username) {
      sources.value = { screen: null, camera: null };
      return;
    }
    try {
      const { data } = await internalClient.get<StreamSource>(`/overlay/source/${encodeURIComponent(username)}`);
      if (current !== generation) return;
      sources.value = { screen: data.streamUrl || null, camera: data.webcamUrl || null };
    } catch {
      if (current !== generation) return;
      retry = setTimeout(() => void load(username, current), RETRY_MS);
    }
  };

  watch(
    user,
    (username) => {
      generation += 1;
      sources.value = { screen: null, camera: null };
      void load(username, generation);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    generation += 1;
    if (retry) clearTimeout(retry);
  });

  return sources;
}
