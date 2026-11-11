import { claimCodeCitationsIn, claimCodeFrom, type ClaimCode } from "../domain/claimCodes.js";
import type { EvidenceObservation } from "../domain/postEvidenceObservation.js";
import { nearestCitation, neverRanObservation, resultOfRun, TEST_REPORT_KIND, type RunResult } from "../domain/postEvidenceObservation.js";

export interface JunitXmlReport {
  readonly testsuites?: {
    readonly testsuite?: ReadonlyArray<JunitTestsuite>;
  };
}

interface JunitTestsuite {
  readonly name?: string;
  readonly testcase?: ReadonlyArray<JunitTestcase>;
}

interface JunitTestcase {
  readonly classname?: string;
  readonly name?: string;
  readonly properties?: {
    readonly property?: ReadonlyArray<{ readonly name?: string; readonly value?: string }>;
  };
  readonly failure?: string | { readonly message?: string; readonly "#text"?: string };
  readonly error?: { readonly message?: string; readonly "#text"?: string };
  readonly skipped?: unknown;
}

const CLAIM_CODE_PROPERTY = "clm";
// Go writes a package whose tests never ran, because it failed to build or its TestMain failed, as a failing TestMain with no classname.
const GO_PACKAGE_TESTCASE = "TestMain";

const isCollectionFailure = (testcase: JunitTestcase): boolean => testcase.error !== undefined && !testcase.classname;

const isClassSetupFailure = (testcase: JunitTestcase): boolean => testcase.error !== undefined && !testcase.name;

function failureTextOf(testcase: JunitTestcase): string | undefined {
  const failure = testcase.failure;
  return typeof failure === "object" ? failure["#text"] : failure;
}

const errorTextOf = (testcase: JunitTestcase): string | undefined => testcase.error?.["#text"] ?? testcase.error?.message;

const isPackageFailure = (testcase: JunitTestcase): boolean =>
  !testcase.classname && testcase.name === GO_PACKAGE_TESTCASE && testcase.failure !== undefined;

function runResultOf(testcase: JunitTestcase, errorResult: RunResult): RunResult {
  if (testcase.error !== undefined) return errorResult;
  return testcase.failure === undefined ? "passed" : "failed";
}

function nameCitationsOf(name: string): ClaimCode[] {
  const segmentsLeafFirst = name.split("/").reverse();
  return segmentsLeafFirst.map(claimCodeCitationsIn).find((codes) => codes.length > 0) ?? [];
}

function propertyCitationsOf(testcase: JunitTestcase): ClaimCode[] {
  return (testcase.properties?.property ?? [])
    .filter((property) => property.name === CLAIM_CODE_PROPERTY)
    .flatMap((property) => claimCodeFrom(property.value ?? "") ?? []);
}

function citesOf(testcase: JunitTestcase): readonly ClaimCode[] {
  return nearestCitation([
    [...propertyCitationsOf(testcase), ...nameCitationsOf(testcase.name ?? "")],
    claimCodeCitationsIn(testcase.classname ?? "").slice(-1),
  ]);
}

function observationOf(suite: JunitTestsuite, testcase: JunitTestcase, errorResult: RunResult): EvidenceObservation | undefined {
  if (testcase.skipped !== undefined) return undefined;
  if (isCollectionFailure(testcase)) return neverRanObservation(TEST_REPORT_KIND, testcase.name ?? "", errorTextOf(testcase));
  if (isPackageFailure(testcase)) return neverRanObservation(TEST_REPORT_KIND, suite.name ?? "", failureTextOf(testcase));
  if (isClassSetupFailure(testcase)) return neverRanObservation(TEST_REPORT_KIND, testcase.classname ?? "", errorTextOf(testcase));
  const result = resultOfRun(runResultOf(testcase, errorResult))!;
  const message = result === "never-ran" ? errorTextOf(testcase) : undefined;
  return {
    cites: citesOf(testcase),
    result,
    kind: TEST_REPORT_KIND,
    place: testcase.classname ?? "",
    notes: [],
    ...(testcase.name === undefined ? {} : { name: testcase.name }),
    ...(message === undefined ? {} : { message }),
  };
}

function observationsOf(report: JunitXmlReport, errorResult: RunResult): EvidenceObservation[] {
  return (report.testsuites?.testsuite ?? []).flatMap((suite) =>
    (suite.testcase ?? []).flatMap((testcase) => observationOf(suite, testcase, errorResult) ?? []),
  );
}

export function parseJunitEvidenceObservations(report: JunitXmlReport): EvidenceObservation[] {
  return observationsOf(report, "failed");
}

export function parsePytestEvidenceObservations(report: JunitXmlReport): EvidenceObservation[] {
  return observationsOf(report, "never-reached-its-assertions");
}
