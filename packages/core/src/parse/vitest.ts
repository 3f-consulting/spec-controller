import type { RuntimeQualityCheck, EvidenceObservation } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";
import { parseScnCitation } from "../lib/scnCitation.js";

export interface VitestJsonReport {
  testResults?: Array<{
    name?: string;
    status?: string;
    message?: string;
    assertionResults?: Array<{
      fullName?: string;
      title?: string;
      status?: string;
    }>;
  }>;
}

export function parseVitestEvidenceObservations(
  report: VitestJsonReport,
  qualityCheck: RuntimeQualityCheck,
  root?: string
): EvidenceObservation[] {
  const results: EvidenceObservation[] = [];
  for (const file of report.testResults ?? []) {
    const locator = relativizeToRoot(file.name ?? "(unknown vitest file)", root);
    const assertions = file.assertionResults ?? [];
    if (file.status === "failed" && assertions.length === 0) {
      results.push({
        qualityCheck,
        scnId: null,
        status: "failed",
        locator,
        broken: true,
        message: file.message,
      });
      continue;
    }
    for (const assertion of assertions) {
      const status = assertion.status;
      if (status !== "passed" && status !== "failed") continue;
      const scnId =
        parseScnCitation(assertion.title ?? "") ?? parseScnCitation(assertion.fullName ?? "");
      results.push({
        qualityCheck,
        scnId,
        status,
        locator,
      });
    }
  }
  return results;
}
