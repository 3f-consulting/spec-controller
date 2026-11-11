// Held in the app, not in core's domain, because this module loads with the crash guards, before core does.
export const VERDICT_EXIT_CODE: Readonly<Record<"balanced" | "out-of-balance" | "not-reconciled", number>> = {
  balanced: 0,
  "out-of-balance": 1,
  "not-reconciled": 3,
};

export const USAGE_EXIT_CODE = 2;

// A process outcome, not a verdict: the run never reached one, so no verdict code may stand for it.
const UNEXPECTED_ERROR_EXIT_CODE = 4;

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

export function endRunOn(ending: RunEnding, proc: ExitCodeHolder = process): void {
  proc.exitCode = codeOf(ending);
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
