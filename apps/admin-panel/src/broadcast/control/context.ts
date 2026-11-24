import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useBroadcastData, type BroadcastData } from '../data';
import { useBroadcastState, withWidget, withoutWidget } from '../state';
import type { BroadcastState, BroadcastWidget, WidgetSettings, WidgetType } from '../types';

export interface BroadcastControl {
  state: Ref<BroadcastState>;
  loaded: Ref<boolean>;
  saving: Ref<boolean>;
  data: BroadcastData;
  shownIds: ComputedRef<Set<string>>;
  apply: (mutate: (state: BroadcastState) => BroadcastState) => Promise<boolean>;
  show: (widget: BroadcastWidget) => Promise<boolean>;
  hide: (id: string) => Promise<boolean>;
}

const KEY: InjectionKey<BroadcastControl> = Symbol('broadcast-control');

export function singleWidget<S extends WidgetSettings>(type: WidgetType, settings: S): BroadcastWidget<S> {
  return { id: type, type, location: type, settings };
}

export function provideBroadcastControl(pollMs = 1000): BroadcastControl {
  const toast = useToast();
  const { state, loaded, update } = useBroadcastState(pollMs);
  const saving = ref(false);
  const data = useBroadcastData(
    computed(() => state.value.contestId),
    computed(() => state.value.medals),
  );

  const apply = async (mutate: (current: BroadcastState) => BroadcastState) => {
    saving.value = true;
    try {
      await update(mutate(state.value));
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update the overlay');
      return false;
    } finally {
      saving.value = false;
    }
  };

  const control: BroadcastControl = {
    state,
    loaded,
    saving,
    data,
    shownIds: computed(() => new Set(Object.keys(state.value.widgets))),
    apply,
    show: (widget) => apply((current) => withWidget(current, widget)),
    hide: (id) => apply((current) => withoutWidget(current, id)),
  };
  provide(KEY, control);
  return control;
}

export function useBroadcastControl(): BroadcastControl {
  const control = inject(KEY);
  if (!control) throw new Error('Broadcast control is not provided');
  return control;
}
