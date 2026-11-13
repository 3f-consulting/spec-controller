import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import type { ExitCode } from "./runEnding.js";

export function exitCodeOf(_runVerdict: RunVerdict): ExitCode {
  return 0;
}

export function endRunOn(runVerdict: RunVerdict): void {
  process.exitCode = exitCodeOf(runVerdict);
}

const USAGE_ERROR: ExitCode = 2;

export function endRunOnUsageError(): void {
  process.exitCode = USAGE_ERROR;
}
