import type { BehaviouralQualityCheck, EvidenceObservation } from "../model.js";
import { SCN_CODE } from "./scenarios.js";
import { attributionOf } from "../domain/attribution.js";
import { scnCitationsOf } from "../lib/scnCitation.js";

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

const SCN_PROPERTY = "scn";
const GO_BUILD_FAILURE_TESTCASE = "TestMain";
const GO_BUILD_FAILURE_MARK = "[build failed]";

type ErrorReading = "failing" | "broken";

export function parseJunitEvidenceObservations(
  report: JunitXmlReport,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation[] {
  return observationsOf(report, qualityCheck, "failing");
}

export function parsePytestEvidenceObservations(
  report: JunitXmlReport,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation[] {
  return observationsOf(report, qualityCheck, "broken");
}

function observationsOf(
  report: JunitXmlReport,
  qualityCheck: BehaviouralQualityCheck,
  errorReading: ErrorReading
): EvidenceObservation[] {
  return (report.testsuites?.testsuite ?? []).flatMap((suite) =>
    (suite.testcase ?? [])
      .filter((testcase) => testcase.skipped === undefined)
      .map((testcase): EvidenceObservation => {
        if (isCollectionFailure(testcase)) return collectionFailureOf(testcase, qualityCheck);
        if (isBuildFailure(testcase)) return buildFailureOf(suite, testcase, qualityCheck);
        if (isClassSetupFailure(testcase)) return classSetupFailureOf(testcase, qualityCheck);
        const { scnId: soleCode, severalCodes } = attributionOf(citingCodesOf(testcase));
        const scnId = soleCode === null ? null : citedCode(soleCode);
        const locator = `${testcase.classname}::${testcase.name}`;
        if (testcase.error !== undefined && errorReading === "broken") {
          return { qualityCheck, scnId, status: "failed", locator, broken: true, message: errorTextOf(testcase) };
        }
        return {
          qualityCheck,
          scnId,
          status: testcase.failure === undefined && testcase.error === undefined ? "passed" : "failed",
          locator,
          ...(severalCodes ? { notes: [{ kind: "several-scn-codes" as const, codes: severalCodes }] } : {}),
        };
      })
  );
}

function citingCodesOf(testcase: JunitTestcase): string[] {
  const ownCodes = [...scnPropertyValues(testcase), ...nameCitationsOf(testcase.name ?? "")];
  return ownCodes.length > 0 ? ownCodes : scnCitationsOf(testcase.classname ?? "").slice(-1);
}

function nameCitationsOf(name: string): string[] {
  const segmentsLeafFirst = name.split("/").reverse();
  return segmentsLeafFirst.map((segment) => scnCitationsOf(segment)).find((codes) => codes.length > 0) ?? [];
}

function scnPropertyValues(testcase: JunitTestcase): string[] {
  return (testcase.properties?.property ?? [])
    .filter((property) => property.name === SCN_PROPERTY)
    .map((property) => property.value ?? "");
}

function citedCode(value: string): string | null {
  return SCN_CODE.test(value) ? value : null;
}

function isCollectionFailure(testcase: JunitTestcase): boolean {
  return testcase.error !== undefined && !testcase.classname;
}

function collectionFailureOf(testcase: JunitTestcase, qualityCheck: BehaviouralQualityCheck): EvidenceObservation {
  return {
    qualityCheck,
    scnId: null,
    status: "failed",
    locator: testcase.name ?? "",
    broken: true,
    message: errorTextOf(testcase),
  };
}

function isClassSetupFailure(testcase: JunitTestcase): boolean {
  return testcase.error !== undefined && !testcase.name;
}

function classSetupFailureOf(testcase: JunitTestcase, qualityCheck: BehaviouralQualityCheck): EvidenceObservation {
  return {
    qualityCheck,
    scnId: null,
    status: "failed",
    locator: testcase.classname,
    broken: true,
    message: errorTextOf(testcase),
  };
}

function isBuildFailure(testcase: JunitTestcase): boolean {
  return !testcase.classname
    && testcase.name === GO_BUILD_FAILURE_TESTCASE
    && failureTextOf(testcase)?.includes(GO_BUILD_FAILURE_MARK) === true;
}

function buildFailureOf(
  suite: JunitTestsuite,
  testcase: JunitTestcase,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation {
  return {
    qualityCheck,
    scnId: null,
    status: "failed",
    locator: suite.name,
    broken: true,
    message: failureTextOf(testcase),
  };
}

function failureTextOf(testcase: JunitTestcase): string | undefined {
  const failure = testcase.failure;
  return typeof failure === "object" ? failure["#text"] : failure;
}

function errorTextOf(testcase: JunitTestcase): string | undefined {
  return testcase.error?.["#text"] ?? testcase.error?.message;
}
