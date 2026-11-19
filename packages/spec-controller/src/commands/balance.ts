import {
  configurationSettingsNamed,
  EVIDENCE_REPORT_FORMATS,
  provenanceInputsOf,
  reconcile,
  reportsLocatedOf,
  repositoryOfOrigin,
  scriptsFrom,
  shellAnswers,
  targetFolderOf,
  type ConfigurationSettings,
  type EvidenceReportKind,
  type ReportGiven,
  type ReportLocation,
} from "@3f-consulting/spec-controller-core";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { inputsReadFor, type InputNamed, type InputsRead } from "../inputs/inputsRead.js";
import type { StandardStreams } from "../output/streams.js";
import type { Complain } from "../runEnding/crashGuards.js";
import { exitCodeOf } from "../runEnding/exitCode.js";
import { refusedWith } from "../runEnding/refusal.js";
import type { ExitCode } from "../runEnding/runEnding.js";
import { runIdentityIn } from "../runIdentity/runIdentity.js";
import { writeReports } from "../output/writer.js";
import { INPUT_KINDS, type InputRequest, type RunRequest } from "../runRequest/runRequest.js";

// A run has no step and no step record of an input it did not read.
const NONE: readonly never[] = [];

// Every input kind the run could read, with each path it read for it, its links followed: the inputs from where the run
// started, and the reports its steps write from the target's folder.
const inputPathsOf = (read: InputsRead, folder: string, found: InputsRead, targetFolder: string) =>
  INPUT_KINDS.map((name) => ({
    name,
    paths: [
      ...(read.pathsRead[name] ?? NONE).map((path) => realpathSync(resolve(folder, path))),
      ...(found.pathsRead[name] ?? NONE).map((path) => realpathSync(resolve(targetFolder, path))),
    ],
  }));

// A corpus the command line named is where the target is; with none named, it is where the run started.
const corpusNamed = (inputs: readonly InputRequest[], folder: string): string | undefined => {
  const corpus = inputs.find((input) => input.kind === "features" && !input.byDefault);
  return corpus === undefined ? undefined : resolve(folder, corpus.path);
};

type Layer = ReportGiven["layers"][number];

// Each report located for a runner, with the runner's layer.
const reportsLocatedBy = ({ runners }: ConfigurationSettings): { readonly layer: Layer; readonly report: ReportLocation }[] =>
  runners.flatMap((part) => ("taken" in part && part.taken[1].report !== undefined ? [{ layer: part.taken[0], report: part.taken[1].report }] : []));

// Each path a runner's report is located at is read once, in its format, where no file is a fact.
const locatedInputs = (located: readonly { readonly report: ReportLocation }[]): InputNamed[] =>
  [...new Map(located.map(({ report }) => [report.path, report.format as EvidenceReportKind])).entries()].map(([path, kind]) => ({ kind, path, byDefault: false, located: true }));

// Every evidence report the run read, as the domain takes it: by format, in the formats' order, then in the order read. A
// report serves the layers of the runners whose report is located at its path.
const reportsGivenOf = (reports: NonNullable<InputsRead["reports"]>, located: readonly { readonly layer: Layer; readonly report: ReportLocation }[]): ReportGiven[] =>
  EVIDENCE_REPORT_FORMATS.flatMap(({ kind }) => reports.filter(({ format }) => format.kind === kind)).map(({ results, format, located: at }) => ({
    results,
    layers: [...new Set(located.flatMap(({ layer, report: { path } }) => (path === at ? [layer] : [])))],
    needsFeatures: format.needsFeatures === true,
  }));

export function balance(
  { inputs, settings, outputs, target, sourceSha, strict, exitZero }: Extract<RunRequest, { command: "balance" }>,
  folder: string,
  streams: StandardStreams,
  complain: Complain,
): ExitCode {
  const corpus = corpusNamed(inputs, folder);
  // Read first, so the run's time is when it started.
  const identity = runIdentityIn(corpus ?? folder, { target, sourceSha });
  const named = configurationSettingsNamed(settings);
  const longForms = reportsLocatedBy(named);
  const read = inputsReadFor([...inputs, ...locatedInputs(longForms)], folder);
  if ("refusals" in read) return refusedWith(read.refusals, streams.error.write);
  // git gives its top level with every link followed, so the folders and paths it is compared with follow theirs too.
  const targetFolder = realpathSync(targetFolderOf({ workingFolder: folder, corpus: corpus && realpathSync(corpus), gitTopLevel: identity.gitTopLevel }));
  // A report a step writes is found from the steps and scripts read, and read from the target's folder, where the step ran.
  const scripts = scriptsFrom(read.manifest);
  const settingsLocated = reportsLocatedOf(named, read.workflowSteps ?? NONE, scripts, shellAnswers.reportsNamed);
  const located = reportsLocatedBy(settingsLocated);
  const found = inputsReadFor(locatedInputs(located.filter(({ report }) => !longForms.some((longForm) => longForm.report === report))), targetFolder);
  if ("refusals" in found) return refusedWith(found.refusals, streams.error.write);
  const reconciliation = reconcile({
    features: read.features,
    reports: reportsGivenOf([...(read.reports ?? NONE), ...(found.reports ?? NONE)], located),
    steps: read.workflowSteps ?? NONE,
    stepRecord: read.stepRecord ?? NONE,
    settings: settingsLocated,
    reportsNotFound: [...(read.reportsNotFound ?? NONE), ...(found.reportsNotFound ?? NONE)],
    scripts,
    shell: shellAnswers,
    repositoryOf: repositoryOfOrigin,
    identity,
    provenanceInputs: provenanceInputsOf(inputPathsOf(read, folder, found, targetFolder)),
    targetFolder,
    strict,
  });
  try {
    return writeReports(outputs, [...read.filesRead, ...found.filesRead], reconciliation, streams, { exitZero });
  } catch (error) {
    // The run has its verdict, so an error in writing it out leaves the verdict's exit code alone.
    complain(error);
    return exitCodeOf(reconciliation.runVerdict, { exitZero });
  }
}
