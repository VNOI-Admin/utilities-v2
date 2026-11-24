/**
 * Resolves the human-facing name for a problem: the manually-provided display
 * name (alias) when set, otherwise the raw problem `code`. Mirrors the backend
 * `resolveProblemName` helper so every surface renders the same value.
 */
export function resolveProblemName(code: string, displayName?: string | null): string {
  const trimmed = displayName?.trim();
  return trimmed ? trimmed : code;
}

export interface ProblemLike {
  code: string;
  displayName?: string | null;
  name?: string | null;
  label?: string | null;
  ordinal?: number | null;
}

export function problemLetter(index: number): string {
  let letter = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;
  }
  return letter;
}

export function labelProblems<T extends ProblemLike>(problems: T[]): (T & { letter: string; fullName: string })[] {
  return [...problems]
    .sort(
      (a, b) =>
        (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER) || a.code.localeCompare(b.code),
    )
    .map((problem, index) => ({
      ...problem,
      letter: problem.label?.trim() || problemLetter(index),
      fullName: problem.displayName?.trim() || problem.name?.trim() || problem.code,
    }));
}

export function problemTitle(letter: string, fullName: string): string {
  return letter === fullName ? letter : `${letter} · ${fullName}`;
}
