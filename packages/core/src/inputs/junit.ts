import type { EvidenceObservation, TestCaseAsWritten } from "../domain/postEvidenceObservation.js";
import { testCaseObservationsOf } from "../domain/postEvidenceObservation.js";

export interface JunitXmlReport {
  readonly testsuites: {
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
  readonly failure?: { readonly message?: string; readonly "#text"?: string };
  readonly error?: { readonly message?: string; readonly "#text"?: string };
  readonly skipped?: unknown;
}

type ErrorsWritten = Pick<NonNullable<TestCaseAsWritten["error"]>, "inSetupOrTeardown">;

// Each test case as the report wrote it: its suite, class, name and properties, and its failure, error or skip.
function testCaseOf(suite: JunitTestsuite, testcase: JunitTestcase, errorsWritten: ErrorsWritten): TestCaseAsWritten {
  const { failure, error } = testcase;
  return {
    suite: suite.name,
    classname: testcase.classname,
    name: testcase.name,
    properties: testcase.properties?.property ?? [],
    ...(failure === undefined ? {} : { failure: { message: failure.message, text: failure["#text"] } }),
    ...(error === undefined ? {} : { error: { message: error.message, text: error["#text"], ...errorsWritten } }),
    skipped: testcase.skipped !== undefined,
  };
}

function testCasesOf(report: JunitXmlReport, errorsWritten: ErrorsWritten): TestCaseAsWritten[] {
  return (report.testsuites.testsuite ?? []).flatMap((suite) =>
    (suite.testcase ?? []).map((testcase) => testCaseOf(suite, testcase, errorsWritten)),
  );
}

// JUnit writes an <error> for an exception the test itself threw.
export function parseJunitEvidenceObservations(report: JunitXmlReport): EvidenceObservation[] {
  return testCaseObservationsOf(testCasesOf(report, {}));
}

// pytest writes an <error> for an error in a test's setup or teardown.
export function parsePytestEvidenceObservations(report: JunitXmlReport): EvidenceObservation[] {
  return testCaseObservationsOf(testCasesOf(report, { inSetupOrTeardown: true }));
}
