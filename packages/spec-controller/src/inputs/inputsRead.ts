import {
  EVIDENCE_REPORT_FORMATS,
  featureAsWrittenFrom,
  InputDoesNotParse,
  stepRecordFrom,
  textFor,
  whereManifestBreaks,
  whereStepRecordBreaks,
  whyXmlDoesNotParse,
  workflowStepsFrom,
  type EvidenceReportFormat,
  type EvidenceReportKind,
  type FeatureFile,
  type TestResult,
  type RecordedStep,
  type CiStep,
} from "@3f-consulting/spec-controller-core";
import { readdirSync, readFileSync, statSync, type Stats } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import type { Refusal } from "../runEnding/runEnding.js";
import type { InputFault, InputRead } from "./inputRead.js";

// One evidence report read: its file name, which a runners entry may name; its path as given, a folder's file as the
// folder's path joined with its name; its results as its reader reports them; its format; and, for a report a runner's
// long form names, the path the long form gives.
interface ReportRead {
  readonly report: string;
  readonly path: string;
  readonly results: readonly TestResult[];
  readonly format: EvidenceReportFormat;
  readonly located?: string;
}

// Every input the run read, each as its reader reports it; an input not read is absent.
export interface InputsRead {
  readonly features: readonly FeatureFile[];
  readonly workflowSteps?: readonly CiStep[];
  // Every evidence report read, of every format, in the order read.
  readonly reports?: readonly ReportRead[];
  readonly stepRecord?: readonly RecordedStep[];
  readonly manifest?: unknown;
  // Every report path a runner's long form names at which no file was.
  readonly reportsNotFound?: readonly string[];
  // Every file read, so no report lands on one.
  readonly filesRead: readonly string[];
  // Every path given for each input read, in order.
  readonly pathsRead: Readonly<Partial<Record<InputKind, readonly string[]>>>;
}

// One file the run read: its path within the folder named, where it is as given and on disk, and its text.
interface FileText {
  readonly name: string;
  readonly shown: string;
  readonly path: string;
  readonly text: string;
}

const failed = <Contents>(path: string, fault: InputFault, detail: string): InputRead<Contents> => ({ ok: false, path, fault, detail });

const text = (code: string): string => textFor(appCatalogue, code);

// What a reader said is wrong, on one line, so each complaint is one line; every reader throws an Error.
const saidOf = (error: unknown): string => (error as Error).message.trim().replace(/\s*\n\s*/g, " ");

// A path that names nothing does not exist; any other failure to reach it is the tool's not to read it.
const faultOf = (error: unknown): InputFault => ((error as NodeJS.ErrnoException).code === "ENOENT" ? "absent" : "not-permitted");

function textAt(name: string, shown: string, path: string): InputRead<FileText> {
  try {
    return { ok: true, contents: { name, shown, path, text: readFileSync(path, "utf8") } };
  } catch (error) {
    return failed(shown, faultOf(error), saidOf(error));
  }
}

// Each file under the folder whose name ends as asked, at any depth or only at its top, by its path within the folder.
function filesIn(shown: string, path: string, endings: readonly string[], atAnyDepth: boolean): InputRead<FileText>[] {
  const names = readdirSync(path, { recursive: atAnyDepth, withFileTypes: true })
    .filter((entry) => endings.some((ending) => entry.name.endsWith(ending)))
    .map((entry) => relative(path, join(entry.parentPath, entry.name)));
  return names.sort().map((name) => textAt(name, join(shown, name), join(path, name)));
}

// An input its reader cannot take is refused; anything else thrown is a fault in the reader, and ends the run as an
// unexpected error.
const parsed = <Contents>(file: FileText, read: (text: string) => Contents): InputRead<Contents> => {
  try {
    return { ok: true, contents: read(file.text) };
  } catch (error) {
    if (error instanceof InputDoesNotParse) return failed(file.shown, "does-not-parse", saidOf(error));
    throw error;
  }
};

// A report that holds its reader's shape, and is read. Its shape is checked before it is read, so the reader cannot throw
// on it.
function readInItsShape<Report, Contents>(file: FileText, report: Report, whereItBreaks: (report: Report) => string | undefined, read: (report: Report) => Contents): InputRead<Contents> {
  const breaks = whereItBreaks(report);
  return breaks === undefined ? { ok: true, contents: read(report) } : failed(file.shown, "not-in-its-shape", breaks);
}

// A JSON report that parses, holds its reader's shape, and is read.
function jsonRead<Contents>(file: FileText, whereItBreaks: (report: unknown) => string | undefined, read: (report: unknown) => Contents): InputRead<Contents> {
  const report = parsed(file, (text) => {
    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw error instanceof SyntaxError ? new InputDoesNotParse(error.message, { cause: error }) : error;
    }
  });
  return report.ok ? readInItsShape(file, report.contents, whereItBreaks, read) : report;
}

// An evidence report read as its format reads one: the one report its file holds.
function reportRead(file: FileText, format: EvidenceReportFormat): InputRead<Partial<InputsRead>> {
  const reportOf = (results: readonly TestResult[]): Partial<InputsRead> => ({ reports: [{ report: file.name, path: file.shown, results, format }] });
  if (format.parsedAs !== "xml") return jsonRead(file, format.whereItBreaks, (report) => reportOf(format.resultsFrom(report)));
  const wrong = whyXmlDoesNotParse(file.text);
  if (wrong !== undefined) return failed(file.shown, "does-not-parse", wrong);
  return readInItsShape(file, file.text, format.whereItBreaks, (xml) => reportOf(format.resultsFrom(xml)));
}

interface InputReader {
  // What its path must name: a file, unless it says a folder.
  readonly reads?: "file" | "folder";
  // The endings of the files it reads in a folder, for an input that can name one.
  readonly endings?: readonly string[];
  // What a file in its folder is called in a complaint: its catalogue code. A file in a folder with no name of its own is
  // called as the input is.
  readonly fileIs?: string;
  readonly read: (files: readonly FileText[]) => InputRead<Partial<InputsRead>>[];
}

const each = <Contents>(files: readonly FileText[], read: (file: FileText) => InputRead<Contents>): InputRead<Contents>[] => files.map(read);

// A format's reader. A format that reads a folder has endings, and calls a file in it by its catalogue code.
const formatReaderOf = (format: EvidenceReportFormat): InputReader => ({
  endings: format.folderEndings,
  fileIs: `input-${format.kind}-folder-file`,
  read: (files) => each(files, (file) => reportRead(file, format)),
});

const READERS = {
  features: {
    reads: "folder",
    endings: [".feature"],
    fileIs: "input-feature-file",
    read: (files) => each(files, (file) => parsed(file, (text) => ({ features: [featureAsWrittenFrom(file.name, text)] }))),
  },
  workflows: {
    endings: [".yml", ".yaml"],
    fileIs: "input-workflow",
    read: (files) => each(files, (file) => parsed(file, (text) => ({ workflowSteps: workflowStepsFrom(file.name, text) }))),
  },
  ...(Object.fromEntries(EVIDENCE_REPORT_FORMATS.map((format) => [format.kind, formatReaderOf(format)])) as Record<EvidenceReportKind, InputReader>),
  stepRecord: { read: (files) => each(files, (file) => jsonRead(file, whereStepRecordBreaks, (record) => ({ stepRecord: stepRecordFrom(record) }))) },
  manifest: { read: (files) => each(files, (file) => jsonRead(file, whereManifestBreaks, (manifest) => ({ manifest }))) },
} satisfies Readonly<Record<string, InputReader>>;

// Each input it can read, by the reader that reads it.
type InputKind = keyof typeof READERS;

// An input named on the command line, or left to its default path. A located input is a report a runner's long form
// names, where no file is a fact, not a fault.
export interface InputNamed {
  readonly kind: InputKind;
  readonly path: string;
  readonly byDefault: boolean;
  readonly located?: boolean;
}

function statAt(path: string): Stats | { readonly fault: InputFault; readonly said: string } {
  try {
    return statSync(path);
  } catch (error) {
    return { fault: faultOf(error), said: saidOf(error) };
  }
}

// The files an input names, or why it cannot be read; a default that does not exist names none, and a located input with
// no file is absent.
function filesOf({ kind, path: shown, byDefault, located }: InputNamed, folder: string): InputRead<FileText>[] | "absent" | undefined {
  const path = resolve(folder, shown);
  const { reads = "file", endings }: InputReader = READERS[kind];
  const stats = statAt(path);
  // A default that cannot be reached is none.
  if ("fault" in stats && byDefault) return undefined;
  if ("fault" in stats && located === true && stats.fault === "absent") return "absent";
  if ("fault" in stats) return [failed(shown, stats.fault, stats.said)];
  if (stats.isDirectory() && endings !== undefined) {
    try {
      return filesIn(shown, path, endings, kind === "features");
    } catch (error) {
      return [failed(shown, faultOf(error), saidOf(error))];
    }
  }
  if (stats.isFile() && reads !== "folder") return [textAt(basename(shown), shown, path)];
  return [failed(shown, "wrong-kind-of-path", text(`path-${reads}`))];
}

function refusalOf(request: InputNamed, read: Extract<InputRead<unknown>, { ok: false }>): Refusal {
  const inputIs = `input-${request.kind}`;
  const { fileIs = inputIs }: InputReader = READERS[request.kind];
  const input = text(read.path === request.path ? inputIs : fileIs);
  return { key: `input-${read.fault}`, values: { input, path: read.path, detail: read.detail, shape: text(`shape-${request.kind}`) } };
}

// The inputs read as a list, each read's list joined to the ones before it.
const LIST_INPUTS = ["workflowSteps", "stepRecord", "reports"] as const satisfies readonly (keyof InputsRead)[];

const merged = (reads: readonly Partial<InputsRead>[]): Partial<InputsRead> =>
  reads.reduce<Partial<InputsRead>>(
    (all, read) => ({
      ...all,
      ...read,
      features: [...(all.features ?? []), ...(read.features ?? [])],
      ...Object.fromEntries(LIST_INPUTS.flatMap((input) => (read[input] === undefined ? [] : [[input, [...(all[input] ?? []), ...read[input]]]]))),
    }),
    {},
  );

// A located input's reports, each with the path its long form gives.
const locatedAt = (contents: Partial<InputsRead>, { path, located }: InputNamed): Partial<InputsRead> =>
  located === true ? { ...contents, reports: (contents.reports ?? []).map((report) => ({ ...report, located: path })) } : contents;

// Every input is read before any work, and every one that cannot be read is refused, each named.
export function inputsReadFor(inputs: readonly InputNamed[], folder: string): InputsRead | { readonly refusals: readonly Refusal[] } {
  const refusals: Refusal[] = [];
  const reads: Partial<InputsRead>[] = [];
  const filesRead: string[] = [];
  const pathsRead: Partial<Record<InputKind, string[]>> = {};
  const reportsNotFound: string[] = [];
  for (const request of inputs) {
    const named = filesOf(request, folder);
    if (named === undefined) continue;
    if (named === "absent") {
      reportsNotFound.push(request.path);
      continue;
    }
    pathsRead[request.kind] = [...(pathsRead[request.kind] ?? []), request.path];
    const texts = named.flatMap((file) => (file.ok ? [file.contents] : []));
    filesRead.push(...texts.map(({ path }) => path));
    const read = [...named.filter((file) => !file.ok), ...READERS[request.kind].read(texts)];
    read.forEach((each) => (each.ok ? reads.push(locatedAt(each.contents, request)) : refusals.push(refusalOf(request, each))));
  }
  if (refusals.length > 0) return { refusals };
  return { features: [], ...merged(reads), filesRead, pathsRead, ...(reportsNotFound.length > 0 && { reportsNotFound }) };
}
