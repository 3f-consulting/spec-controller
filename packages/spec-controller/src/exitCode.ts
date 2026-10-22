export const USAGE_EXIT_CODE = 2;

// A process outcome, not a verdict: the ledger was never finished, so no verdict code may stand for it.
const UNEXPECTED_ERROR_EXIT_CODE = 6;

export type RunEnding =
  | { readonly kind: "verdict"; readonly code: number }
  | { readonly kind: "answer"; readonly code: number }
  | { readonly kind: "usage-refusal" }
  | { readonly kind: "unexpected-error" };

export const USAGE_REFUSAL: RunEnding = { kind: "usage-refusal" };

export const UNEXPECTED_ERROR: RunEnding = { kind: "unexpected-error" };

export interface ExitCodeHolder {
  exitCode?: number | string | null | undefined;
}

// What this run last set, so the crash guard reads the record rather than whatever the process now holds.
let codeSet: number | undefined;

export function forgetRunEnding(): void {
  codeSet = undefined;
}

export function endRunOn(ending: RunEnding, proc: ExitCodeHolder = process): void {
  codeSet = codeOf(ending);
  proc.exitCode = codeSet;
}

// An unknown command is answered on the usage code, so it counts as a refusal here as well.
export function usageRefusalSet(): boolean {
  return codeSet === USAGE_EXIT_CODE;
}

function codeOf(ending: RunEnding): number {
  switch (ending.kind) {
    case "verdict":
    case "answer":
      return ending.code;
    case "usage-refusal":
      return USAGE_EXIT_CODE;
    case "unexpected-error":
      return UNEXPECTED_ERROR_EXIT_CODE;
  }
}
