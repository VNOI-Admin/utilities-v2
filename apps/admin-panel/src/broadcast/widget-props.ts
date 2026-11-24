import type { VisualConfig } from './config';
import type { BroadcastData } from './data';
import type { BroadcastState, BroadcastWidget } from './types';

export interface WidgetProps<S = BroadcastWidget['settings']> {
  widget: BroadcastWidget<S>;
  data: BroadcastData;
  visual: VisualConfig;
  state: BroadcastState;
}
