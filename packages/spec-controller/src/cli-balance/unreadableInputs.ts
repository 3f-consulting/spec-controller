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
import { APP_MESSAGES, AppMessage } from "../messages.js";
import { EVIDENCE_INPUTS, type ReportInput } from "./evidenceInputs.js";

type NotValid = (subject: string, writer: string, path: string, reason: string) => string;

const NOT_VALID_IN: Readonly<Record<ReportFormat, NotValid>> = {
  json: (subject, _writer, path, reason) => APP_MESSAGES[AppMessage.NotValidJson](subject, path, reason),
  "json-naming-its-shape": APP_MESSAGES[AppMessage.NotValidJsonInShape],
  "junit-xml": APP_MESSAGES[AppMessage.NotValidXml],
  "junit-xml-or-one-suite": APP_MESSAGES[AppMessage.NotValidXml],
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
    const subject = APP_MESSAGES[report.subject](`--${flag}`);
    return paths.map((file) => ({ subject, path: file, report, flagged: true }));
  });
  return [...given, ...manifestReadByDefault(args, exists)];
}

function manifestReadByDefault(args: Record<string, string>, exists: (path: string) => boolean): JsonInput[] {
  return EVIDENCE_INPUTS.flatMap(({ flag, report }) =>
    report?.reader === "package-manifest" && args[flag] === undefined && exists(DEFAULT_PACKAGE_JSON)
      ? [{ subject: APP_MESSAGES[AppMessage.DefaultPackageJson](), path: DEFAULT_PACKAGE_JSON, report, flagged: false }]
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

export function reportRefusal({ subject, path, report, reading }: FaultyReport): string {
  const writer = APP_MESSAGES[report.writer]();
  switch (reading.kind) {
    case "read-fault":
      return APP_MESSAGES[AppMessage.CouldNotBeReadAt](subject, path, reading.fault.reason);
    case "unparseable":
      return NOT_VALID_IN[report.format](subject, writer, path, reading.reason);
    case "misshapen":
      return APP_MESSAGES[AppMessage.NotInShape](subject, writer, path, reading.fault);
  }
}

export function checkInputShapes(reports: FaultyReports): string;
export function checkInputShapes(reports: ReportsReading): string | null;
export function checkInputShapes(reports: ReportsReading): string | null {
  return reports.kind === "faulty" ? reportRefusal(reports.first) : null;
}

function pathRefusal(subject: string, fault: InputReadFault): string {
  return APP_MESSAGES[AppMessage.CouldNotBeReadAt](subject, fault.path, fault.reason);
}

export function corpusDirRefusal(fault: InputReadFault): string {
  return pathRefusal(APP_MESSAGES[AppMessage.DefaultFeatureCorpus](), fault);
}

export function checkInputPaths(args: Record<string, string>, corpusReading: ReadFault, workflowReading: WorkflowReading): string;
export function checkInputPaths(args: Record<string, string>, corpusReading: CorpusReading, workflowReading: ReadFault): string;
export function checkInputPaths(args: Record<string, string>, corpusReading: CorpusReading, workflowReading: WorkflowReading): string | null;
export function checkInputPaths(
  args: Record<string, string>,
  corpusReading: CorpusReading,
  workflowReading: WorkflowReading,
): string | null {
  if (corpusReading.kind === "read-fault") {
    return pathRefusal(
      args["features"] === undefined
        ? APP_MESSAGES[AppMessage.DefaultFeatureCorpus]()
        : APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"),
      corpusReading.fault,
    );
  }
  if (workflowReading.kind === "read-fault") {
    return pathRefusal(workflowsSubjectOf(args), workflowReading.fault);
  }
  return null;
}

export function savedReportRefusal(path: string, reading: Exclude<DocumentReading, { kind: "parsed" }>): string {
  return APP_MESSAGES[AppMessage.CouldNotBeReadAt](
    APP_MESSAGES[AppMessage.FlaggedSavedReport]("--render-from-json"),
    path,
    reading.kind === "read-fault" ? reading.fault.reason : reading.reason,
  );
}

export function checkSavedReconciliation(path: string, saved: unknown): string | null {
  const fault = shapeFaultIn(saved, SAVED_RECONCILIATION);
  if (fault === null) return null;
  return APP_MESSAGES[AppMessage.NotASavedReconciliation](APP_MESSAGES[AppMessage.FlaggedFile]("--render-from-json"), path, fault);
}

export function reRenderOrRefusal(path: string, saved: unknown, strict: boolean): ReRendered | string {
  try {
    return reRender(saved, strict);
  } catch (err) {
    return APP_MESSAGES[AppMessage.NotRenderableAsSaved](
      APP_MESSAGES[AppMessage.FlaggedFile]("--render-from-json"),
      path,
      reasonOf(err),
    );
  }
}

function workflowsSubjectOf(args: Record<string, string>): string {
  return args["ci"] === undefined ? APP_MESSAGES[AppMessage.DefaultCiWorkflows]() : APP_MESSAGES[AppMessage.FlaggedWorkflows]("--ci");
}

type UnparseableWorkflows = Extract<WorkflowReading, { kind: "unparseable" }>;

export function checkWorkflowsParse(args: Record<string, string>, workflowReading: UnparseableWorkflows): string;
export function checkWorkflowsParse(args: Record<string, string>, workflowReading: WorkflowReading): string | null;
export function checkWorkflowsParse(args: Record<string, string>, workflowReading: WorkflowReading): string | null {
  if (workflowReading.kind !== "unparseable") return null;
  const { file, message } = workflowReading.faults[0]!;
  return APP_MESSAGES[AppMessage.WorkflowNotYaml](workflowsSubjectOf(args), file, message);
}
