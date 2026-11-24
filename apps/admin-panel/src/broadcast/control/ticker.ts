import type { Component } from 'vue';
import { Clock, Trophy, Type } from 'lucide-vue-next';
import type { TickerMessage, TickerPart } from '../types';

export type TickerType = TickerMessage['type'];

export const TYPE_META: Record<TickerType, { label: string; icon: Component }> = {
  clock: { label: 'Clock', icon: Clock },
  text: { label: 'Text', icon: Type },
  scoreboard: { label: 'Scoreboard', icon: Trophy },
};

export const PART_TYPES: Record<TickerPart, TickerType[]> = {
  short: ['clock', 'text'],
  long: ['clock', 'scoreboard', 'text'],
};

export const PART_META: Record<TickerPart, { title: string; description: string }> = {
  short: { title: 'Short part', description: 'The narrow block on the left of the ticker.' },
  long: { title: 'Long part', description: 'The wide scrolling block of the ticker.' },
};

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function newTickerMessage(part: TickerPart, type: TickerType): TickerMessage {
  const base = { id: newId(), part, type, periodMs: 30000 };
  if (type === 'text') return { ...base, text: '' };
  if (type === 'scoreboard') return { ...base, from: 1, to: 12 };
  return base;
}
