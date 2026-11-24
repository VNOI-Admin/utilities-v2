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

export function problemLetter(index: number): string {
  let letter = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;
  }
  return letter;
}

export function problemLetters(
  problems: { code: string; label?: string | null; ordinal?: number | null }[],
): Map<string, string> {
  const sorted = [...problems].sort(
    (a, b) =>
      (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER) || a.code.localeCompare(b.code),
  );
  return new Map(sorted.map((problem, index) => [problem.code, problem.label?.trim() || problemLetter(index)]));
}
