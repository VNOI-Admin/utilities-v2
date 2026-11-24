import { onBeforeUnmount, ref } from 'vue';
import { internalClient } from '~/services/api';
import type { BroadcastState, BroadcastWidget } from './types';

export function defaultBroadcastState(): BroadcastState {
  return {
    contestId: '',
    widgets: {},
    ticker: [
      { id: 'clock', part: 'short', type: 'clock', periodMs: 30000 },
      { id: 'standings', part: 'long', type: 'scoreboard', periodMs: 20000, from: 1, to: 24 },
    ],
    visual: {},
    medals: { gold: 4, silver: 4, bronze: 4 },
  };
}

export async function fetchBroadcastState(): Promise<BroadcastState> {
  const { data } = await internalClient.get<BroadcastState | null>('/overlay/broadcast');
  return { ...defaultBroadcastState(), ...(data ?? {}) };
}

export async function saveBroadcastState(state: BroadcastState): Promise<BroadcastState> {
  const { data } = await internalClient.put<BroadcastState>('/overlay/broadcast', state);
  return data;
}

export function withWidget(state: BroadcastState, widget: BroadcastWidget): BroadcastState {
  return { ...state, widgets: { ...state.widgets, [widget.id]: widget } };
}

export function withoutWidget(state: BroadcastState, id: string): BroadcastState {
  const widgets = { ...state.widgets };
  delete widgets[id];
  return { ...state, widgets };
}

export function useBroadcastState(pollMs = 1000) {
  const state = ref<BroadcastState>(defaultBroadcastState());
  const loaded = ref(false);

  let version = 0;
  let saving = 0;

  const load = async () => {
    const started = version;
    try {
      const next = await fetchBroadcastState();
      if (started === version && saving === 0) state.value = next;
      loaded.value = true;
    } catch (error) {
      console.error('Failed to load broadcast state', error);
    }
  };

  const update = async (next: BroadcastState) => {
    version++;
    saving++;
    state.value = next;
    try {
      state.value = await saveBroadcastState(next);
    } finally {
      saving--;
    }
  };

  void load();
  const timer = pollMs > 0 ? setInterval(load, pollMs) : null;
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
  });

  return { state, loaded, load, update };
}
