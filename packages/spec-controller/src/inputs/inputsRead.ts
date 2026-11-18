import {
  featureAsWrittenFrom,
  resultsByExampleFrom,
  resultsByFileFrom,
  resultsBySuiteFrom,
  scenarioResultsFrom,
  stepRecordFrom,
  textFor,
  whereManifestBreaks,
  whereResultsByExampleBreak,
  whereResultsByFileBreak,
  whereScenarioResultsBreak,
  whereStepRecordBreaks,
  whereSuitesBreak,
  whyXmlDoesNotParse,
  workflowStepsFrom,
  type FeatureAsWritten,
  type ResultsByExampleAsWritten,
  type ResultsByFileAsWritten,
  type ResultsBySuiteAsWritten,
  type ScenarioResultAsWritten,
  type StepRecordEntryAsWritten,
  type WorkflowStepAsWritten,
} from "@3f-consulting/spec-controller-core";
import { readdirSync, readFileSync, statSync, type Stats } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import type { Refusal } from "../runEnding/runEnding.js";
import type { InputFault, InputRead } from "./inputRead.js";

// Every input the run read, each as its reader reports it; an input not read is absent.
export interface InputsRead {
  readonly features: readonly FeatureAsWritten[];
  readonly workflowSteps?: readonly WorkflowStepAsWritten[];
  readonly vitest?: readonly ResultsByFileAsWritten[];
  readonly jest?: readonly ResultsByFileAsWritten[];
  readonly pytest?: readonly ResultsBySuiteAsWritten[];
  readonly junit?: readonly ResultsBySuiteAsWritten[];
  readonly rspec?: ResultsByExampleAsWritten;
  readonly cucumber?: ScenarioResultAsWritten[];
  readonly stepRecord?: readonly StepRecordEntryAsWritten[];
  readonly manifest?: unknown;
  // Every file read, so no report lands on one.
  readonly filesRead: readonly string[];
  // Each input read, at its path as given.
  readonly pathsRead: Readonly<Partial<Record<string, string>>>;
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

const parsed = <Contents>(file: FileText, read: (text: string) => Contents): InputRead<Contents> => {
  try {
    return { ok: true, contents: read(file.text) };
  } catch (error) {
    return failed(file.shown, "does-not-parse", saidOf(error));
  }
};

// A report that holds its reader's shape, and is read. Whatever its reader cannot read, it says, and the report is not in
// its shape.
function readInItsShape<Report, Contents>(file: FileText, report: Report, whereItBreaks: (report: Report) => string | undefined, read: (report: Report) => Contents): InputRead<Contents> {
  try {
    const breaks = whereItBreaks(report);
    return breaks === undefined ? { ok: true, contents: read(report) } : failed(file.shown, "not-in-its-shape", breaks);
  } catch (error) {
    return failed(file.shown, "not-in-its-shape", saidOf(error));
  }
}

// A JSON report that parses, holds its reader's shape, and is read.
function jsonRead<Contents>(file: FileText, whereItBreaks: (report: unknown) => string | undefined, read: (report: unknown) => Contents): InputRead<Contents> {
  const report = parsed(file, (text) => JSON.parse(text) as unknown);
  return report.ok ? readInItsShape(file, report.contents, whereItBreaks, read) : report;
}

function xmlRead(file: FileText, from: "junit" | "pytest"): InputRead<Partial<InputsRead>> {
  const wrong = whyXmlDoesNotParse(file.text);
  if (wrong !== undefined) return failed(file.shown, "does-not-parse", wrong);
  return readInItsShape(file, file.text, whereSuitesBreak, (xml) => ({ [from]: resultsBySuiteFrom(xml, from) }));
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
  vitest: { read: (files) => each(files, (file) => jsonRead(file, whereResultsByFileBreak, (report) => ({ vitest: resultsByFileFrom(report) }))) },
  jest: { read: (files) => each(files, (file) => jsonRead(file, whereResultsByFileBreak, (report) => ({ jest: resultsByFileFrom(report) }))) },
  pytest: { read: (files) => each(files, (file) => xmlRead(file, "pytest")) },
  junit: { endings: [".xml"], fileIs: "input-junit-folder-file", read: (files) => each(files, (file) => xmlRead(file, "junit")) },
  rspec: { read: (files) => each(files, (file) => jsonRead(file, whereResultsByExampleBreak, (report) => ({ rspec: resultsByExampleFrom(report) }))) },
  cucumber: { read: (files) => each(files, (file) => jsonRead(file, whereScenarioResultsBreak, (report) => ({ cucumber: scenarioResultsFrom(report) }))) },
  stepRecord: { read: (files) => each(files, (file) => jsonRead(file, whereStepRecordBreaks, (record) => ({ stepRecord: stepRecordFrom(record) }))) },
  manifest: { read: (files) => each(files, (file) => jsonRead(file, whereManifestBreaks, (manifest) => ({ manifest }))) },
} satisfies Readonly<Record<string, InputReader>>;

// Each input it can read, by the reader that reads it.
type InputKind = keyof typeof READERS;

// An input named on the command line, or left to its default path.
interface InputNamed {
  readonly kind: InputKind;
  readonly path: string;
  readonly byDefault: boolean;
}

function statAt(path: string): Stats | { readonly fault: InputFault; readonly said: string } {
  try {
    return statSync(path);
  } catch (error) {
    return { fault: faultOf(error), said: saidOf(error) };
  }
}

// The files an input names, or why it cannot be read; a default that does not exist names none.
function filesOf({ kind, path: shown, byDefault }: InputNamed, folder: string): InputRead<FileText>[] | undefined {
  const path = resolve(folder, shown);
  const { reads = "file", endings }: InputReader = READERS[kind];
  const stats = statAt(path);
  // A default that cannot be reached is none.
  if ("fault" in stats && byDefault) return undefined;
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

const merged = (reads: readonly Partial<InputsRead>[]): Partial<InputsRead> =>
  reads.reduce<Partial<InputsRead>>(
    (all, read) => ({ ...all, ...read, features: [...(all.features ?? []), ...(read.features ?? [])], ...(read.workflowSteps && { workflowSteps: [...(all.workflowSteps ?? []), ...read.workflowSteps] }), ...(read.junit && { junit: [...(all.junit ?? []), ...read.junit] }) }),
    {},
  );

// Every input is read before any work, and every one that cannot be read is refused, each named.
export function inputsReadFor(inputs: readonly InputNamed[], folder: string): InputsRead | { readonly refusals: readonly Refusal[] } {
  const refusals: Refusal[] = [];
  const reads: Partial<InputsRead>[] = [];
  const filesRead: string[] = [];
  const pathsRead: Record<string, string> = {};
  for (const request of inputs) {
    const named = filesOf(request, folder);
    if (named === undefined) continue;
    pathsRead[request.kind] = request.path;
    const texts = named.flatMap((file) => (file.ok ? [file.contents] : []));
    filesRead.push(...texts.map(({ path }) => path));
    const read = [...named.filter((file) => !file.ok), ...READERS[request.kind].read(texts)];
    read.forEach((each) => (each.ok ? reads.push(each.contents) : refusals.push(refusalOf(request, each))));
  }
  if (refusals.length > 0) return { refusals };
  return { features: [], ...merged(reads), filesRead, pathsRead };
}
