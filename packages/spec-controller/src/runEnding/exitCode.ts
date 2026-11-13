import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import type { ExitCode } from "./runEnding.js";

const EXIT_CODES: Readonly<Record<RunVerdict["verdict"], ExitCode>> = { balanced: 0, "out-of-balance": 1, "not-reconciled": 3 };

export function exitCodeOf(runVerdict: RunVerdict, _under: { readonly exitZero: boolean } = { exitZero: false }): ExitCode {
  return EXIT_CODES[runVerdict.verdict];
}

export const USAGE_ERROR: ExitCode = 2;

export const UNEXPECTED_ERROR: ExitCode = 4;

export function endRunOn(exitCode: ExitCode): void {
  process.exitCode = exitCode;
}
