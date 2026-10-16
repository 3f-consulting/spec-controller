import type { BehaviouralQualityCheck, EvidenceObservation } from "../model.js";
import { SCN_CODE } from "./scenarios.js";
import { attributionOf } from "../domain/attribution.js";
import { scnCitationsOf } from "../lib/scnCitation.js";
import { evidenceOfRunResult, type RunEvidence, type RunResult } from "../domain/journal.js";

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

export function parseJunitEvidenceObservations(
  report: JunitXmlReport,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation[] {
  return observationsOf(report, qualityCheck, "failed");
}

export function parsePytestEvidenceObservations(
  report: JunitXmlReport,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation[] {
  return observationsOf(report, qualityCheck, "never-reached-its-assertions");
}

function observationsOf(
  report: JunitXmlReport,
  qualityCheck: BehaviouralQualityCheck,
  errorResult: RunResult
): EvidenceObservation[] {
  return (report.testsuites?.testsuite ?? []).flatMap((suite) =>
    (suite.testcase ?? []).flatMap((testcase): EvidenceObservation[] => {
      const evidence = evidenceOfRunResult(runResultOf(testcase, errorResult));
      return evidence === undefined ? [] : [observationOf(suite, testcase, evidence, qualityCheck)];
    })
  );
}

function runResultOf(testcase: JunitTestcase, errorResult: RunResult): RunResult {
  if (testcase.skipped !== undefined) return "inconclusive";
  if (isCollectionFailure(testcase) || isBuildFailure(testcase) || isClassSetupFailure(testcase)) {
    return "never-reached-its-assertions";
  }
  if (testcase.error !== undefined) return errorResult;
  return testcase.failure === undefined ? "passed" : "failed";
}

function observationOf(
  suite: JunitTestsuite,
  testcase: JunitTestcase,
  evidence: RunEvidence,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation {
  if (isCollectionFailure(testcase)) return collectionFailureOf(testcase, evidence, qualityCheck);
  if (isBuildFailure(testcase)) return buildFailureOf(suite, testcase, evidence, qualityCheck);
  if (isClassSetupFailure(testcase)) return classSetupFailureOf(testcase, evidence, qualityCheck);
  const { scnId: soleCode, severalCodes } = attributionOf(citingCodesOf(testcase));
  const scnId = soleCode === null ? null : citedCode(soleCode);
  const locator = `${testcase.classname}::${testcase.name}`;
  if (evidence.broken) {
    return { qualityCheck, scnId, status: evidence.status, locator, broken: evidence.broken, message: errorTextOf(testcase) };
  }
  return {
    qualityCheck,
    scnId,
    status: evidence.status,
    locator,
    ...(severalCodes ? { notes: [{ kind: "several-scn-codes" as const, codes: severalCodes }] } : {}),
  };
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

function collectionFailureOf(
  testcase: JunitTestcase,
  evidence: RunEvidence,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation {
  return {
    qualityCheck,
    scnId: null,
    status: evidence.status,
    locator: testcase.name ?? "",
    broken: evidence.broken,
    message: errorTextOf(testcase),
  };
}

function isClassSetupFailure(testcase: JunitTestcase): boolean {
  return testcase.error !== undefined && !testcase.name;
}

function classSetupFailureOf(
  testcase: JunitTestcase,
  evidence: RunEvidence,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation {
  return {
    qualityCheck,
    scnId: null,
    status: evidence.status,
    locator: testcase.classname,
    broken: evidence.broken,
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
  evidence: RunEvidence,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation {
  return {
    qualityCheck,
    scnId: null,
    status: evidence.status,
    locator: suite.name,
    broken: evidence.broken,
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
