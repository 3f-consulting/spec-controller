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
import { APP_MESSAGES, AppMessage } from "../messages.js";

export interface JsonInput {
  readonly subject: string;
  readonly path: string;
  readonly shape: Shape;
  readonly writer: string;
}

interface ReadShape {
  readonly subject: (flag: string) => string;
  readonly writer: string;
  readonly shape: Shape;
}

const READ_SHAPES: Readonly<Record<string, ReadShape>> = {
  vitest: {
    subject: APP_MESSAGES[AppMessage.FlaggedReport],
    writer: APP_MESSAGES[AppMessage.VitestReportShape](),
    shape: VITEST_REPORT,
  },
  cucumber: {
    subject: APP_MESSAGES[AppMessage.FlaggedReport],
    writer: APP_MESSAGES[AppMessage.CucumberReportShape](),
    shape: CUCUMBER_REPORT,
  },
  "ci-steps": {
    subject: APP_MESSAGES[AppMessage.FlaggedRecord],
    writer: APP_MESSAGES[AppMessage.CiStepRecordShape](),
    shape: CI_STEP_RECORD,
  },
  "package-json": {
    subject: APP_MESSAGES[AppMessage.FlaggedManifest],
    writer: APP_MESSAGES[AppMessage.PackageManifestShape](),
    shape: PACKAGE_MANIFEST,
  },
};

export function jsonInputsOf(args: Record<string, string>, exists: (path: string) => boolean): JsonInput[] {
  const given = Object.entries(READ_SHAPES).flatMap(([flag, read]) => {
    const path = args[flag];
    if (path === undefined) return [];
    return [{ subject: read.subject(`--${flag}`), path, shape: read.shape, writer: read.writer }];
  });
  if (args["package-json"] !== undefined || !exists(DEFAULT_PACKAGE_JSON)) return given;
  const { shape, writer } = READ_SHAPES["package-json"]!;
  return [...given, { subject: APP_MESSAGES[AppMessage.DefaultPackageJson](), path: DEFAULT_PACKAGE_JSON, shape, writer }];
}

export function reasonOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function jsonInputFault(input: JsonInput, read: (path: string) => string): string | null {
  let text: string;
  try {
    text = read(input.path);
  } catch (err) {
    return APP_MESSAGES[AppMessage.CouldNotBeReadAt](input.subject, input.path, reasonOf(err));
  }
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch (err) {
    return APP_MESSAGES[AppMessage.NotValidJson](input.subject, input.path, reasonOf(err));
  }
  const fault = shapeFaultIn(document, input.shape);
  if (fault === null) return null;
  return APP_MESSAGES[AppMessage.NotInShape](input.subject, input.writer, input.path, fault);
}

export function checkInputShapes(inputs: readonly JsonInput[], read: (path: string) => string): string | null {
  for (const input of inputs) {
    const fault = jsonInputFault(input, read);
    if (fault !== null) return fault;
  }
  return null;
}

function pathRefusal(subject: string, fault: InputReadFault): string {
  return APP_MESSAGES[AppMessage.CouldNotBeReadAt](subject, fault.path, fault.reason);
}

export function checkInputPaths(args: Record<string, string>): string | null {
  const corpus = corpusReadFault(args["features"]);
  if (corpus !== null) {
    return pathRefusal(
      args["features"] === undefined
        ? APP_MESSAGES[AppMessage.DefaultFeatureCorpus]()
        : APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"),
      corpus,
    );
  }
  const ci = ciReadFault(args["ci"]);
  if (ci !== null) {
    return pathRefusal(
      args["ci"] === undefined ? APP_MESSAGES[AppMessage.DefaultCiWorkflows]() : APP_MESSAGES[AppMessage.FlaggedWorkflows]("--ci"),
      ci,
    );
  }
  return null;
}

export function checkSavedReconciliation(path: string, savedJson: string): string | null {
  const fault = shapeFaultIn(JSON.parse(savedJson), SAVED_RECONCILIATION);
  if (fault === null) return null;
  return APP_MESSAGES[AppMessage.NotASavedReconciliation](APP_MESSAGES[AppMessage.FlaggedFile]("--render-from-json"), path, fault);
}

export function reRenderOrRefusal(path: string, savedJson: string, strict: boolean): ReRendered | string {
  try {
    return reRender(savedJson, strict);
  } catch (err) {
    return APP_MESSAGES[AppMessage.NotRenderableAsSaved](
      APP_MESSAGES[AppMessage.FlaggedFile]("--render-from-json"),
      path,
      reasonOf(err),
    );
  }
}
