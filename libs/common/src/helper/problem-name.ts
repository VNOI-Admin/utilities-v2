/**
 * Resolves the human-facing name for a problem: the manually-provided display
 * name (alias) when set, otherwise the raw problem `code`.
 *
 * This is the single source of truth for the contest problem-name mapping, so
 * every surface that shows a problem (scoreboards, submission feeds, the
 * reaction grid) renders the same value. `code` remains the join key used for
 * data lookups — only the displayed text is overridden.
 */
export function resolveProblemName(code: string, displayName?: string | null): string {
  const trimmed = displayName?.trim();
  return trimmed ? trimmed : code;
}
