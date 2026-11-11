import { existsSync } from "node:fs";
import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { DEFAULT_CI_PATH } from "./ingestQualityChecks.js";
import { corpusFeatureFiles } from "./ingestScenarios.js";
import { DEFAULT_FEATURES_DIR } from "../runRequest/defaults.js";
import { AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { regularFileIdentity, type ReadInput } from "../output/outputLocation.js";
import type { IdentifiedInput } from "../output/format.js";
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

export function inputsReadBy(args: Record<string, string>, reader: InputReader): ReadInput[] {
  const reports = jsonInputsOf(args, reader.exists).map(({ subject, path }) => ({ subject: lowerFirst(subject), path }));
  return [...reports, ...featureInputs(args["features"], reader), ...workflowInputs(args["ci"], reader)];
}

export function identifiedInputs(inputs: readonly ReadInput[]): IdentifiedInput[] {
  return inputs.map((input) => ({ ...input, identity: regularFileIdentity(input.path) }));
}

function featureInputs(dir: string | undefined, reader: InputReader): ReadInput[] {
  const subject = message(dir === undefined ? AppMessage.DefaultCorpusFeatureFile : AppMessage.FlaggedCorpusFeatureFile);
  return reader.featureFiles(dir ?? DEFAULT_FEATURES_DIR).map((path) => ({ subject, path }));
}

function workflowInputs(ci: string | undefined, reader: InputReader): ReadInput[] {
  const files = reader.workflowFiles(ci ?? DEFAULT_CI_PATH);
  return files.map((path) => ({ subject: workflowSubject(ci, path), path }));
}

function workflowSubject(ci: string | undefined, path: string): string {
  if (ci === undefined) return message(AppMessage.DefaultCiWorkflow);
  return message(path === ci ? AppMessage.FlaggedCiWorkflow : AppMessage.FlaggedCiFolderWorkflow);
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
