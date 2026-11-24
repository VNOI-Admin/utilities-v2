import type { BroadcastRow } from '../data';

export const ALL_GROUPS = 'all';

export interface GroupOption {
  value: string;
  label: string;
}

export function groupKey(row: BroadcastRow): string | undefined {
  return row.participant.groupCode || row.groupName || undefined;
}

export function groupOptionsFor(rows: BroadcastRow[]): GroupOption[] {
  const groups = new Map<string, { name: string; count: number }>();
  for (const row of rows) {
    const key = groupKey(row);
    if (!key) continue;
    const entry = groups.get(key) ?? { name: row.groupName || key, count: 0 };
    entry.count++;
    groups.set(key, entry);
  }
  return [
    { value: ALL_GROUPS, label: `All groups · ${rows.length}` },
    ...[...groups.entries()]
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([value, { name, count }]) => ({ value, label: `${name} · ${count}` })),
  ];
}
