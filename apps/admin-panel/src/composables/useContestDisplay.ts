import type { ContestStatus } from '~/stores/contests';

type BadgeProps = { text: string; variant?: 'ok' | 'cyan' | 'amber' | 'gray'; showDot?: boolean };

const STATUS_BADGES: Record<ContestStatus, BadgeProps> = {
  ongoing: { text: 'Ongoing', variant: 'ok', showDot: true },
  frozen: { text: 'Frozen', variant: 'amber', showDot: true },
  upcoming: { text: 'Upcoming', variant: 'cyan' },
  past: { text: 'Ended', variant: 'gray' },
};

export function contestStatusBadge(status: ContestStatus | string): BadgeProps {
  return STATUS_BADGES[status as ContestStatus] ?? { text: status, variant: 'gray' };
}

export function formatClock(date: string | Date, withSeconds = false): string {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  });
}

export function formatDay(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export function formatSchedule(start: string | Date, end: string | Date): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) {
    return `${formatDay(s)} · ${formatClock(s)}–${formatClock(e)}`;
  }
  return `${formatDay(s)} ${formatClock(s)} – ${formatDay(e)} ${formatClock(e)}`;
}

export function formatFullDateTime(date: string | Date): string {
  return `${formatDay(date)} ${formatClock(date, true)}`;
}
