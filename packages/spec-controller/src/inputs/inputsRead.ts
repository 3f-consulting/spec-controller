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
import type { Refusal, RunEnding } from "../runEnding/runEnding.js";
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

// What a reader said is wrong, on one line, so each complaint is one line.
const saidOf = (error: unknown): string => (error instanceof Error ? error.message : String(error)).trim().replace(/\s*\n\s*/g, " ");

// A path that names nothing, or runs through a file, does not exist; any other failure to reach it is the tool's not to read it.
const faultOf = (error: unknown): InputFault => (["ENOENT", "ENOTDIR"].includes(String((error as NodeJS.ErrnoException).code)) ? "absent" : "not-permitted");

function textAt(name: string, shown: string, path: string): InputRead<FileText> {
  try {
    return { ok: true, path: shown, contents: { name, shown, path, text: readFileSync(path, "utf8") } };
  } catch (error) {
    return failed(shown, faultOf(error), saidOf(error));
  }
}

// Each file under the folder whose name ends as asked, at any depth or only at its top, by its path within the folder.
// A folder whose name ends so is not a file of it.
function filesIn(shown: string, path: string, endings: readonly string[], atAnyDepth: boolean): InputRead<FileText>[] {
  const names = readdirSync(path, { recursive: atAnyDepth, withFileTypes: true })
    .filter((entry) => !entry.isDirectory() && endings.some((ending) => entry.name.endsWith(ending)))
    .map((entry) => relative(path, join(entry.parentPath, entry.name)));
  return names.sort().map((name) => textAt(name, join(shown, name), join(path, name)));
}

const parsed = <Contents>(file: FileText, read: (text: string) => Contents): InputRead<Contents> => {
  try {
    return { ok: true, path: file.shown, contents: read(file.text) };
  } catch (error) {
    return failed(file.shown, "does-not-parse", saidOf(error));
  }
};

// A JSON report that parses, holds its reader's shape, and is read.
function jsonRead<Contents>(file: FileText, whereItBreaks: (report: unknown) => string | undefined, read: (report: unknown) => Contents): InputRead<Contents> {
  const report = parsed(file, (text) => JSON.parse(text) as unknown);
  if (!report.ok) return report;
  const breaks = whereItBreaks(report.contents);
  return breaks === undefined ? { ok: true, path: file.shown, contents: read(report.contents) } : failed(file.shown, "not-in-its-shape", breaks);
}

function xmlRead(file: FileText, from: "junit" | "pytest"): InputRead<ResultsBySuiteAsWritten[]> {
  const wrong = whyXmlDoesNotParse(file.text);
  if (wrong !== undefined) return failed(file.shown, "does-not-parse", wrong);
  const breaks = whereSuitesBreak(file.text);
  return breaks === undefined ? { ok: true, path: file.shown, contents: resultsBySuiteFrom(file.text, from) } : failed(file.shown, "not-in-its-shape", breaks);
}

type PathKind = "file" | "folder" | "file-or-folder";

interface InputReader {
  readonly reads: PathKind;
  // What the input, and a file in its folder, are called in a complaint: their catalogue codes.
  readonly inputIs: string;
  readonly fileIs: string;
  readonly read: (files: readonly FileText[]) => InputRead<Partial<InputsRead>>[];
}

const each = <Contents>(files: readonly FileText[], read: (file: FileText) => InputRead<Contents>): InputRead<Contents>[] => files.map(read);

const READERS = {
  features: {
    reads: "folder",
    inputIs: "input-features",
    fileIs: "input-feature-file",
    read: (files) => each(files, (file) => parsed(file, (text) => ({ features: [featureAsWrittenFrom(file.name, text)] }))),
  },
  workflows: {
    reads: "file-or-folder",
    inputIs: "input-workflows",
    fileIs: "input-workflow",
    read: (files) => [{ ok: true, path: "", contents: { workflowSteps: [] } }, ...each(files, (file) => parsed(file, (text) => ({ workflowSteps: workflowStepsFrom(file.name, text) })))],
  },
  vitest: { reads: "file", inputIs: "input-vitest", fileIs: "input-vitest", read: (files) => each(files, (file) => jsonRead(file, whereResultsByFileBreak, (report) => ({ vitest: resultsByFileFrom(report) }))) },
  jest: { reads: "file", inputIs: "input-jest", fileIs: "input-jest", read: (files) => each(files, (file) => jsonRead(file, whereResultsByFileBreak, (report) => ({ jest: resultsByFileFrom(report) }))) },
  pytest: { reads: "file", inputIs: "input-pytest", fileIs: "input-pytest", read: (files) => each(files, (file) => withKey(xmlRead(file, "pytest"), "pytest")) },
  junit: { reads: "file-or-folder", inputIs: "input-junit", fileIs: "input-junit-folder-file", read: (files) => each(files, (file) => withKey(xmlRead(file, "junit"), "junit")) },
  rspec: { reads: "file", inputIs: "input-rspec", fileIs: "input-rspec", read: (files) => each(files, (file) => jsonRead(file, whereResultsByExampleBreak, (report) => ({ rspec: resultsByExampleFrom(report) }))) },
  cucumber: { reads: "file", inputIs: "input-cucumber", fileIs: "input-cucumber", read: (files) => each(files, (file) => jsonRead(file, whereScenarioResultsBreak, (report) => ({ cucumber: scenarioResultsFrom(report) }))) },
  stepRecord: { reads: "file", inputIs: "input-step-record", fileIs: "input-step-record", read: (files) => each(files, (file) => jsonRead(file, whereStepRecordBreaks, (record) => ({ stepRecord: stepRecordFrom(record) }))) },
  manifest: { reads: "file", inputIs: "input-manifest", fileIs: "input-manifest", read: (files) => each(files, (file) => jsonRead(file, whereManifestBreaks, (manifest) => ({ manifest }))) },
} satisfies Readonly<Record<string, InputReader>>;

// Each input it can read, by the reader that reads it.
type InputKind = keyof typeof READERS;

// An input named on the command line, or left to its default path.
interface InputNamed {
  readonly kind: InputKind;
  readonly path: string;
  readonly byDefault: boolean;
}

type UsageError = Extract<RunEnding, { ending: "usage-error" }>;

function withKey(read: InputRead<ResultsBySuiteAsWritten[]>, key: "junit" | "pytest"): InputRead<Partial<InputsRead>> {
  return read.ok ? { ...read, contents: { [key]: read.contents } } : read;
}

const ENDINGS: Readonly<Record<string, readonly string[]>> = { features: [".feature"], workflows: [".yml", ".yaml"], junit: [".xml"] };

function statAt(path: string): Stats | { readonly fault: InputFault; readonly said: string } {
  try {
    return statSync(path);
  } catch (error) {
    return { fault: faultOf(error), said: saidOf(error) };
  }
}

const isAbsent = (stats: ReturnType<typeof statAt>): boolean => "fault" in stats && stats.fault === "absent";

// The files an input names, or why it cannot be read; a default that does not exist names none.
function filesOf({ kind, path: shown, byDefault }: InputNamed, folder: string): { readonly files: InputRead<FileText>[] } | { readonly none: true } {
  const path = resolve(folder, shown);
  const reads = READERS[kind].reads;
  const stats = statAt(path);
  // A default that does not exist is none, unless the folder the run started in is gone too.
  if (isAbsent(stats) && byDefault) return isAbsent(statAt(folder)) ? { files: [failed(shown, "absent", "working-folder-removed")] } : { none: true };
  if ("fault" in stats) return { files: [failed(shown, stats.fault, stats.said)] };
  if (stats.isDirectory() && reads !== "file") {
    try {
      return { files: filesIn(shown, path, ENDINGS[kind] ?? [], kind === "features") };
    } catch (error) {
      return { files: [failed(shown, faultOf(error), saidOf(error))] };
    }
  }
  if (stats.isFile() && reads !== "folder") return { files: [textAt(basename(shown), shown, path)] };
  return { files: [failed(shown, "wrong-kind-of-path", reads)] };
}

const text = (code: string): string => textFor(appCatalogue, code);

function refusalOf(request: InputNamed, read: Extract<InputRead<unknown>, { ok: false }>): Refusal {
  const reader = READERS[request.kind];
  const inFolder = read.path !== request.path;
  const input = text(inFolder ? reader.fileIs : reader.inputIs);
  if (request.byDefault && read.fault === "absent") return { key: "input-default-unreadable", values: { input, path: read.path, detail: text(read.detail) } };
  const detail = read.fault === "wrong-kind-of-path" ? text(`path-${read.detail}`) : read.detail;
  return { key: `input-${read.fault}`, values: { input, path: read.path, detail, shape: text(`shape-${request.kind}`) } };
}

const merged = (reads: readonly Partial<InputsRead>[]): Partial<InputsRead> =>
  reads.reduce<Partial<InputsRead>>(
    (all, read) => ({ ...all, ...read, features: [...(all.features ?? []), ...(read.features ?? [])], ...(read.workflowSteps && { workflowSteps: [...(all.workflowSteps ?? []), ...read.workflowSteps] }), ...(read.junit && { junit: [...(all.junit ?? []), ...read.junit] }) }),
    {},
  );

// Every input is read before any work, and every one that cannot be read is refused, each named.
export function inputsReadFor(inputs: readonly InputNamed[], folder: string): InputsRead | UsageError {
  const refusals: Refusal[] = [];
  const reads: Partial<InputsRead>[] = [];
  const filesRead: string[] = [];
  const pathsRead: Record<string, string> = {};
  for (const request of inputs) {
    const named = filesOf(request, folder);
    if ("none" in named) continue;
    pathsRead[request.kind] = request.path;
    const texts = named.files.flatMap((file) => (file.ok ? [file.contents] : []));
    filesRead.push(...texts.map(({ path }) => path));
    const read = [...named.files.filter((file) => !file.ok), ...READERS[request.kind].read(texts)];
    read.forEach((each) => (each.ok ? reads.push(each.contents) : refusals.push(refusalOf(request, each))));
  }
  if (refusals.length > 0) return { ending: "usage-error", refusals };
  return { features: [], ...merged(reads), filesRead, pathsRead };
}
