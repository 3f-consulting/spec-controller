import type { TestResult } from "../domain/postEvidenceObservation.js";
import { resultsByExampleFrom, whereResultsByExampleBreak } from "./rspec.js";
import { resultsBySuiteFrom, whereSuitesBreak } from "./junit.js";
import { resultsByFileFrom, whereResultsByFileBreak } from "./vitest.js";
import { scenarioResultsFrom, whereScenarioResultsBreak } from "./cucumber.js";

// How a report of one format is read: parsed as JSON, or as XML where it says so, then checked for where it breaks its
// tool's shape, then read into test results.
interface ReadAs<Report> {
  readonly whereItBreaks: (report: Report) => string | undefined;
  readonly resultsFrom: (report: Report) => readonly TestResult[];
}

interface FormatShape {
  // The format's name, which is also its flag's.
  readonly kind: string;
  // What its flag's value is, in the help.
  readonly flagValue: string;
  // The endings of the files it reads in a folder, for a format whose flag can name one.
  readonly folderEndings?: readonly string[];
  // Its results are posted with the feature files, where an Outline row's claim code is.
  readonly needsFeatures?: true;
}

type Format = FormatShape & ((ReadAs<unknown> & { readonly parsedAs?: never }) | (ReadAs<string> & { readonly parsedAs: "xml" }));

// Evidence report formats: each report format balance reads, in the order its flags and its inputs are listed.
export const EVIDENCE_REPORT_FORMATS = [
  { kind: "vitest", flagValue: "<report.json>", whereItBreaks: whereResultsByFileBreak, resultsFrom: resultsByFileFrom },
  { kind: "jest", flagValue: "<report.json>", whereItBreaks: whereResultsByFileBreak, resultsFrom: resultsByFileFrom },
  { kind: "pytest", flagValue: "<report.xml>", parsedAs: "xml", whereItBreaks: whereSuitesBreak, resultsFrom: (xml: string) => resultsBySuiteFrom(xml, "pytest") },
  {
    kind: "junit",
    flagValue: "<report.xml|dir>",
    parsedAs: "xml",
    whereItBreaks: whereSuitesBreak,
    resultsFrom: (xml: string) => resultsBySuiteFrom(xml, "junit"),
    folderEndings: [".xml"],
  },
  { kind: "rspec", flagValue: "<report.json>", whereItBreaks: whereResultsByExampleBreak, resultsFrom: resultsByExampleFrom },
  { kind: "cucumber", flagValue: "<report.json>", whereItBreaks: whereScenarioResultsBreak, resultsFrom: scenarioResultsFrom, needsFeatures: true },
] as const satisfies readonly Format[];

// The name of each evidence report format.
export type EvidenceReportKind = (typeof EVIDENCE_REPORT_FORMATS)[number]["kind"];

// One of the evidence report formats.
export type EvidenceReportFormat = Format & { readonly kind: EvidenceReportKind };
