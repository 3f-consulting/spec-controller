import type { ExitCodeOf, RunVerdict } from "@3f-consulting/spec-controller-core";

export const EXIT_CODE: Readonly<Record<RunVerdict, number>> = {
  balanced: 0,
  "out-of-balance": 1,
  "claim-code-errors": 1,
  pending: 3,
  unsound: 4,
  "nothing-to-reconcile": 5,
};

const MOVED_BY_EXIT_ZERO: ReadonlySet<RunVerdict> = new Set<RunVerdict>([
  "out-of-balance",
  "claim-code-errors",
  "pending",
]);

export function exitCodeOf(verdict: RunVerdict, exitZero: boolean): number {
  return exitZero && MOVED_BY_EXIT_ZERO.has(verdict) ? 0 : EXIT_CODE[verdict];
}

export const reportedExitCodeOf: ExitCodeOf = (verdict) => exitCodeOf(verdict, false);
