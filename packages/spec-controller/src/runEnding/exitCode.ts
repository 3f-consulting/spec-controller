import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import { type ExitCode } from "./codes.js";

export { UNEXPECTED_ERROR, USAGE_ERROR } from "./codes.js";

const EXIT_CODES: Readonly<Record<RunVerdict["verdict"], ExitCode>> = { balanced: 0, "out-of-balance": 1, "not-reconciled": 3 };

// --exit-zero moves only an out-of-balance run's code, to 0.
export function exitCodeOf(runVerdict: RunVerdict, under: { readonly exitZero: boolean }): ExitCode {
  return under.exitZero && runVerdict.verdict === "out-of-balance" ? 0 : EXIT_CODES[runVerdict.verdict];
}

export function endRunOn(exitCode: ExitCode): void {
  process.exitCode = exitCode;
}

// An unexpected error ends the run on its code only when the run has no code yet: after the verdict, the verdict's stays.
export function endRunUnlessEnded(exitCode: ExitCode): void {
  if (process.exitCode === undefined) process.exitCode = exitCode;
}
