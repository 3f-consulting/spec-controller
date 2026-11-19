import type { TestResult } from "../domain/postEvidenceObservation.js";
import { resultsByExampleFrom, whereResultsByExampleBreak } from "./rspec.js";
import { resultsBySuiteFrom, whereSuitesBreak } from "./junit.js";
import { resultsByFileFrom, whereResultsByFileBreak } from "./vitest.js";
import { scenarioResultsFrom, whereScenarioResultsBreak } from "./cucumber.js";

// A report is parsed as JSON, or as XML where its format says so, checked for where it breaks its tool's shape, then read.
interface ReadAs<Report> {
  readonly whereItBreaks: (report: Report) => string | undefined;
  readonly resultsFrom: (report: Report) => readonly TestResult[];
}

interface FormatShape {
  // The format's name, as a runner's long form names it.
  readonly kind: string;
  // The endings of the files it reads in a folder, for a format whose report can be one.
  readonly folderEndings?: readonly string[];
  // Its results are posted with the feature files, where an Outline row's claim code is.
  readonly needsFeatures?: true;
}

type Format = FormatShape & ((ReadAs<unknown> & { readonly parsedAs?: never }) | (ReadAs<string> & { readonly parsedAs: "xml" }));

// Evidence report formats: each report format balance reads, in the order its inputs are listed.
export const EVIDENCE_REPORT_FORMATS = [
  { kind: "vitest", whereItBreaks: whereResultsByFileBreak, resultsFrom: resultsByFileFrom },
  { kind: "jest", whereItBreaks: whereResultsByFileBreak, resultsFrom: resultsByFileFrom },
  { kind: "pytest", parsedAs: "xml", whereItBreaks: whereSuitesBreak, resultsFrom: (xml: string) => resultsBySuiteFrom(xml, "pytest") },
  {
    kind: "junit",
    parsedAs: "xml",
    whereItBreaks: whereSuitesBreak,
    resultsFrom: (xml: string) => resultsBySuiteFrom(xml, "junit"),
    folderEndings: [".xml"],
  },
  { kind: "rspec", whereItBreaks: whereResultsByExampleBreak, resultsFrom: resultsByExampleFrom },
  { kind: "cucumber", whereItBreaks: whereScenarioResultsBreak, resultsFrom: scenarioResultsFrom, needsFeatures: true },
] as const satisfies readonly Format[];

export type EvidenceReportKind = (typeof EVIDENCE_REPORT_FORMATS)[number]["kind"];

export type EvidenceReportFormat = Format & { readonly kind: EvidenceReportKind };
