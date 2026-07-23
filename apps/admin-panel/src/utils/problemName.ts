/**
 * Resolves the human-facing name for a problem: the manually-provided display
 * name (alias) when set, otherwise the raw problem `code`. Mirrors the backend
 * `resolveProblemName` helper so every surface renders the same value.
 */
export function resolveProblemName(code: string, displayName?: string | null): string {
  const trimmed = displayName?.trim();
  return trimmed ? trimmed : code;
}
