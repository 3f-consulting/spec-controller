const VERDICT_CODES: ReadonlySet<number> = new Set([1, 3]);

export function statusFor(code: number, exitZero: boolean): number {
  return exitZero && VERDICT_CODES.has(code) ? 0 : code;
}
