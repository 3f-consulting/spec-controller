import { claimCodeCitationsIn } from "../domain/claimCodes.js";
import type { EvidenceObservation } from "../domain/postEvidenceObservation.js";
import { nearestCitation, neverRanObservation, resultOfRun, TEST_REPORT_KIND, type RunResult } from "../domain/postEvidenceObservation.js";
import { relativizeToRoot } from "../lib/portablePath.js";

export interface VitestJsonReport {
  readonly testResults?: ReadonlyArray<{
    readonly name?: string;
    readonly status?: string;
    readonly message?: string;
    readonly assertionResults?: ReadonlyArray<{
      readonly fullName?: string;
      readonly title?: string;
      readonly status?: string;
    }>;
  }>;
}

function runResultOf(status: string | undefined): RunResult {
  return status === "passed" || status === "failed" ? status : "inconclusive";
}

export function parseVitestEvidenceObservations(report: VitestJsonReport, root?: string): EvidenceObservation[] {
  return (report.testResults ?? []).flatMap((file): EvidenceObservation[] => {
    const place = relativizeToRoot(file.name ?? "", root);
    const assertions = file.assertionResults ?? [];
    if (file.status === "failed" && assertions.length === 0) {
      return [neverRanObservation(TEST_REPORT_KIND, place, file.message)];
    }
    return assertions.flatMap((assertion): EvidenceObservation[] => {
      const result = resultOfRun(runResultOf(assertion.status));
      if (result === undefined) return [];
      const cites = nearestCitation([claimCodeCitationsIn(assertion.title ?? ""), claimCodeCitationsIn(assertion.fullName ?? "")]);
      const name = assertion.fullName ?? assertion.title;
      return [{ cites, result, kind: TEST_REPORT_KIND, place, notes: [], ...(name === undefined ? {} : { name }) }];
    });
  });
}
