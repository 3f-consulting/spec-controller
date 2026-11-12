import type { EvidenceObservation, TestFileAsWritten } from "../domain/postEvidenceObservation.js";
import { testFileObservationsOf } from "../domain/postEvidenceObservation.js";

export interface VitestJsonReport {
  readonly testResults: ReadonlyArray<{
    readonly name?: string;
    readonly status?: string;
    readonly message?: string;
    readonly assertionResults: ReadonlyArray<{
      readonly fullName?: string;
      readonly title?: string;
      readonly status?: string;
    }>;
  }>;
}

// Each test file as the report wrote it: its path, its status and message, and each test's titles and status.
function testFilesOf(report: VitestJsonReport): TestFileAsWritten[] {
  return report.testResults.map((file) => ({
    path: file.name,
    status: file.status,
    message: file.message,
    tests: file.assertionResults.map((test) => ({ title: test.title, fullTitle: test.fullName, status: test.status })),
  }));
}

export function parseVitestEvidenceObservations(report: VitestJsonReport, root: string): EvidenceObservation[] {
  return testFileObservationsOf(testFilesOf(report), root);
}
