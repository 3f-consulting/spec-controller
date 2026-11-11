import { statSync } from "node:fs";
import { DEFAULT_PACKAGE_JSON, type EvidenceReport } from "../ingest/ingestQualityChecks.js";
import { readUtf8, type InputReadFault } from "../ingest/inputReading.js";
import { junitReportPathsOf } from "../ingest/junitReportPaths.js";
import { readReport, type ReportFormat, type ReportReading } from "../ingest/reportReading.js";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";
import { refusal, refusals, type Refusal } from "../refusal.js";
import type { RefusalLines } from "../standardError.js";
import { EVIDENCE_INPUTS, type ReportInput } from "./evidenceInputs.js";

type NotValid = (subject: string, shape: string, path: string, reason: string) => Refusal;

const NOT_VALID_IN: Readonly<Record<ReportFormat, NotValid>> = {
  json: (subject, _shape, path, reason) => refusal(AppError.NotValidJson, { subject, path, reason }),
  "json-naming-its-shape": (subject, shape, path, reason) => refusal(AppError.NotValidJsonInShape, { subject, shape, path, reason }),
  "junit-xml": (subject, shape, path, reason) => refusal(AppError.NotValidXml, { subject, shape, path, reason }),
  "junit-xml-or-one-suite": (subject, shape, path, reason) => refusal(AppError.NotValidXml, { subject, shape, path, reason }),
};

export interface JsonInput {
  readonly subject: string;
  readonly path: string;
  readonly report: ReportInput;
  readonly flagged: boolean;
}

export function jsonInputsOf(args: Record<string, string>, exists: (path: string) => boolean): JsonInput[] {
  const given = EVIDENCE_INPUTS.flatMap(({ flag, report }) => {
    const path = args[flag];
    if (report === undefined || path === undefined) return [];
    const paths = report.takesADirectory === true && statSync(path).isDirectory() ? reportFilesIn(path) : [path];
    const subject = message(report.subject, { flag: `--${flag}` });
    return paths.map((file) => ({ subject, path: file, report, flagged: true }));
  });
  return [...given, ...manifestReadByDefault(args, exists)];
}

function manifestReadByDefault(args: Record<string, string>, exists: (path: string) => boolean): JsonInput[] {
  return EVIDENCE_INPUTS.flatMap(({ flag, report }) =>
    report?.reader === "package-manifest" && args[flag] === undefined && exists(DEFAULT_PACKAGE_JSON)
      ? [{ subject: message(AppMessage.DefaultPackageJson), path: DEFAULT_PACKAGE_JSON, report, flagged: false }]
      : [],
  );
}

function reportFilesIn(directory: string): string[] {
  try {
    return junitReportPathsOf(directory);
  } catch {
    // A directory that cannot be listed is left to the read, which names why it failed.
    return [directory];
  }
}

interface ReadReport extends JsonInput {
  readonly reading: ReportReading;
}

export type FaultyReport = ReadReport & { readonly reading: Exclude<ReportReading, { kind: "parsed" }> };

export type ReportsReading =
  | { readonly kind: "read"; readonly files: readonly ReadReport[]; readonly reports: readonly EvidenceReport[] }
  | { readonly kind: "faulty"; readonly files: readonly ReadReport[]; readonly first: FaultyReport };

type FaultyReports = Extract<ReportsReading, { kind: "faulty" }>;

export function readReports(inputs: readonly JsonInput[], read: (path: string) => string = readUtf8): ReportsReading {
  const files = inputs.map((input) => ({ ...input, reading: readReport(input.path, input.report.format, input.report.shape, read) }));
  const reports: EvidenceReport[] = [];
  for (const file of files) {
    const { reading } = file;
    if (reading.kind !== "parsed") return { kind: "faulty", files, first: { ...file, reading } };
    reports.push({ reader: file.report.reader, document: reading.document });
  }
  return { kind: "read", files, reports };
}

export function reportRefusal({ subject, path, report, reading }: FaultyReport): Refusal {
  const shape = message(report.writer);
  switch (reading.kind) {
    case "read-fault":
      return refusal(AppError.CouldNotBeRead, { subject, path, reason: reading.fault.reason });
    case "unparseable":
      return NOT_VALID_IN[report.format](subject, shape, path, reading.reason);
    case "misshapen":
      return refusal(AppError.NotInShape, { subject, shape, path, fault: reading.fault });
  }
}

export function checkInputShapes(reports: FaultyReports): Refusal;
export function checkInputShapes(reports: ReportsReading): Refusal | null;
export function checkInputShapes(reports: ReportsReading): Refusal | null {
  return reports.kind === "faulty" ? reportRefusal(reports.first) : null;
}

function pathRefusal(subject: string, fault: InputReadFault): Refusal {
  return refusal(AppError.CouldNotBeRead, { subject, path: fault.path, reason: fault.reason });
}

export function corpusDirRefusal(fault: InputReadFault): Refusal {
  return pathRefusal(message(AppMessage.DefaultFeatureCorpus), fault);
}

export function corpusReadRefusal(args: Record<string, string>, fault: InputReadFault): Refusal {
  const subject = args["features"] === undefined ? message(AppMessage.DefaultFeatureCorpus) : message(AppMessage.FlaggedCorpus, { flag: "--features" });
  return pathRefusal(subject, fault);
}

export function workflowsReadRefusal(args: Record<string, string>, fault: InputReadFault): Refusal {
  return pathRefusal(workflowsSubjectOf(args), fault);
}

function workflowsSubjectOf(args: Record<string, string>): string {
  return args["ci"] === undefined ? message(AppMessage.DefaultCiWorkflows) : message(AppMessage.FlaggedWorkflows, { flag: "--ci" });
}

export function workflowsUnparseableRefusal(args: Record<string, string>, faults: readonly { readonly file: string; readonly message: string }[]): Refusal {
  const { file, message: text } = faults[0]!;
  return refusal(AppError.WorkflowNotYaml, { workflows: workflowsSubjectOf(args), file, message: text });
}

// Each feature file the parser rejects is its own refusal, its parser's words beneath its opening line.
export function corpusUnparseableRefusal(faults: readonly { readonly file: string; readonly message: string }[]): RefusalLines {
  const corpus = message(AppMessage.FlaggedCorpus, { flag: "--features" });
  return refusals(faults.map(({ file, message: text }) => refusal(AppError.CorpusFileUnparseable, { corpus, file, message: text })));
}
