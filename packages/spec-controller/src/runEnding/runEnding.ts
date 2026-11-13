export interface Refusal {
  readonly key: string;
  readonly values: Readonly<Record<string, string | number>>;
}

// A run stopped before its work, with what was refused.
export interface RunEnding {
  readonly ending: "usage-error";
  readonly refusals: readonly Refusal[];
}

export type { ExitCode } from "./codes.js";
