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

const INPUT_FLAGS: Readonly<Record<string, InputKind>> = { "--features": "features", "--vitest": "vitest", "--ci": "workflows", "--ci-steps": "stepRecord" };

// Each flag takes the argument after it as its value.
function inputsOf(args: readonly string[]): InputRequest[] {
  const inputs: InputRequest[] = [];
  for (let at = 0; at < args.length; at += 2) {
    const kind = INPUT_FLAGS[args[at]!];
    const path = args[at + 1];
    if (kind !== undefined && path !== undefined) inputs.push({ kind, path, byDefault: false });
  }
  return inputs;
}

const DEFAULT_OUTPUT: OutputRequest<ReportFormat> = { format: "md", destination: { to: "standard-output" } };

export function runRequestOf([command, ...args]: readonly string[]): RunRequest {
  if (command === "allocate") return { command, featureCode: args.find((arg) => !arg.startsWith("--")) ?? "", asNewFeatureCode: args.includes("--new") };
  return { command: "balance", inputs: inputsOf(args), outputs: [DEFAULT_OUTPUT], strict: false, exitZero: false };
}
