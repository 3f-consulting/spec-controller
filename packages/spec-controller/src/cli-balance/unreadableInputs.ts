import { statSync } from "node:fs";
import {
  DEFAULT_PACKAGE_JSON,
  type CorpusReading,
  type EvidenceReport,
  type WorkflowReading,
} from "../ingest/ingestQualityChecks.js";
import { readUtf8, reasonOf, type InputReadFault, type ReadFault } from "../ingest/inputReading.js";
import { SAVED_RECONCILIATION, shapeFaultIn } from "../ingest/inputShapes.js";
import { junitReportPathsOf } from "../ingest/junitReportPaths.js";
import { readReport, type DocumentReading, type ReportFormat, type ReportReading } from "../ingest/reportReading.js";
import { reRender, type ReRendered } from "./reRender.js";
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
    const paths = report.takesADirectory === true && isDirectory(path) ? reportFilesIn(path) : [path];
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

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    // A path that cannot be stat'd is left to the read, which names why it failed.
    return false;
  }
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

export function checkInputPaths(args: Record<string, string>, corpusReading: ReadFault, workflowReading: WorkflowReading): Refusal;
export function checkInputPaths(args: Record<string, string>, corpusReading: CorpusReading, workflowReading: ReadFault): Refusal;
export function checkInputPaths(args: Record<string, string>, corpusReading: CorpusReading, workflowReading: WorkflowReading): Refusal | null;
export function checkInputPaths(
  args: Record<string, string>,
  corpusReading: CorpusReading,
  workflowReading: WorkflowReading,
): Refusal | null {
  if (corpusReading.kind === "read-fault") {
    return pathRefusal(
      args["features"] === undefined
        ? message(AppMessage.DefaultFeatureCorpus)
        : message(AppMessage.FlaggedCorpus, { flag: "--features" }),
      corpusReading.fault,
    );
  }
  if (workflowReading.kind === "read-fault") {
    return pathRefusal(workflowsSubjectOf(args), workflowReading.fault);
  }
  return null;
}

export function savedReportRefusal(path: string, reading: Exclude<DocumentReading, { kind: "parsed" }>): Refusal {
  return refusal(AppError.CouldNotBeRead, {
    subject: message(AppMessage.FlaggedSavedReport, { flag: "--render-from-json" }),
    path,
    reason: reading.kind === "read-fault" ? reading.fault.reason : reading.reason,
  });
}

export function checkSavedReconciliation(path: string, saved: unknown): Refusal | null {
  const fault = shapeFaultIn(saved, SAVED_RECONCILIATION);
  if (fault === null) return null;
  return refusal(AppError.NotASavedReconciliation, {
    subject: message(AppMessage.FlaggedFile, { flag: "--render-from-json" }),
    path,
    fault,
  });
}

export function reRenderOrRefusal(path: string, saved: unknown, strict: boolean): ReRendered | Refusal {
  try {
    return reRender(saved, strict);
  } catch (err) {
    return refusal(AppError.NotRenderableAsSaved, {
      subject: message(AppMessage.FlaggedFile, { flag: "--render-from-json" }),
      path,
      reason: reasonOf(err),
    });
  }
}

function workflowsSubjectOf(args: Record<string, string>): string {
  return args["ci"] === undefined ? message(AppMessage.DefaultCiWorkflows) : message(AppMessage.FlaggedWorkflows, { flag: "--ci" });
}

type UnparseableWorkflows = Extract<WorkflowReading, { kind: "unparseable" }>;

export function checkWorkflowsParse(args: Record<string, string>, workflowReading: UnparseableWorkflows): Refusal;
export function checkWorkflowsParse(args: Record<string, string>, workflowReading: WorkflowReading): Refusal | null;
export function checkWorkflowsParse(args: Record<string, string>, workflowReading: WorkflowReading): Refusal | null {
  if (workflowReading.kind !== "unparseable") return null;
  const { file, message: text } = workflowReading.faults[0]!;
  return refusal(AppError.WorkflowNotYaml, { workflows: workflowsSubjectOf(args), file, message: text });
}

// Each feature file the parser rejects is its own refusal, its parser's words beneath its opening line.
export function corpusUnparseableRefusal(faults: readonly { readonly file: string; readonly message: string }[]): RefusalLines {
  const corpus = message(AppMessage.FlaggedCorpus, { flag: "--features" });
  return refusals(faults.map(({ file, message: text }) => refusal(AppError.CorpusFileUnparseable, { corpus, file, message: text })));
}
