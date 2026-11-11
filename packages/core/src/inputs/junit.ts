import type { EvidenceObservation, TestCaseAsWritten } from "../domain/postEvidenceObservation.js";
import { testCaseObservationsOf } from "../domain/postEvidenceObservation.js";

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

function failureOf(failure: NonNullable<JunitTestcase["failure"]>): TestCaseAsWritten["failure"] {
  return typeof failure === "object" ? { message: failure.message, text: failure["#text"] } : { text: failure };
}

// Each test case as the report wrote it: its suite, class, name and properties, and its failure, error or skip.
function testCaseOf(suite: JunitTestsuite, testcase: JunitTestcase): TestCaseAsWritten {
  const { failure, error } = testcase;
  return {
    suite: suite.name,
    classname: testcase.classname,
    name: testcase.name,
    properties: testcase.properties?.property ?? [],
    ...(failure === undefined ? {} : { failure: failureOf(failure) }),
    ...(error === undefined ? {} : { error: { message: error.message, text: error["#text"] } }),
    skipped: testcase.skipped !== undefined,
  };
}

function testCasesOf(report: JunitXmlReport): TestCaseAsWritten[] {
  return (report.testsuites?.testsuite ?? []).flatMap((suite) => (suite.testcase ?? []).map((testcase) => testCaseOf(suite, testcase)));
}

// JUnit writes an <error> for an exception the test threw: it failed.
export function parseJunitEvidenceObservations(report: JunitXmlReport): EvidenceObservation[] {
  return testCaseObservationsOf(testCasesOf(report), "failed");
}

// pytest writes an <error> for an error in a test's setup or teardown: it never reached its assertions.
export function parsePytestEvidenceObservations(report: JunitXmlReport): EvidenceObservation[] {
  return testCaseObservationsOf(testCasesOf(report), "never-ran");
}
