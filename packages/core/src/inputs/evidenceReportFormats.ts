import type { QualityCheckKind } from "../domain/postEvidenceObligation.js";
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
  // The format's name, which is also its flag's.
  readonly kind: string;
  readonly flagValue: string;
  // The endings of the files it reads in a folder, for a format whose flag can name one.
  readonly folderEndings?: readonly string[];
  // Its results are posted with the feature files, where an Outline row's claim code is.
  readonly needsFeatures?: true;
  // The layer its results are evidence of where no runner entry names the report.
  readonly defaultLayer: QualityCheckKind;
}

type Format = FormatShape & ((ReadAs<unknown> & { readonly parsedAs?: never }) | (ReadAs<string> & { readonly parsedAs: "xml" }));

// Evidence report formats: each report format balance reads, in the order its flags and its inputs are listed.
export const EVIDENCE_REPORT_FORMATS = [
  { kind: "vitest", flagValue: "<report.json>", whereItBreaks: whereResultsByFileBreak, resultsFrom: resultsByFileFrom, defaultLayer: "unit" },
  { kind: "jest", flagValue: "<report.json>", whereItBreaks: whereResultsByFileBreak, resultsFrom: resultsByFileFrom, defaultLayer: "unit" },
  { kind: "pytest", flagValue: "<report.xml>", parsedAs: "xml", whereItBreaks: whereSuitesBreak, resultsFrom: (xml: string) => resultsBySuiteFrom(xml, "pytest"), defaultLayer: "unit" },
  {
    kind: "junit",
    flagValue: "<report.xml|dir>",
    parsedAs: "xml",
    whereItBreaks: whereSuitesBreak,
    resultsFrom: (xml: string) => resultsBySuiteFrom(xml, "junit"),
    folderEndings: [".xml"],
    defaultLayer: "unit",
  },
  { kind: "rspec", flagValue: "<report.json>", whereItBreaks: whereResultsByExampleBreak, resultsFrom: resultsByExampleFrom, defaultLayer: "unit" },
  { kind: "cucumber", flagValue: "<report.json>", whereItBreaks: whereScenarioResultsBreak, resultsFrom: scenarioResultsFrom, needsFeatures: true, defaultLayer: "integration" },
] as const satisfies readonly Format[];

export type EvidenceReportKind = (typeof EVIDENCE_REPORT_FORMATS)[number]["kind"];

export type EvidenceReportFormat = Format & { readonly kind: EvidenceReportKind };
