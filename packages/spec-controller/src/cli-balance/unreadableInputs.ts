import {
  ciReadFault,
  corpusReadFault,
  DEFAULT_PACKAGE_JSON,
  type InputReadFault,
} from "../ingest/ingestQualityChecks.js";
import {
  CI_STEP_RECORD,
  CUCUMBER_REPORT,
  PACKAGE_MANIFEST,
  SAVED_RECONCILIATION,
  shapeFaultIn,
  VITEST_REPORT,
  type Shape,
} from "../ingest/inputShapes.js";
import { reRender, type ReRendered } from "./reRender.js";

export interface JsonInput {
  readonly subject: string;
  readonly path: string;
  readonly shape: Shape;
  readonly writer: string;
}

interface ReadShape {
  readonly noun: string;
  readonly writer: string;
  readonly shape: Shape;
}

const READ_SHAPES: Readonly<Record<string, ReadShape>> = {
  vitest: { noun: "report", writer: "the Vitest JSON reporter writes", shape: VITEST_REPORT },
  cucumber: { noun: "report", writer: "the Cucumber JSON formatter writes", shape: CUCUMBER_REPORT },
  "ci-steps": { noun: "record", writer: "of a CI run's record of its steps", shape: CI_STEP_RECORD },
  "package-json": { noun: "manifest", writer: "of a package.json manifest", shape: PACKAGE_MANIFEST },
};

export function jsonInputsOf(args: Record<string, string>, exists: (path: string) => boolean): JsonInput[] {
  const given = Object.entries(READ_SHAPES).flatMap(([flag, read]) => {
    const path = args[flag];
    if (path === undefined) return [];
    return [{ subject: `The --${flag} ${read.noun}`, path, shape: read.shape, writer: read.writer }];
  });
  if (args["package-json"] !== undefined || !exists(DEFAULT_PACKAGE_JSON)) return given;
  const { shape, writer } = READ_SHAPES["package-json"]!;
  return [...given, { subject: "The package.json read by default", path: DEFAULT_PACKAGE_JSON, shape, writer }];
}

function reasonOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function jsonInputFault(input: JsonInput, read: (path: string) => string): string | null {
  let text: string;
  try {
    text = read(input.path);
  } catch (err) {
    return `${input.subject} could not be read: ${input.path} (${reasonOf(err)})`;
  }
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch (err) {
    return `${input.subject} is not valid JSON: ${input.path} (${reasonOf(err)})`;
  }
  const fault = shapeFaultIn(document, input.shape);
  if (fault === null) return null;
  return `${input.subject} is not in the shape ${input.writer}: ${input.path} (${fault})`;
}

export function checkInputShapes(inputs: readonly JsonInput[], read: (path: string) => string): string | null {
  for (const input of inputs) {
    const fault = jsonInputFault(input, read);
    if (fault !== null) return fault;
  }
  return null;
}

function pathRefusal(subject: string, fault: InputReadFault): string {
  return `${subject} could not be read: ${fault.path} (${fault.reason})`;
}

export function checkInputPaths(args: Record<string, string>): string | null {
  const corpus = corpusReadFault(args["features"]);
  if (corpus !== null) {
    return pathRefusal(args["features"] === undefined ? "The feature corpus read by default" : "The --features corpus", corpus);
  }
  const ci = ciReadFault(args["ci"]);
  if (ci !== null) return pathRefusal(args["ci"] === undefined ? "The CI workflows read by default" : "The --ci workflows", ci);
  return null;
}

export function checkSavedReconciliation(path: string, savedJson: string): string | null {
  const fault = shapeFaultIn(JSON.parse(savedJson), SAVED_RECONCILIATION);
  if (fault === null) return null;
  return `The --render-from-json file is not a saved reconciliation: ${path} (${fault})`;
}

export function reRenderOrRefusal(path: string, savedJson: string, strict: boolean): ReRendered | string {
  try {
    return reRender(savedJson, strict);
  } catch (err) {
    return `The --render-from-json file could not be rendered as a saved reconciliation: ${path} (${reasonOf(err)})`;
  }
}
