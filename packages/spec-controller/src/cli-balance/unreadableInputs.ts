/**
 * The input guards that decide, before anything is reconciled, whether the run can read what it
 * was handed. Each returns the refusal to print or null, and `refuseUnreadableInputs` in ./cli.ts
 * turns a refusal into exit 2: an input the tool cannot read is a usage error, never a verdict.
 */

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

/** One JSON input the run will read: how a refusal names it, where it is, and the shape it must have. */
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

/** Each JSON-bearing flag whose reader expects a shape, keyed by the flag without its dashes. */
const READ_SHAPES: Readonly<Record<string, ReadShape>> = {
  vitest: { noun: "report", writer: "the Vitest JSON reporter writes", shape: VITEST_REPORT },
  cucumber: { noun: "report", writer: "the Cucumber JSON formatter writes", shape: CUCUMBER_REPORT },
  "ci-steps": { noun: "record", writer: "of a CI run's record of its steps", shape: CI_STEP_RECORD },
  "package-json": { noun: "manifest", writer: "of a package.json manifest", shape: PACKAGE_MANIFEST },
};

/**
 * The JSON inputs this invocation hands the readers, in flag order: each one given, and the
 * package.json the run reads by default when none is given and there is one to read.
 */
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

/** The first input that cannot be read in the shape its reader expects, as the refusal; else null. */
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

/**
 * The feature corpus or CI workflow path the run cannot read, as the refusal: a path that is not
 * the kind its flag reads, or one the operating system will not let it read. Else null. Both are
 * read here by the same discovery the reconcile reads them by.
 */
export function checkInputPaths(args: Record<string, string>): string | null {
  const corpus = corpusReadFault(args["features"]);
  if (corpus !== null) {
    return pathRefusal(args["features"] === undefined ? "The feature corpus read by default" : "The --features corpus", corpus);
  }
  const ci = ciReadFault(args["ci"]);
  if (ci !== null) return pathRefusal(args["ci"] === undefined ? "The CI workflows read by default" : "The --ci workflows", ci);
  return null;
}

/** The saved file given to `--render-from-json`, refused when it is not a saved reconciliation at its top; else null. */
export function checkSavedReconciliation(path: string, savedJson: string): string | null {
  const fault = shapeFaultIn(JSON.parse(savedJson), SAVED_RECONCILIATION);
  if (fault === null) return null;
  return `The --render-from-json file is not a saved reconciliation: ${path} (${fault})`;
}

/**
 * The re-render of a saved reconciliation, or the refusal naming the file when the renderer cannot
 * read it. The file is this path's only input, so a render that fails is a file the tool cannot read.
 */
export function reRenderOrRefusal(path: string, savedJson: string, strict: boolean): ReRendered | string {
  try {
    return reRender(savedJson, strict);
  } catch (err) {
    return `The --render-from-json file could not be rendered as a saved reconciliation: ${path} (${reasonOf(err)})`;
  }
}
