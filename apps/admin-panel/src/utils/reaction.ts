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
    return 'text-mission-muted';
  }
  return rankAfter < rankBefore ? 'text-mission-ok' : 'text-mission-red';
}

export function verdictClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'AC':
      return 'bg-mission-ok/15 text-mission-ok';
    case 'PAC':
      return 'bg-mission-cyan/15 text-mission-cyan';
    case 'WA':
    case 'RTE':
    case 'RE':
    case 'IR':
      return 'bg-mission-red/15 text-mission-red';
    case 'TLE':
    case 'MLE':
    case 'OLE':
    case 'SC':
    case 'CE':
      return 'bg-mission-amber/15 text-mission-amber';
    default:
      return 'bg-white/10 text-gray-300';
  }
}

/**
 * Raw verdict colour, for effects Tailwind classes cannot express (gradients,
 * shadows built from a runtime value). Keep in sync with `verdictClass`.
 */
export function verdictColor(status?: string): string {
  switch ((status ?? '').toUpperCase()) {
    case 'AC':
      return '#7ee2b8';
    case 'PAC':
      return '#9fd8ff';
    case 'WA':
    case 'RTE':
    case 'RE':
    case 'IR':
      return '#ff9bb3';
    case 'TLE':
    case 'MLE':
    case 'OLE':
    case 'SC':
    case 'CE':
      return '#f5c98a';
    default:
      return '#8b8b9a';
  }
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
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
