import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import type { ExitCode } from "./runEnding.js";

export function exitCodeOf(_runVerdict: RunVerdict): ExitCode {
  return 0;
}

export const USAGE_ERROR: ExitCode = 2;

export const UNEXPECTED_ERROR: ExitCode = 4;

export function endRunOn(exitCode: ExitCode): void {
  process.exitCode = exitCode;
}
