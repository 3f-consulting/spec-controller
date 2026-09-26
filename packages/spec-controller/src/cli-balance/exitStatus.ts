/**
 * The codes `--exit-zero` moves to 0: the two VERDICTS on the target —
 * out-of-balance and pending-under-`--strict`. Enumerated rather than "anything non-zero", because
 * unsound (4) and nothing-to-reconcile (5) are not verdicts but the absence of a trustworthy one,
 * and suppressing a verdict never suppresses that. Usage (2) exits before the ladder is reached.
 */
const VERDICT_CODES: ReadonlySet<number> = new Set([1, 3]);

/** The status the process leaves for a verdict code, live or re-rendered, with or without `--exit-zero`. */
export function statusFor(code: number, exitZero: boolean): number {
  return exitZero && VERDICT_CODES.has(code) ? 0 : code;
}
