import type { RunVerdict } from "@3f-consulting/spec-controller-core";

export interface Refusal {
  readonly key: string;
  readonly values: Readonly<Record<string, string | number>>;
}

export type RunEnding =
  // An unexpected error after the verdict is told once, and leaves the verdict's exit code alone.
  | { readonly ending: "verdict"; readonly runVerdict: RunVerdict; readonly unexpectedErrorAfter?: unknown }
  | { readonly ending: "answer" }
  | { readonly ending: "usage-error"; readonly refusals: readonly Refusal[] }
  | { readonly ending: "unexpected-error"; readonly error: unknown };

export type ExitCode = 0 | 1 | 2 | 3 | 4;
