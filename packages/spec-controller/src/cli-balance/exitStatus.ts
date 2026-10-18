import { isFailingVerdict, type VerdictCode } from "@3f-consulting/spec-controller-core";

export function statusFor(code: VerdictCode, exitZero: boolean): number {
  return exitZero && isFailingVerdict(code) ? 0 : code;
}
