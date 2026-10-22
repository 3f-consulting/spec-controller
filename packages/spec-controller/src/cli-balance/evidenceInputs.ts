import { AppMessage, type PlainAppMessage } from "../messages.js";
import {
  CI_STEP_RECORD,
  CUCUMBER_REPORT,
  JUNIT_REPORT,
  PACKAGE_MANIFEST,
  RSPEC_REPORT,
  VITEST_REPORT,
  type Shape,
} from "../ingest/inputShapes.js";
import type { EvidenceReader } from "../ingest/ingestQualityChecks.js";
import type { ReportFormat } from "../ingest/reportReading.js";
import type { RunInput, RunInputName } from "@3f-consulting/spec-controller-core";

export interface ReportInput {
  readonly reader: EvidenceReader;
  readonly format: ReportFormat;
  readonly shape: Shape;
  readonly subject: AppMessage.FlaggedReport | AppMessage.FlaggedRecord | AppMessage.FlaggedManifest;
  readonly writer: PlainAppMessage;
  readonly takesADirectory?: true;
}

export interface EvidenceInput {
  readonly flag: string;
  // Held, not derived from the flag: it keys the saved report's JSON, a published format.
  readonly key: string;
  readonly arg: string;
  readonly description: PlainAppMessage;
  readonly report?: ReportInput;
}

// The order is the canonical order: the help lists the flags in it, the pre-checks take the inputs in it,
// and the run provenance names them in it.
const DECLARED = [
  { flag: "features", key: "features", arg: "<dir>", description: AppMessage.FeaturesFlag },
  {
    flag: "vitest",
    key: "vitest",
    arg: "<report.json>",
    description: AppMessage.VitestFlag,
    report: {
      reader: "vitest",
      format: "json",
      shape: VITEST_REPORT,
      subject: AppMessage.FlaggedReport,
      writer: AppMessage.VitestReportShape,
    },
  },
  {
    flag: "pytest",
    key: "pytest",
    arg: "<report.xml>",
    description: AppMessage.PytestFlag,
    report: {
      reader: "pytest",
      format: "junit-xml",
      shape: JUNIT_REPORT,
      subject: AppMessage.FlaggedReport,
      writer: AppMessage.JunitReportShape,
    },
  },
  {
    flag: "jest",
    key: "jest",
    arg: "<report.json>",
    description: AppMessage.JestFlag,
    report: {
      reader: "jest",
      format: "json-naming-its-shape",
      shape: VITEST_REPORT,
      subject: AppMessage.FlaggedReport,
      writer: AppMessage.JestReportShape,
    },
  },
  {
    flag: "junit",
    key: "junit",
    arg: "<report.xml>",
    description: AppMessage.JunitFlag,
    report: {
      reader: "junit",
      format: "junit-xml-or-one-suite",
      shape: JUNIT_REPORT,
      subject: AppMessage.FlaggedReport,
      writer: AppMessage.JunitXmlReportShape,
      takesADirectory: true,
    },
  },
  {
    flag: "rspec",
    key: "rspec",
    arg: "<report.json>",
    description: AppMessage.RspecFlag,
    report: {
      reader: "rspec",
      format: "json-naming-its-shape",
      shape: RSPEC_REPORT,
      subject: AppMessage.FlaggedReport,
      writer: AppMessage.RspecReportShape,
    },
  },
  {
    flag: "cucumber",
    key: "cucumber",
    arg: "<report.json>",
    description: AppMessage.CucumberFlag,
    report: {
      reader: "cucumber",
      format: "json",
      shape: CUCUMBER_REPORT,
      subject: AppMessage.FlaggedReport,
      writer: AppMessage.CucumberReportShape,
    },
  },
  { flag: "ci", key: "ci", arg: "<ci.yml>", description: AppMessage.CiFlag },
  {
    flag: "package-json",
    key: "packageJson",
    arg: "<path>",
    description: AppMessage.PackageJsonFlag,
    report: {
      reader: "package-manifest",
      format: "json",
      shape: PACKAGE_MANIFEST,
      subject: AppMessage.FlaggedManifest,
      writer: AppMessage.PackageManifestShape,
    },
  },
  {
    flag: "ci-steps",
    key: "ciSteps",
    arg: "<record.json>",
    description: AppMessage.CiStepsFlag,
    report: {
      reader: "ci-step-record",
      format: "json",
      shape: CI_STEP_RECORD,
      subject: AppMessage.FlaggedRecord,
      writer: AppMessage.CiStepRecordShape,
    },
  },
] as const satisfies readonly EvidenceInput[];

export const EVIDENCE_INPUTS: readonly EvidenceInput[] = DECLARED;

type InputKey = (typeof DECLARED)[number]["key"];

export type InputPaths = Readonly<Partial<Record<InputKey, string>>>;

export function inputPathsOf(args: Readonly<Record<string, string>>): InputPaths {
  return Object.fromEntries(EVIDENCE_INPUTS.map(({ flag, key }) => [key, args[flag]]));
}

export const INPUT_NAMES: readonly RunInputName[] = EVIDENCE_INPUTS.map(({ flag, key }) => ({ name: key, flag: `--${flag}` }));

export function runInputsOf(paths: InputPaths): RunInput[] {
  return INPUT_NAMES.map((input) => {
    const path = paths[input.name as InputKey];
    return path === undefined ? input : { ...input, path };
  });
}
