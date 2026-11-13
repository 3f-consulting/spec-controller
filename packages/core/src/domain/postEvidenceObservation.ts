import { claimCodeCitationsIn, type ClaimCode } from "./claimCodes.js";
import type { ExecutableClaim, QualityCheckKind } from "./postEvidenceObligation.js";

export type Result = "passed" | "passed-on-error" | "failed" | "never-ran";

// place is a file or a CI step; name is a test's title where it has one. A report joins them to say where to look.
export interface EvidenceObservation {
  readonly cites: readonly ClaimCode[];
  readonly result: Result;
  readonly kind: QualityCheckKind;
  readonly place: string;
  readonly name?: string;
  readonly message?: string;
  readonly notes: readonly string[];
}

export interface PhantomClaim {
  readonly claimCode: ClaimCode;
}

// The claim that takes evidence no one executable claim can: it holds nothing.
export interface UnnamedClaim {
  readonly claimCode?: never;
  readonly file?: never;
}

// What each reader reports, as written. Which result each status means is the domain's. report is the evidence
// report it came from, as its reader names it, since what a status means can differ between them.

// A report of test results kept by test file.
export interface ResultsByFileAsWritten {
  readonly report: string;
  readonly file: string;
  readonly status: string;
  readonly message?: string;
  readonly results: readonly ResultInFileAsWritten[];
}

export interface ResultInFileAsWritten {
  readonly ancestorTitles: readonly string[];
  readonly title: string;
  readonly status: string;
  readonly failureMessages: readonly string[];
}

// A report of test results kept by suite, each result with its properties.
export interface ResultsBySuiteAsWritten {
  readonly report: string;
  readonly name: string;
  readonly file?: string;
  readonly results: readonly ResultInSuiteAsWritten[];
  // A failure the suite records outside any of its results, such as a package that did not compile.
  readonly failure?: FailureAsWritten;
}

export interface ResultInSuiteAsWritten {
  readonly className?: string;
  readonly name: string;
  readonly file?: string;
  readonly clmProperties: readonly string[];
  readonly outcome: string;
  readonly failure?: FailureAsWritten;
}

export interface FailureAsWritten {
  readonly type?: string;
  readonly message?: string;
  readonly text?: string;
}

// A report of test results kept by example, each nested in its groups.
export interface ResultsByExampleAsWritten {
  readonly report: string;
  readonly examples: readonly ExampleResultAsWritten[];
  readonly loadErrors: readonly { readonly file?: string; readonly message: string }[];
}

export interface ExampleResultAsWritten {
  readonly file: string;
  readonly groupDescriptions: readonly string[];
  readonly description: string;
  readonly status: string;
  readonly message?: string;
}

// A report of scenario runs: one entry per scenario or Outline row that ran.
export interface ScenarioResultAsWritten {
  readonly file: string;
  readonly line: number;
  readonly title: string;
  readonly tags: readonly string[];
  readonly steps: readonly { readonly keyword: string; readonly text: string; readonly status: string; readonly message?: string }[];
}

// A step of a CI workflow, continue-on-error as the YAML gave it. plumbing and writesStepRecord are the reader's to say.
export interface WorkflowStepAsWritten {
  readonly workflow: string;
  readonly job: string;
  readonly jobContinueOnError?: unknown;
  readonly name?: string;
  readonly uses?: string;
  readonly run?: string;
  readonly id?: string;
  readonly continueOnError?: unknown;
  readonly plumbing: boolean;
  readonly writesStepRecord: boolean;
}

// An entry of the step record, keyed by the step's id.
export interface StepRecordEntryAsWritten {
  readonly key: string;
  readonly outcome: string;
  readonly conclusion: string;
}

// The shell reader's two answers, handed to the domain so it decides which question serves which step.
export interface ShellAnswers {
  readonly invokesAnywhere: (commandLine: string, program: string, scripts: Readonly<Record<string, string>>) => boolean;
  readonly invokesAsCommand: (commandLine: string, program: string, scripts: Readonly<Record<string, string>>) => boolean;
}

export function evidenceObservationsOf(results: readonly ResultsByFileAsWritten[]): EvidenceObservation[] {
  return results.flatMap(({ file, results: inFile }) =>
    inFile
      .filter(({ status }) => status === "passed")
      .map(({ title }) => ({ cites: claimCodeCitationsIn(title), result: "passed" as const, kind: "unit" as const, place: file, name: title, notes: [] })),
  );
}

export function observationsFiledUnder(_claim: ExecutableClaim, _observations: readonly EvidenceObservation[]): EvidenceObservation[] {
  return [];
}
