import { AppMessage, type PlainAppMessage } from "../messages/messages.js";
import type { RunInput } from "@3f-consulting/spec-controller-core";

export interface EvidenceInput {
  readonly flag: string;
  // Held, not derived from the flag: it names a field of the JSON report, a published format.
  readonly key: string;
  readonly arg: string;
  readonly description: PlainAppMessage;
}

// The order is the canonical order: the help lists the flags in it, the pre-checks take the inputs in it,
// and the run provenance names them in it.
const DECLARED = [
  { flag: "features", key: "features", arg: "<dir>", description: AppMessage.FeaturesFlag },
  { flag: "vitest", key: "vitest", arg: "<report.json>", description: AppMessage.VitestFlag },
  { flag: "pytest", key: "pytest", arg: "<report.xml>", description: AppMessage.PytestFlag },
  { flag: "jest", key: "jest", arg: "<report.json>", description: AppMessage.JestFlag },
  { flag: "junit", key: "junit", arg: "<report.xml>", description: AppMessage.JunitFlag },
  { flag: "rspec", key: "rspec", arg: "<report.json>", description: AppMessage.RspecFlag },
  { flag: "cucumber", key: "cucumber", arg: "<report.json>", description: AppMessage.CucumberFlag },
  { flag: "ci", key: "ci", arg: "<ci.yml>", description: AppMessage.CiFlag },
  { flag: "package-json", key: "packageJson", arg: "<path>", description: AppMessage.PackageJsonFlag },
  { flag: "ci-steps", key: "ciSteps", arg: "<record.json>", description: AppMessage.CiStepsFlag },
] as const satisfies readonly EvidenceInput[];

export const EVIDENCE_INPUTS: readonly EvidenceInput[] = DECLARED;

type InputKey = (typeof DECLARED)[number]["key"];

export type InputPaths = Readonly<Partial<Record<InputKey, string>>>;

export function inputPathsOf(args: Readonly<Record<string, string>>): InputPaths {
  return Object.fromEntries(EVIDENCE_INPUTS.map(({ flag, key }) => [key, args[flag]]));
}

export function runInputsOf(paths: InputPaths): RunInput[] {
  return EVIDENCE_INPUTS.map(({ key }) => ({ name: key, path: paths[key as InputKey] }));
}

// What the request hands the inputs port: each input's kind, the flag that names it, and its path if one was given.
interface RequestedInput {
  readonly kind: string;
  readonly flag: string;
  readonly path: string | undefined;
}

export function requestedInputsOf(args: Readonly<Record<string, string>>): RequestedInput[] {
  return EVIDENCE_INPUTS.map(({ flag, key }) => ({ kind: key, flag, path: args[flag] }));
}
