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
  featureFiles: (dir) => {
    try {
      return corpusFeatureFiles(dir).map(({ path }) => path);
    } catch {
      return [];
    }
  },
  workflowFiles: (path) => {
    try {
      return ciSourcePathsOf(path);
    } catch {
      return [];
    }
  },
};

// The paths the run reads when an input is not named, as the run request fills them in.
interface InputDefaults {
  readonly features: string;
  readonly ci: string;
  readonly packageJson: string;
}

// A file the run reads, named by how the run came to read it.
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
  const reports = jsonInputsOf(given, reader.exists, defaults.packageJson).map(({ subject, path }) => ({ subject: lowerFirst(subject), path }));
  return [...reports, ...featureInputs(args["features"], reader, defaults.features), ...workflowInputs(args["ci"], reader, defaults.ci)];
}

function featureInputs(dir: string | undefined, reader: InputReader, defaultCorpus: string): InputRead[] {
  const subject = message(dir === undefined ? AppMessage.DefaultCorpusFeatureFile : AppMessage.FlaggedCorpusFeatureFile);
  return reader.featureFiles(dir ?? defaultCorpus).map((path) => ({ subject, path }));
}

function workflowInputs(ci: string | undefined, reader: InputReader, defaultWorkflows: string): InputRead[] {
  const files = reader.workflowFiles(ci ?? defaultWorkflows);
  return files.map((path) => ({ subject: workflowSubject(ci, path), path }));
}

function workflowSubject(ci: string | undefined, path: string): string {
  if (ci === undefined) return message(AppMessage.DefaultCiWorkflow);
  return message(path === ci ? AppMessage.FlaggedCiWorkflow : AppMessage.FlaggedCiFolderWorkflow);
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
