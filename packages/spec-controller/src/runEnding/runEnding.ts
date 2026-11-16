export interface Refusal {
  readonly key: string;
  readonly values: Readonly<Record<string, string | number>>;
}

export type { ExitCode } from "./codes.js";
