import type { OutputRequest } from "@3f-consulting/spec-controller-core";

export type ReportFormat = "md" | "json";

export type InputKind =
  | "features"
  | "vitest"
  | "jest"
  | "pytest"
  | "junit"
  | "rspec"
  | "cucumber"
  | "workflows"
  | "stepRecord"
  | "manifest";

// byDefault: the command line did not name it, so its default path was filled in.
export interface InputRequest {
  readonly kind: InputKind;
  readonly path: string;
  readonly byDefault: boolean;
}

export type RunRequest =
  | { readonly command: "help"; readonly about?: "balance" | "allocate" }
  | {
      readonly command: "balance";
      readonly inputs: readonly InputRequest[];
      readonly target?: string;
      readonly sourceSha?: string;
      readonly outputs: readonly OutputRequest<ReportFormat>[];
      readonly strict: boolean;
      readonly exitZero: boolean;
    }
  | { readonly command: "allocate"; readonly featureCode: string; readonly asNewFeatureCode: boolean };

export function runRequestOf(_argv: readonly string[]): RunRequest {
  return { command: "balance", inputs: [], outputs: [], strict: false, exitZero: false };
}
