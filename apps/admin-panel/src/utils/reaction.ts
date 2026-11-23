import type { ReactionVideoItem } from '~/types/reaction';

/**
 * Headline for a clip: "<full name> solved <problem name>". `teamName` is
 * already the participant's full name (falling back to their username) as
 * resolved by the internal service. Degrades to whatever half is known — never
 * to the S3 object key, which is a file name, not something to show a viewer.
 */
export function reactionTitle(item: ReactionVideoItem): string {
  const name = item.teamName || item.author;
  const problem = item.problemDisplayName || item.problemCode;
  if (name && problem) {
    return `${name} solved ${problem}`;
  }
  if (name) {
    return name;
  }
  if (problem) {
    return `Unknown team solved ${problem}`;
  }
  return 'Unidentified clip';
}

/** Two-letter avatar text, preferring the group over the team. */
export function reactionMonogram(item: ReactionVideoItem): string {
  const source = item.group || item.teamName || item.author || '?';
  const words = source.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/** "#4 ▲2" when the submission moved the team, "#4" when it did not. */
export function rankDelta(item: ReactionVideoItem): string {
  const { rankBefore, rankAfter } = item;
  if (!rankAfter || rankAfter <= 0) {
    return '';
  }
  if (!rankBefore || rankBefore <= 0 || rankBefore === rankAfter) {
    return `#${rankAfter}`;
  }
  const arrow = rankAfter < rankBefore ? '▲' : '▼';
  return `#${rankAfter} ${arrow}${Math.abs(rankBefore - rankAfter)}`;
}

export function rankClass(item: ReactionVideoItem): string {
  const { rankBefore, rankAfter } = item;
  if (!rankBefore || !rankAfter || rankBefore === rankAfter) {
    return 'text-gray-500';
  }
  return rankAfter < rankBefore ? 'text-mission-accent' : 'text-mission-red';
}

export function verdictClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'AC':
      return 'bg-mission-accent/15 border-mission-accent/60 text-mission-accent';
    case 'PAC':
      return 'bg-mission-cyan/15 border-mission-cyan/60 text-mission-cyan';
    case 'WA':
    case 'RTE':
    case 'RE':
    case 'IR':
      return 'bg-mission-red/15 border-mission-red/60 text-mission-red';
    case 'TLE':
    case 'MLE':
    case 'OLE':
    case 'SC':
    case 'CE':
      return 'bg-mission-amber/15 border-mission-amber/60 text-mission-amber';
    default:
      return 'bg-white/10 border-white/30 text-gray-300';
  }
}

/**
 * Raw verdict colour, for effects Tailwind classes cannot express (gradients,
 * shadows built from a runtime value). Keep in sync with `verdictClass`.
 */
export function verdictColor(status?: string): string {
  switch ((status ?? '').toUpperCase()) {
    case 'AC':
      return '#00ff9d';
    case 'PAC':
      return '#00d4ff';
    case 'WA':
    case 'RTE':
    case 'RE':
    case 'IR':
      return '#ff3366';
    case 'TLE':
    case 'MLE':
    case 'OLE':
    case 'SC':
    case 'CE':
      return '#ffb830';
    default:
      return '#7a7a7a';
  }
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function relativeTime(iso?: string): string {
  if (!iso) {
    return '—';
  }
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return iso;
  }
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  const units: [number, string][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [2592000, 'day'],
  ];
  if (seconds < 60) {
    return 'just now';
  }
  for (let i = 1; i < units.length; ++i) {
    if (seconds < units[i][0]) {
      const value = Math.floor(seconds / units[i - 1][0]);
      return `${value} ${units[i][1]}${value === 1 ? '' : 's'} ago`;
    }
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
}

export function formatBytes(n: number | undefined): string {
  if (n === undefined || n === null) {
    return '—';
  }
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
