import { AppMessage, type PlainWordedAppMessage } from "../messages/messages.js";
import {
  CI_STEP_RECORD,
  CUCUMBER_REPORT,
  JUNIT_REPORT,
  PACKAGE_MANIFEST,
  RSPEC_REPORT,
  VITEST_REPORT,
  type Shape,
} from "./inputShapes.js";
import type { EvidenceReader } from "./ingestQualityChecks.js";
import type { ReportFormat } from "./reportReading.js";

export interface ReportInput {
  readonly reader: EvidenceReader;
  readonly format: ReportFormat;
  readonly shape: Shape;
  readonly subject: AppMessage.FlaggedReport | AppMessage.FlaggedRecord | AppMessage.FlaggedManifest;
  readonly writer: PlainWordedAppMessage;
  readonly takesADirectory?: true;
}

// An input as the run request hands it over: its kind, the flag that names it, and its path if one was given.
export interface GivenInput {
  readonly kind: string;
  readonly flag: string;
  readonly path: string | undefined;
}

// Each kind of input read as a report: its reader, format and shape.
const REPORT_INPUTS: Readonly<Partial<Record<string, ReportInput>>> = {
  vitest: {
    reader: "vitest",
    format: "json",
    shape: VITEST_REPORT,
    subject: AppMessage.FlaggedReport,
    writer: AppMessage.VitestReportShape,
  },
  pytest: {
    reader: "pytest",
    format: "junit-xml",
    shape: JUNIT_REPORT,
    subject: AppMessage.FlaggedReport,
    writer: AppMessage.JunitReportShape,
  },
  jest: {
    reader: "jest",
    format: "json-naming-its-shape",
    shape: VITEST_REPORT,
    subject: AppMessage.FlaggedReport,
    writer: AppMessage.JestReportShape,
  },
  junit: {
    reader: "junit",
    format: "junit-xml-or-one-suite",
    shape: JUNIT_REPORT,
    subject: AppMessage.FlaggedReport,
    writer: AppMessage.JunitXmlReportShape,
    takesADirectory: true,
  },
  rspec: {
    reader: "rspec",
    format: "json-naming-its-shape",
    shape: RSPEC_REPORT,
    subject: AppMessage.FlaggedReport,
    writer: AppMessage.RspecReportShape,
  },
  cucumber: {
    reader: "cucumber",
    format: "json",
    shape: CUCUMBER_REPORT,
    subject: AppMessage.FlaggedReport,
    writer: AppMessage.CucumberReportShape,
  },
  packageJson: {
    reader: "package-manifest",
    format: "json",
    shape: PACKAGE_MANIFEST,
    subject: AppMessage.FlaggedManifest,
    writer: AppMessage.PackageManifestShape,
  },
  ciSteps: {
    reader: "ci-step-record",
    format: "json",
    shape: CI_STEP_RECORD,
    subject: AppMessage.FlaggedRecord,
    writer: AppMessage.CiStepRecordShape,
  },
};

export function reportInputOf(kind: string): ReportInput | undefined {
  return REPORT_INPUTS[kind];
}
