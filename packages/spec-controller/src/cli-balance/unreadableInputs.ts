import { statSync } from "node:fs";
import {
  DEFAULT_PACKAGE_JSON,
  type CorpusReading,
  type InputReadFault,
  type WorkflowReading,
} from "../ingest/ingestQualityChecks.js";
import {
  CI_STEP_RECORD,
  CUCUMBER_REPORT,
  JUNIT_REPORT,
  PACKAGE_MANIFEST,
  RSPEC_REPORT,
  SAVED_RECONCILIATION,
  shapeFaultIn,
  VITEST_REPORT,
  type Shape,
} from "../ingest/inputShapes.js";
import { junitReportPathsOf } from "../ingest/junitReportPaths.js";
import { parseJunitXml, parseJunitXmlLiftingBareSuite } from "../ingest/junitXml.js";
import { reRender, type ReRendered } from "./reRender.js";
import { APP_MESSAGES, AppMessage } from "../messages.js";

interface Syntax {
  readonly parse: (text: string) => unknown;
  readonly notValid: (subject: string, writer: string, path: string, reason: string) => string;
}

const JSON_SYNTAX: Syntax = {
  parse: (text) => JSON.parse(text),
  notValid: (subject, _writer, path, reason) => APP_MESSAGES[AppMessage.NotValidJson](subject, path, reason),
};

const JSON_SYNTAX_NAMING_SHAPE: Syntax = {
  parse: (text) => JSON.parse(text),
  notValid: APP_MESSAGES[AppMessage.NotValidJsonInShape],
};

const XML_SYNTAX: Syntax = {
  parse: parseJunitXml,
  notValid: APP_MESSAGES[AppMessage.NotValidXml],
};

const XML_SYNTAX_LIFTING_BARE_SUITE: Syntax = {
  parse: parseJunitXmlLiftingBareSuite,
  notValid: APP_MESSAGES[AppMessage.NotValidXml],
};

export interface JsonInput {
  readonly subject: string;
  readonly path: string;
  readonly shape: Shape;
  readonly writer: string;
  readonly syntax: Syntax;
}

interface ReadShape {
  readonly subject: (flag: string) => string;
  readonly writer: string;
  readonly shape: Shape;
  readonly syntax: Syntax;
  readonly readsADirectoryOfReports?: true;
}

const READ_SHAPES: Readonly<Record<string, ReadShape>> = {
  vitest: {
    subject: APP_MESSAGES[AppMessage.FlaggedReport],
    writer: APP_MESSAGES[AppMessage.VitestReportShape](),
    shape: VITEST_REPORT,
    syntax: JSON_SYNTAX,
  },
  pytest: {
    subject: APP_MESSAGES[AppMessage.FlaggedReport],
    writer: APP_MESSAGES[AppMessage.JunitReportShape](),
    shape: JUNIT_REPORT,
    syntax: XML_SYNTAX,
  },
  jest: {
    subject: APP_MESSAGES[AppMessage.FlaggedReport],
    writer: APP_MESSAGES[AppMessage.JestReportShape](),
    shape: VITEST_REPORT,
    syntax: JSON_SYNTAX_NAMING_SHAPE,
  },
  rspec: {
    subject: APP_MESSAGES[AppMessage.FlaggedReport],
    writer: APP_MESSAGES[AppMessage.RspecReportShape](),
    shape: RSPEC_REPORT,
    syntax: JSON_SYNTAX_NAMING_SHAPE,
  },
  junit: {
    subject: APP_MESSAGES[AppMessage.FlaggedReport],
    writer: APP_MESSAGES[AppMessage.JunitXmlReportShape](),
    shape: JUNIT_REPORT,
    syntax: XML_SYNTAX_LIFTING_BARE_SUITE,
    readsADirectoryOfReports: true,
  },
  cucumber: {
    subject: APP_MESSAGES[AppMessage.FlaggedReport],
    writer: APP_MESSAGES[AppMessage.CucumberReportShape](),
    shape: CUCUMBER_REPORT,
    syntax: JSON_SYNTAX,
  },
  "ci-steps": {
    subject: APP_MESSAGES[AppMessage.FlaggedRecord],
    writer: APP_MESSAGES[AppMessage.CiStepRecordShape](),
    shape: CI_STEP_RECORD,
    syntax: JSON_SYNTAX,
  },
  "package-json": {
    subject: APP_MESSAGES[AppMessage.FlaggedManifest],
    writer: APP_MESSAGES[AppMessage.PackageManifestShape](),
    shape: PACKAGE_MANIFEST,
    syntax: JSON_SYNTAX,
  },
};

export function jsonInputsOf(args: Record<string, string>, exists: (path: string) => boolean): JsonInput[] {
  const given = Object.entries(READ_SHAPES).flatMap(([flag, read]) => {
    const path = args[flag];
    if (path === undefined) return [];
    const paths = read.readsADirectoryOfReports === true && isDirectory(path) ? reportFilesIn(path) : [path];
    const subject = read.subject(`--${flag}`);
    return paths.map((file) => ({ subject, path: file, shape: read.shape, writer: read.writer, syntax: read.syntax }));
  });
  if (args["package-json"] !== undefined || !exists(DEFAULT_PACKAGE_JSON)) return given;
  const { shape, writer, syntax } = READ_SHAPES["package-json"]!;
  return [...given, { subject: APP_MESSAGES[AppMessage.DefaultPackageJson](), path: DEFAULT_PACKAGE_JSON, shape, writer, syntax }];
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    // A path that cannot be stat'd is left to the read, which names why it failed.
    return false;
  }
}

function reportFilesIn(directory: string): string[] {
  try {
    return junitReportPathsOf(directory);
  } catch {
    // A directory that cannot be listed is left to the read, which names why it failed.
    return [directory];
  }
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
    document = input.syntax.parse(text);
  } catch (err) {
    return input.syntax.notValid(input.subject, input.writer, input.path, reasonOf(err));
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

export function corpusDirRefusal(fault: InputReadFault): string {
  return pathRefusal(APP_MESSAGES[AppMessage.DefaultFeatureCorpus](), fault);
}

export function checkInputPaths(
  args: Record<string, string>,
  corpusReading: CorpusReading,
  workflowReading: WorkflowReading,
): string | null {
  if (corpusReading.kind === "read-fault") {
    return pathRefusal(
      args["features"] === undefined
        ? APP_MESSAGES[AppMessage.DefaultFeatureCorpus]()
        : APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"),
      corpusReading.fault,
    );
  }
  if (workflowReading.kind === "read-fault") {
    return pathRefusal(workflowsSubjectOf(args), workflowReading.fault);
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

function workflowsSubjectOf(args: Record<string, string>): string {
  return args["ci"] === undefined ? APP_MESSAGES[AppMessage.DefaultCiWorkflows]() : APP_MESSAGES[AppMessage.FlaggedWorkflows]("--ci");
}

export function checkWorkflowsParse(args: Record<string, string>, workflowReading: WorkflowReading): string | null {
  if (workflowReading.kind !== "unparseable") return null;
  const { file, message } = workflowReading.faults[0]!;
  return APP_MESSAGES[AppMessage.WorkflowNotYaml](workflowsSubjectOf(args), file, message);
}
