import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import type { ExitCode } from "./runEnding.js";

export function exitCodeOf(_runVerdict: RunVerdict): ExitCode {
  return 0;
}
