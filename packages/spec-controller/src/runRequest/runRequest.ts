import type { OutputRequest } from "@3f-consulting/spec-controller-core";

export type ReportFormat = "md" | "json";

// Every input a run can read, in the order the provenance names them.
export const INPUT_KINDS = ["features", "vitest", "jest", "pytest", "junit", "rspec", "cucumber", "workflows", "stepRecord", "manifest"] as const;

export type InputKind = (typeof INPUT_KINDS)[number];

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

const INPUT_FLAGS: Readonly<Record<string, InputKind>> = {
  "--features": "features",
  "--vitest": "vitest",
  "--ci": "workflows",
  "--ci-steps": "stepRecord",
  "--package-json": "manifest",
};

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

const REPORT_FORMATS: readonly string[] = ["md", "json"] satisfies ReportFormat[];

// Each --format names a format and, after its first colon, the file it goes to; with none, Markdown on standard output.
function outputsOf(args: readonly string[]): OutputRequest<ReportFormat>[] {
  const outputs: OutputRequest<ReportFormat>[] = [];
  for (let at = 0; at < args.length; at += 2) {
    const value = args[at + 1];
    if (args[at] !== "--format" || value === undefined) continue;
    const colon = value.indexOf(":");
    const format = colon === -1 ? value : value.slice(0, colon);
    if (REPORT_FORMATS.includes(format))
      outputs.push({ format: format as ReportFormat, destination: colon === -1 ? { to: "standard-output" } : { to: "file", path: value.slice(colon + 1) } });
  }
  return outputs.length === 0 ? [DEFAULT_OUTPUT] : outputs;
}

export function runRequestOf([command, ...args]: readonly string[]): RunRequest {
  if (command === "allocate") return { command, featureCode: args.find((arg) => !arg.startsWith("--")) ?? "", asNewFeatureCode: args.includes("--new") };
  return { command: "balance", inputs: inputsOf(args), outputs: outputsOf(args), strict: false, exitZero: false };
}
