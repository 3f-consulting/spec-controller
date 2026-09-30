import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ciSourcePathsOf } from "../ingest/ciSourcePaths.js";
import { DEFAULT_CI_PATH } from "../ingest/ingestQualityChecks.js";
import { regularFileIdentity, type ReadInput } from "../outputLocation.js";
import type { IdentifiedInput } from "./emit/format.js";
import { jsonInputsOf } from "./unreadableInputs.js";

const DEFAULT_FEATURES_DIR = "features";

export interface InputReader {
  exists(path: string): boolean;
  featureFiles(dir: string): string[];
  workflowFiles(path: string): string[];
}

export const NODE_INPUT_READER: InputReader = {
  exists: existsSync,
  featureFiles: (dir) => {
    try {
      return readdirSync(dir)
        .filter((name) => name.endsWith(".feature"))
        .sort()
        .map((name) => join(dir, name));
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
  const subject = dir === undefined ? "a feature file of the corpus read by default" : "a feature file of the --features corpus";
  return reader.featureFiles(dir ?? DEFAULT_FEATURES_DIR).map((path) => ({ subject, path }));
}

function workflowInputs(ci: string | undefined, reader: InputReader): ReadInput[] {
  const files = reader.workflowFiles(ci ?? DEFAULT_CI_PATH);
  return files.map((path) => ({ subject: workflowSubject(ci, path), path }));
}

function workflowSubject(ci: string | undefined, path: string): string {
  if (ci === undefined) return "a CI workflow read by default";
  return path === ci ? "the --ci workflow" : "a workflow of the --ci folder";
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
