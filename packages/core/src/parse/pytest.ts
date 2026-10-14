import type { BehaviouralQualityCheck, EvidenceObservation } from "../model.js";
import { SCN_CODE } from "./scenarios.js";
import { attributionOf } from "../domain/attribution.js";

export interface JunitXmlReport {
  readonly testsuites?: {
    readonly testsuite?: ReadonlyArray<{
      readonly testcase?: ReadonlyArray<JunitTestcase>;
    }>;
  };
}

interface JunitTestcase {
  readonly classname?: string;
  readonly name?: string;
  readonly properties?: {
    readonly property?: ReadonlyArray<{ readonly name?: string; readonly value?: string }>;
  };
  readonly failure?: unknown;
  readonly error?: { readonly message?: string; readonly "#text"?: string };
  readonly skipped?: unknown;
}

const SCN_PROPERTY = "scn";

export function parsePytestEvidenceObservations(
  report: JunitXmlReport,
  qualityCheck: BehaviouralQualityCheck
): EvidenceObservation[] {
  return (report.testsuites?.testsuite ?? []).flatMap((suite) =>
    (suite.testcase ?? [])
      .filter((testcase) => testcase.skipped === undefined)
      .map((testcase): EvidenceObservation => {
        if (isCollectionFailure(testcase)) return collectionFailureOf(testcase, qualityCheck);
        const { scnId: soleCode, severalCodes } = attributionOf(scnPropertyValues(testcase));
        const scnId = soleCode === null ? null : citedCode(soleCode);
        const locator = `${testcase.classname}::${testcase.name}`;
        if (testcase.error !== undefined) {
          return { qualityCheck, scnId, status: "failed", locator, broken: true, message: errorTextOf(testcase) };
        }
        return {
          qualityCheck,
          scnId,
          status: testcase.failure === undefined ? "passed" : "failed",
          locator,
          ...(severalCodes ? { notes: [{ kind: "several-scn-codes" as const, codes: severalCodes }] } : {}),
        };
      })
  );
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

function errorTextOf(testcase: JunitTestcase): string | undefined {
  return testcase.error?.["#text"] ?? testcase.error?.message;
}
