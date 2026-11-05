import { fileURLToPath } from "node:url";

import {
  isDateElement,
  isLiteralElement,
  isNumberElement,
  isPluralElement,
  isPoundElement,
  isSelectElement,
  isTimeElement,
  parse,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";
import { Ajv } from "ajv";
import { ESLint } from "eslint";
import { describe, it, expect } from "vitest";

import {
  CORE_MESSAGES,
  CORE_TEXTS,
  CoreMessage,
  QUALITY_CHECK_FAULT_MESSAGES,
  QualityCheckFaultCode,
  coreMessage,
  type CoreMessageValues,
  type CoreMessages,
  type QualityCheckFault,
  type WordedCoreMessage,
} from "@3f-consulting/spec-controller-core/internal";
import type { MessageValues } from "@3f-consulting/spec-controller-core";
import APP_TEXTS from "./messages.en.json" with { type: "json" };
import {
  APP_MESSAGES,
  AppError,
  AppMessage,
  Unreadable,
  type AppMessages,
  type AppErrorValues,
  type AppMessageValues,
  type WordedAppMessage,
} from "./messages.js";
import { message } from "./appText.js";
import { UNREADABLE_SUBJECTS } from "./cli-allocate/unreadable.js";
import { RECONCILIATION_TOTALS_PATH } from "../../../tests/steps/support/reportReconciliationTotals.js";

type Code = number | string;

function byCode(a: Code, b: Code): number {
  if (typeof a !== typeof b) return typeof a === "number" ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function codesOf(codes: object): Code[] {
  return Object.entries(codes)
    .filter(([name]) => Number.isNaN(Number(name)))
    .map(([, member]) => member as Code)
    .sort(byCode);
}

function handlesWithoutEntry(handles: object, catalogue: object): string[] {
  return Object.entries(handles)
    .filter(([name, member]) => Number.isNaN(Number(name)) && !Object.hasOwn(catalogue, member as PropertyKey))
    .map(([name]) => name);
}

function entriesWithoutCode(codes: readonly string[], catalogue: object): string[] {
  return Object.keys(catalogue).filter((key) => !codes.includes(key));
}

function keysOf(catalogue: object): Code[] {
  return Object.keys(catalogue)
    .map((key) => (Number.isNaN(Number(key)) ? key : Number(key)))
    .sort(byCode);
}

const NON_BLANK_MESSAGES = { type: "object", additionalProperties: { type: "string", pattern: "\\S" } };

function blankEntries(catalogue: object): string[] {
  const nonBlank = new Ajv({ allErrors: true }).compile(NON_BLANK_MESSAGES);
  if (nonBlank(catalogue)) return [];
  return (nonBlank.errors ?? []).map(({ instancePath }) => instancePath.slice(1));
}

function placeholdersOf(elements: readonly MessageFormatElement[]): string[] {
  return elements.flatMap((element) => {
    if (isLiteralElement(element) || isPoundElement(element)) return [];
    const branches = isSelectElement(element) || isPluralElement(element) ? Object.values(element.options) : [];
    return [element.value, ...branches.flatMap((branch) => placeholdersOf(branch.value))];
  });
}

function placeholdersIn(text: string): string[] {
  return [...new Set(placeholdersOf(parse(text, { ignoreTag: true })))];
}

function placeholdersNotGiven(
  texts: Readonly<Record<string, string>>,
  valuesOf: Readonly<Record<string, MessageValues>>,
): { message: string; placeholder: string }[] {
  return Object.entries(texts).flatMap(([key, text]) =>
    placeholdersIn(text)
      .filter((placeholder) => !Object.hasOwn(valuesOf[key] ?? {}, placeholder))
      .map((placeholder) => ({ message: key, placeholder })),
  );
}

function valuesNotUsed(
  texts: Readonly<Record<string, string>>,
  valuesOf: Readonly<Record<string, MessageValues>>,
): { message: string; value: string }[] {
  return Object.entries(texts).flatMap(([key, text]) => {
    const used = placeholdersIn(text);
    return Object.keys(valuesOf[key] ?? {})
      .filter((value) => !used.includes(value))
      .map((value) => ({ message: key, value }));
  });
}

function unparseable(texts: Readonly<Record<string, string>>): { message: string; error: string; offset: number }[] {
  return Object.entries(texts).flatMap(([key, text]) => {
    try {
      parse(text, { ignoreTag: true });
      return [];
    } catch (error) {
      const { message, location } = error as SyntaxError & { location: { start: { offset: number } } };
      return [{ message: key, error: message, offset: location.start.offset }];
    }
  });
}

// As written, a doubled apostrophe is one apostrophe and a lone brace between apostrophes is that brace.
function asWritten(source: string): string {
  return source.replace(/''|'([{}])'/g, (_, brace?: string) => brace ?? "'");
}

function printsAsWritten(text: string, elements: readonly MessageFormatElement[]): boolean {
  return elements.every((element) => {
    if (isLiteralElement(element)) {
      return element.value === asWritten(text.slice(element.location?.start.offset, element.location?.end.offset));
    }
    if (isSelectElement(element) || isPluralElement(element)) {
      return Object.values(element.options).every((branch) => printsAsWritten(text, branch.value));
    }
    return !isNumberElement(element) && !isDateElement(element) && !isTimeElement(element);
  });
}

function notAsWritten(texts: Readonly<Record<string, string>>): string[] {
  return Object.entries(texts)
    .filter(([, text]) => text.includes("#") || !printsAsWritten(text, parse(text, { ignoreTag: true, captureLocation: true })))
    .map(([key]) => key);
}

function choosesOtherThanByCount(elements: readonly MessageFormatElement[]): boolean {
  return elements.some((element) => {
    if (isSelectElement(element)) return true;
    if (!isPluralElement(element)) return false;
    return Object.entries(element.options).some(([selector, branch]) => selector.startsWith("=") || choosesOtherThanByCount(branch.value));
  });
}

function choosingWords(texts: Readonly<Record<string, string>>): string[] {
  return Object.entries(texts)
    .filter(([, text]) => choosesOtherThanByCount(parse(text, { ignoreTag: true })))
    .map(([key]) => key);
}

function renderedByHandle<C>(handles: object, rendered: (code: C) => string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(handles)
      .filter(([name]) => Number.isNaN(Number(name)))
      .map(([name, member]) => [name, rendered(member as C)]),
  );
}

const SAMPLE_CORE_VALUES: { readonly [C in keyof CoreMessageValues]: CoreMessageValues[C] } = {
  [CoreMessage.ConfigurationWrongKind]: { entry: "specController.runners", is: "a string", reads: "an object" },
  [CoreMessage.ConfigurationUnknownKey]: { key: "specController.extra" },
  [CoreMessage.RunnerKeyNotALayer]: { key: "smoke" },
  [CoreMessage.NotChecksEntryMatchesNoStep]: { key: "`specController.notChecks`", entry: "ci.yml / build / gone" },
  [CoreMessage.NotChecksEntryNotAStepName]: { key: "`specController.notChecks`", entry: "`Deploy`" },
  [CoreMessage.ManifestKindOfType]: { type: "number" },
  [CoreMessage.ProofsNeverRan]: { count: 2 },
  [CoreMessage.ScenarioCodeErrorCount]: { count: 2 },
  [CoreMessage.CleanNoCodedScenario]: { featureFiles: 1 },
  [CoreMessage.CleanEachFileOwnCode]: { featureFiles: 2, featureCodes: 2 },
  [CoreMessage.CleanOthersNoFeatureCode]: { featureFiles: 3, featureCodes: 2, noFeatureCode: 1 },
  [CoreMessage.UnnamedClaimCiSteps]: { count: 2 },
  [CoreMessage.UnnamedClaimCiStepsNamed]: { count: 2, list: "lint:bar, lint:foo" },
  [CoreMessage.ScenarioCodeErrorsFraming]: { count: "2 scenario code errors" },
  [CoreMessage.SeveralScnCodesFraming]: { count: "1 scenario code error" },
  [CoreMessage.MisfiledAndSeveralScnCodesFraming]: { count: "2 scenario code errors" },
  [CoreMessage.DuplicateScnCodeNotListed]: { outcome: "Evidence Obligation's @SCN code is carried by another Scenario" },
  [CoreMessage.DuplicateFeatureCode]: { code: "ABC", fileCount: 2, files: "a.feature, b.feature" },
  [CoreMessage.ForeignScnCodeCarried]: { file: "a.feature", featureCode: "ABC", scnId: "SCN-DEF-001", named: "DEF", carrierCount: 2, carriers: "d.feature, e.feature" },
  [CoreMessage.ForeignScnCodeNoCarrier]: { file: "a.feature", featureCode: "ABC", scnId: "SCN-DEF-001", named: "DEF" },
  [CoreMessage.NoFeatureCode]: { file: "a.feature" },
  [CoreMessage.ScenarioSeveralScnCodes]: { file: "a.feature", scenario: "a scenario", codeCount: 2, codes: "SCN-ABC-001, SCN-ABC-002" },
  [CoreMessage.ProvenanceTargetRepo]: { target: "/repo" },
  [CoreMessage.ProvenanceTargetRepoUntargeted]: { target: "unknown-target", origin: "owner/repo" },
  [CoreMessage.ProvenanceNotSupplied]: { flags: "--results" },
  [CoreMessage.ProvenanceRunTimestamp]: { runStartUtc: "2026-10-04T00:00:00Z" },
  [CoreMessage.ProvenanceSourceSha]: { sha: "abc1234" },
  [CoreMessage.ProvenanceToolSha]: { sha: "def5678" },
  [CoreMessage.ProvenanceToolVersion]: { version: "1.0.0" },
  [CoreMessage.RunUnsound]: { proofs: "2 proofs never ran." },
  [CoreMessage.BrokenEvidenceWhatBroke]: { locator: "features/a.feature:3" },
  [CoreMessage.VerdictExit]: { code: 1 },
  [CoreMessage.ScenarioCodeErrorsGloss]: { heading: "### Scenario code errors", alsoOutOfBalance: "" },
  [CoreMessage.SeveralScnCodesGloss]: { heading: "### Scenario code errors", alsoOutOfBalance: "" },
  [CoreMessage.MisfiledAndSeveralScnCodesGloss]: { heading: "### Scenario code errors", alsoOutOfBalance: "" },
  [CoreMessage.NothingToReconcileGloss]: { corpusDir: "features" },
  [CoreMessage.PendingTally]: { pending: 1 },
  [CoreMessage.EvidenceObservationsSum]: { total: 3, onScenario: 1, onPhantomClaim: 1, onUnnamedClaim: 1 },
  [CoreMessage.FitnessCiStep]: { steps: 2 },
  [CoreMessage.ReconcilerStep]: { step: "ci.yml / build / balance", whatItIs: "this step runs the reconciliation this report is" },
  [CoreMessage.StepNonCheck]: { entry: "ci.yml / build / lint" },
  [CoreMessage.StepAccountingNotAppliedWorkflowsReadLabel]: { key: "`specController.notChecks`", workflows: "`ci.yml`" },
  [CoreMessage.StepAccountingNotAppliedNoWorkflowReadLabel]: { key: "`specController.notChecks`" },
  [CoreMessage.ScenarioClaimReconciliationsOutOfBalance]: { outOfBalance: 1, claimReconciliations: 3 },
  [CoreMessage.NotGroupedByFeature]: { ungrouped: "1 Claim Reconciliation(s) for cited scenario ids with no real scenario" },
  [CoreMessage.PhantomClaimReconciliations]: { count: 1 },
  [CoreMessage.UnnamedClaimReconciliations]: { count: 1 },
  [CoreMessage.NoScnCodeScenarios]: { count: 1 },
  [CoreMessage.CodesAndNoScnCodeScenarios]: { codes: "SCN-ABC-001", count: 1 },
  [CoreMessage.ClaimReconciliationTally]: { total: 3, balanced: 2, outOfBalance: 1 },
  [CoreMessage.PhantomClaimTally]: { count: 1 },
  [CoreMessage.UnnamedClaimTally]: { count: 1, unnamedClaimId: "(unnamed claim)" },
  [CoreMessage.ExcludedScnOccurrences]: { count: 1 },
  [CoreMessage.UntaggedScenarios]: { count: 1 },
  [CoreMessage.SharedScnCodes]: { scenarios: 4, codes: 1 },
  [CoreMessage.SharedScnCodeScenario]: { feature: "login.feature", title: "a user with the right password is let in" },
  [CoreMessage.PendingItemFor]: { qualityCheckKind: "unit" },
  [CoreMessage.CheckStepNoOutcome]: { scnId: "SCN-ABC-001" },
  [CoreMessage.CheckStepSkipped]: { scnId: "SCN-ABC-001" },
  [CoreMessage.CheckStepEnded]: { scnId: "SCN-ABC-001", outcome: "cancelled" },
  [CoreMessage.AmbiguousNamedStep]: { step: "Given a thing" },
  [CoreMessage.UnnamedClaimGroupCounts]: { ran: 3, passed: 2, failed: 1 },
  [CoreMessage.UnnamedClaimFailedNames]: { names: "spawns yarn / reads the lockfile" },
  [CoreMessage.SeveralScnCodesCited]: { count: 2, codes: "SCN-ABC-001, SCN-ABC-002" },
  [CoreMessage.SharedScnCode]: { code: "SCN-ABC-001" },
};

function renderedCore(code: CoreMessage): string {
  if (code in CORE_MESSAGES) return CORE_MESSAGES[code as keyof CoreMessages];
  const worded = code as WordedCoreMessage;
  const values = (SAMPLE_CORE_VALUES as Partial<Record<WordedCoreMessage, MessageValues>>)[worded];
  return (coreMessage as (code: WordedCoreMessage, values?: MessageValues) => string)(worded, values);
}

const SAMPLE_APP_PARAMS: { readonly [C in keyof AppMessages]: Parameters<AppMessages[C]> } = {
  [AppError.UnexpectedError]: ["Error", "write EPIPE"],
  [AppError.UnexpectedErrorAfterVerdict]: ["Error", "write EPIPE"],
};

type AppValues = AppMessageValues & AppErrorValues;

const SAMPLE_APP_VALUES: { readonly [C in keyof AppValues]: AppValues[C] } = {
  [AppMessage.BuiltInDeferralTags]: { tags: "@wip, @pending" },
  [AppMessage.ShallowHistoryRisksPartCode]: { before: "abc1234", part: "ONE" },
  [AppMessage.ShallowHistoryRisksCodeAbove]: { before: "abc1234", code: "SCN-ONE-001" },
  [AppMessage.NoRepositoryRisksPartCode]: { part: "ONE" },
  [AppMessage.NoRepositoryRisksCodeAbove]: { code: "SCN-ONE-001" },
  [AppMessage.HighestSeenInTree]: { code: "SCN-ONE-005", path: "features/one.feature", line: 8 },
  [AppMessage.HighestSeenInCommit]: { code: "SCN-ONE-005", path: "features/one.feature", line: 8, commit: "abc1234" },
  [AppMessage.PartAlreadyHeaded]: { part: "ONE" },
  [AppMessage.HelpUsageLine]: { modifierUsage: "[--store <dir>] [--run-id <id>]" },
  [AppError.FormatNamesStoredRunManifest]: { formatPath: "store/t/r1/run.yaml", manifestPath: "store/t/r1/run.yaml", runDir: "store/t/r1" },
  [AppError.StoredRunReadsItsManifest]: { manifestPath: "store/t/r1/run.yaml", inputPath: "store/t/r1/run.yaml", inputSubject: "the cucumber report" },
  [AppMessage.SeeFlags]: { scope: "spec-controller balance" },
  [AppMessage.SeeFlagsAndValues]: { scope: "spec-controller balance" },
  [AppMessage.SeeArguments]: { scope: "spec-controller allocate" },
  [AppError.NoCommandAfterModifiers]: { modifiers: "--store" },
  [AppError.ModifierTookCommand]: { modifier: "--store", command: "balance" },
  [AppMessage.GiveModifierItsOwnValue]: { modifier: "--store", arg: "<root>", command: "balance" },
  [AppError.FlagBeforeCommand]: { flag: "--strict", modifiers: "--store, --run-id" },
  [AppError.UnknownCommand]: { command: "frobnicate" },
  [AppError.ModifiersNotTaken]: { command: "allocate", modifiers: "--store" },
  [AppMessage.RunWithoutModifiers]: { command: "allocate" },
  [AppError.MissingValue]: { flag: "--features", scope: "spec-controller balance", arg: "<dir>" },
  [AppError.GivenTwice]: { flag: "--strict", scope: "spec-controller balance" },
  [AppError.EqualsForm]: { token: "--features=x", scope: "spec-controller balance", spelling: "--features x" },
  [AppError.TakesNoValue]: { flag: "--strict", scope: "spec-controller balance", value: "yes" },
  [AppError.ExtraArgument]: { token: "extra", scope: "spec-controller allocate", takes: "<part>" },
  [AppError.NotAFlag]: { token: "stray", scope: "spec-controller balance" },
  [AppError.MisplacedModifier]: { modifier: "--store", command: "balance" },
  [AppError.UnknownFlag]: { flag: "--nope", scope: "spec-controller balance", toolVersion: "1.0.0", command: "balance" },
  [AppMessage.PinDrifted]: { command: "balance", flag: "--nope" },
  [AppMessage.OtherwiseSeeFlags]: { scope: "spec-controller balance" },
  [AppError.RetiredFlag]: { flag: "--measurements", scope: "spec-controller balance", retiredIn: "0.1.0-alpha.5", toolVersion: "1.0.0" },
  [AppError.ReRenderNotStored]: { modifiers: "--store" },
  [AppMessage.ReRenderWithout]: { count: 2 },
  [AppError.RunIdWithoutStore]: { runId: "r1" },
  [AppMessage.KeepRunUnderName]: { command: "balance" },
  [AppError.ReRenderReadsOnly]: { ignored: "--features" },
  [AppError.UnknownFormat]: { formats: "html", supported: "md, json" },
  [AppError.MoreThanOneToStdout]: { formats: "md, json" },
  [AppError.OutputsShareFile]: { first: "md:out.md", second: "json:out.md" },
  [AppError.OutputOverwritesInput]: { output: "json:vitest.json", subject: "The --vitest report", path: "vitest.json" },
  [AppError.OutputOverwritesStoredRun]: { path: "store/t/r0/run.yaml", runDir: "store/t/r0" },
  [AppError.UnknownPartRefused]: { part: "ZZZ", parts: "ONE, TWO" },
  [AppError.NotAFeaturePart]: { part: "one" },
  [AppMessage.FormatOnStandardOutput]: { fmt: "md" },
  [AppMessage.CodedUsageError]: { command: "allocate", code: AppError.ExtraArgument, message: "too many arguments" },
  [AppMessage.CodedHostUsageError]: { code: AppError.ModifiersNotTaken, message: "--store applies to stored runs only" },
  [AppError.WorkingDirectoryUnreadable]: { subject: "the tree", reason: "EACCES" },
  [AppError.CouldNotBeRead]: { subject: "a file in the tree", path: "features/a.feature", reason: "EISDIR" },
  [AppMessage.GitExited]: { command: "log", status: "128", said: "fatal: not a git repository" },
  [AppMessage.FeatureCorpusDirectoryMissing]: { directory: "features" },
  [AppError.InputPathMissing]: { flag: "--vitest", path: "vitest.json" },
  [AppMessage.FlaggedFile]: { flag: "--vitest" },
  [AppMessage.FlaggedReport]: { flag: "--vitest" },
  [AppMessage.FlaggedRecord]: { flag: "--ci-steps" },
  [AppMessage.FlaggedManifest]: { flag: "--package-json" },
  [AppMessage.FlaggedSavedReport]: { flag: "--render-from-json" },
  [AppMessage.FlaggedCorpus]: { flag: "--features" },
  [AppMessage.FlaggedWorkflows]: { flag: "--ci" },
  [AppError.NotValidJson]: { subject: "The --vitest report", path: "vitest.json", reason: "Unexpected end of JSON input" },
  [AppError.NotValidJsonInShape]: {
    subject: "The --jest report",
    shape: "of the JSON report jest --json writes",
    path: "jest.json",
    reason: "Unexpected end of JSON input",
  },
  [AppMessage.XmlFaultAtLine]: { fault: "char '{' is not expected", line: 1 },
  [AppError.NotValidXml]: {
    subject: "The --pytest report",
    shape: "of the JUnit XML report pytest --junitxml writes",
    path: "report.xml",
    reason: "char '{' is not expected at line 1",
  },
  [AppError.NotInShape]: { subject: "The --vitest report", shape: "the Vitest JSON reporter writes", path: "vitest.json", fault: "testResults is missing" },
  [AppError.NotASavedReconciliation]: { subject: "The --render-from-json file", path: "saved.json", fault: "claimReconciliations is missing" },
  [AppError.NotRenderableAsSaved]: { subject: "The --render-from-json file", path: "saved.json", reason: "cannot read properties of undefined" },
  [AppError.CorpusFileUnparseable]: { corpus: "The --features corpus", file: "features/a.feature", message: "(3:1): expected: #Feature" },
  [AppError.WorkflowNotYaml]: { workflows: "The --ci workflows", file: "ci.yml", message: "Flow sequence in block collection must end with a ]" },
  [AppError.ReportNotWritten]: { format: "json", path: "out/report.json", reason: "ENOTDIR: not a directory" },
  [AppError.StoredRunDirectoryNotCreated]: { path: "store/t/r1", reason: "ENOTDIR: not a directory" },
  [AppMessage.ShapeKindOfType]: { type: "number" },
  [AppMessage.ShapeWrongKind]: { where: "testResults", found: "an object", expected: "a list" },
  [AppMessage.ShapeFieldMissing]: { path: RECONCILIATION_TOTALS_PATH },
};

function renderedApp(code: AppMessage | AppError): string {
  if (code in APP_MESSAGES) {
    const tabled = code as keyof AppMessages;
    return (APP_MESSAGES[tabled] as (...params: unknown[]) => string)(...SAMPLE_APP_PARAMS[tabled]);
  }
  const worded = code as WordedAppMessage | AppError;
  const values = (SAMPLE_APP_VALUES as Partial<Record<WordedAppMessage | AppError, MessageValues>>)[worded];
  return (message as (code: WordedAppMessage | AppError, values?: MessageValues) => string)(worded, values);
}

const SAMPLE_FAULTS: { readonly [C in QualityCheckFaultCode]: Extract<QualityCheckFault, { readonly code: C }> } = {
  [QualityCheckFaultCode.EvidenceDivergesFromOutcome]: {
    code: QualityCheckFaultCode.EvidenceDivergesFromOutcome,
    evidence: "evidence-obligation",
    outcome: "satisfied",
    presenceForOutcome: "Exists",
    presenceFound: "None",
  },
};

function renderedFault(code: QualityCheckFaultCode): string {
  return (QUALITY_CHECK_FAULT_MESSAGES[code] as (fault: QualityCheckFault) => string)(SAMPLE_FAULTS[code]);
}

describe("[SCN-MSG-002] every code has exactly one message", () => {
  it("holds core's report catalogue to every core message code and nothing else", () => {
    const codes = codesOf(CoreMessage);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf({ ...CORE_MESSAGES, ...CORE_TEXTS })).toEqual(codes);
  });

  it("holds the app's catalogue to every app message code and nothing else", () => {
    const codes = [...codesOf(AppMessage), ...codesOf(AppError)].sort(byCode);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf({ ...APP_MESSAGES, ...APP_TEXTS })).toEqual(codes);
  });

  it("names a handle that has no entry in its catalogue", () => {
    const handles = { Kept: "kept", Lost: "lost" };
    expect(handlesWithoutEntry(handles, { kept: "Kept." })).toEqual(["Lost"]);
  });

  it("names a code given two entries in an app data file, linted by the repository's own ESLint configuration", async () => {
    const root = fileURLToPath(new URL("../../..", import.meta.url));
    const eslint = new ESLint({ cwd: root });
    const text = '{\n  "unknown-flag": "One.",\n  "unknown-flag": "Two."\n}\n';
    for (const dataFile of ["packages/spec-controller/src/messages.en.json", "packages/core/src/render/messages.en.json"]) {
      const [result] = await eslint.lintText(text, { filePath: `${root}${dataFile}` });
      const found = result?.messages.map(({ ruleId, message }) => ({ ruleId, message }));
      expect(found).toEqual([{ ruleId: "json/no-duplicate-keys", message: expect.stringContaining('"unknown-flag"') }]);
    }
  });

  it("holds core's fault catalogue to every fault code and nothing else, with no fault rendering blank", () => {
    const codes = codesOf(QualityCheckFaultCode);
    expect(codes.length).toBeGreaterThan(0);
    expect(keysOf(QUALITY_CHECK_FAULT_MESSAGES)).toEqual(codes);

    for (const code of codes as QualityCheckFaultCode[]) expect(renderedFault(code).trim()).not.toBe("");
  });

  it("holds the app's unreadable subjects to every Unreadable member and nothing else, each its own and none blank", () => {
    const members = codesOf(Unreadable) as Unreadable[];
    expect(members.length).toBeGreaterThan(0);
    expect(keysOf(UNREADABLE_SUBJECTS)).toEqual(members);

    const subjects = members.map((member) => UNREADABLE_SUBJECTS[member]);
    expect(new Set(subjects).size).toBe(members.length);
    for (const subject of subjects) expect(subject.trim()).not.toBe("");
  });
});

describe("[SCN-MSG-003] every message belongs to a code", () => {
  it("holds the app's data file to entries an app message or error code uses, naming any other", () => {
    const codes = [...codesOf(AppMessage), ...codesOf(AppError)].filter((code) => typeof code === "string");
    expect(codes.length).toBeGreaterThan(0);
    expect(entriesWithoutCode(codes, APP_TEXTS)).toEqual([]);
    const coreCodes = codesOf(CoreMessage).filter((code) => typeof code === "string");
    expect(coreCodes.length).toBeGreaterThan(0);
    expect(entriesWithoutCode(coreCodes, CORE_TEXTS)).toEqual([]);
  });
});

describe("[SCN-MSG-004] no message is empty", () => {
  it("names an entry that is empty or only whitespace", () => {
    expect(blankEntries({ kept: "Kept.", empty: "", spaces: " \t\n" })).toEqual(["empty", "spaces"]);
  });

  it("holds the app's data file to messages that are not blank", () => {
    expect(blankEntries(APP_TEXTS)).toEqual([]);
    expect(blankEntries(CORE_TEXTS)).toEqual([]);
  });

  it("holds every entry of core's report catalogue and the app's catalogue to a message that does not render blank, naming it by its handle", () => {
    expect(blankEntries(renderedByHandle(CoreMessage, renderedCore))).toEqual([]);
    expect(blankEntries({ ...renderedByHandle(AppMessage, renderedApp), ...renderedByHandle(AppError, renderedApp) })).toEqual([]);
  });
});

describe("[SCN-MSG-005] a message uses only the values its code gives it", () => {
  it("names a message using a placeholder its code does not give, and the placeholder, in any branch of a plural", () => {
    const texts = { greeting: "Hello {name}, from {sender}.", files: "{count, plural, one {# file in {dir}} other {# files}}" };
    const values = { greeting: { name: "Ada" }, files: { count: 1 } };
    expect(placeholdersNotGiven(texts, values)).toEqual([
      { message: "greeting", placeholder: "sender" },
      { message: "files", placeholder: "dir" },
    ]);
  });

  it("holds every message in the app's data file to the values its code's sample values give", () => {
    expect(placeholdersNotGiven(APP_TEXTS, SAMPLE_APP_VALUES as Readonly<Record<string, MessageValues>>)).toEqual([]);
    expect(placeholdersNotGiven(CORE_TEXTS, SAMPLE_CORE_VALUES as Readonly<Record<string, MessageValues>>)).toEqual([]);
  });
});

describe("[SCN-MSG-006] a message uses every value its code gives it", () => {
  it("names a message leaving out a value its code gives, and the value, reading every branch of a plural", () => {
    const texts = { greeting: "Hello {name}.", files: "{count, plural, one {# file in {dir}} other {# files}}" };
    const values = { greeting: { name: "Ada", sender: "Bo" }, files: { count: 1, dir: "src", owner: "Cy" } };
    expect(valuesNotUsed(texts, values)).toEqual([
      { message: "greeting", value: "sender" },
      { message: "files", value: "owner" },
    ]);
  });

  it("holds every message in the app's data file to use every value its code's sample values give", () => {
    expect(valuesNotUsed(APP_TEXTS, SAMPLE_APP_VALUES as Readonly<Record<string, MessageValues>>)).toEqual([]);
    expect(valuesNotUsed(CORE_TEXTS, SAMPLE_CORE_VALUES as Readonly<Record<string, MessageValues>>)).toEqual([]);
  });
});

describe("[SCN-MSG-007] every message parses", () => {
  it("names a message the format cannot parse, with the parser's words and the offset where it failed", () => {
    const texts = { kept: "Hello {name}.", unclosed: "unknown command {command." };
    expect(unparseable(texts)).toEqual([{ message: "unclosed", error: "MALFORMED_ARGUMENT", offset: 16 }]);
  });

  it("holds every message in the app's data file to parse", () => {
    expect(unparseable(APP_TEXTS)).toEqual([]);
    expect(unparseable(CORE_TEXTS)).toEqual([]);
  });
});

describe("[SCN-MSG-008] every message prints its words as written", () => {
  it("names a message whose apostrophe, brace or hash sign would not print as written, or whose number the locale formats", () => {
    const texts = {
      doubled: "Run ''{scope} --help' to see the flags.",
      quotedBrace: "A literal '{' brace and '}' brace.",
      counted: "{count, plural, one {{count} file} other {{count} files}}",
      beforePlaceholder: "Run '{scope} --help' to see the flags.",
      swallowsText: "The '} flag's value is lost.",
      swallowsBrace: "An unclosed '{ brace.",
      inPlural: "{count, plural, one {'{count}' file} other {{count} files}}",
      hashOutside: "Item #1.",
      hashInside: "{count, plural, one {# file} other {# files}}",
      localeNumber: "{count, number} files.",
    };
    expect(notAsWritten(texts)).toEqual(["beforePlaceholder", "swallowsText", "swallowsBrace", "inPlural", "hashOutside", "hashInside", "localeNumber"]);
  });

  it("holds every message in the app's data file to print its words as written", () => {
    expect(notAsWritten(APP_TEXTS)).toEqual([]);
    expect(notAsWritten(CORE_TEXTS)).toEqual([]);
  });
});

describe("[SCN-MSG-009] no message chooses between words other than by a count's plural forms", () => {
  it("names a message that uses select, or an exact plural selector, at any depth", () => {
    const texts = {
      counted: "{count, plural, one {{count} file} other {{count} files}}",
      selected: "{kind, select, flag {the flag} other {the command}}",
      exact: "{count, plural, =0 {no files} one {{count} file} other {{count} files}}",
      selectedInPlural: "{count, plural, one {{kind, select, flag {a flag} other {a command}}} other {{count} parts}}",
      exactInPlural: "{count, plural, one {{dirs, plural, =1 {one dir} other {dirs}}} other {{count} files}}",
    };
    expect(choosingWords(texts)).toEqual(["selected", "exact", "selectedInPlural", "exactInPlural"]);
  });

  it("holds every message in the app's data file to choose between words only by a count's plural forms", () => {
    expect(choosingWords(APP_TEXTS)).toEqual([]);
    expect(choosingWords(CORE_TEXTS)).toEqual([]);
  });
});
