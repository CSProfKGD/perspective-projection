export const DISSOLVE_DURATION_MS = 220;

export function dissolveValue(
  from: number,
  to: number,
  elapsedMs: number,
  durationMs = DISSOLVE_DURATION_MS,
) {
  if (durationMs <= 0) return to;
  const progress = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  const eased = progress * progress * (3 - 2 * progress);
  return from + (to - from) * eased;
}
