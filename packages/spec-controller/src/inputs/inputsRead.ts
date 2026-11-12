import { existsSync } from "node:fs";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { corpusFeatureFiles } from "./ingestScenarios.js";
import { AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import type { GivenInput } from "./inputKinds.js";
import { jsonInputsOf } from "./unreadableInputs.js";

export interface InputReader {
  exists(path: string): boolean;
  featureFiles(dir: string): string[];
  workflowFiles(path: string): string[];
}

export const NODE_INPUT_READER: InputReader = {
  exists: existsSync,
  featureFiles: (dir) => corpusFeatureFiles(dir).map(({ path }) => path),
  workflowFiles: (path) => ciSourcePathsOf(path),
};

// The paths the run reads when an input is not named, as the run request fills them in.
interface InputDefaults {
  readonly features: string;
  readonly ci: string;
  readonly packageJson: string;
}

// A file the run reads, named by its kind: a feature file, a CI workflow or a report.
interface InputRead {
  readonly subject: string;
  readonly path: string;
}

export function inputsReadFrom(
  args: Record<string, string>,
  given: readonly GivenInput[],
  reader: InputReader,
  defaults: InputDefaults,
): InputRead[] {
  const reports = jsonInputsOf(given, reader.exists, defaults.packageJson).map(({ path }) => ({ subject: message(AppMessage.ReadReport), path }));
  return [...reports, ...featureInputs(args["features"], reader, defaults.features), ...workflowInputs(args["ci"], reader, defaults.ci)];
}

function featureInputs(dir: string | undefined, reader: InputReader, defaultCorpus: string): InputRead[] {
  return reader.featureFiles(dir ?? defaultCorpus).map((path) => ({ subject: message(AppMessage.FeatureFile), path }));
}

function workflowInputs(ci: string | undefined, reader: InputReader, defaultWorkflows: string): InputRead[] {
  return reader.workflowFiles(ci ?? defaultWorkflows).map((path) => ({ subject: message(AppMessage.CiWorkflow), path }));
}
