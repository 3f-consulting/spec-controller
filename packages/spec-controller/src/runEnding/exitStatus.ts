import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import { VERDICT_EXIT_CODE } from "./exitCode.js";

export function exitCodeOf({ verdict }: RunVerdict, exitZero: boolean): number {
  return exitZero && verdict === "out-of-balance" ? 0 : VERDICT_EXIT_CODE[verdict];
}
