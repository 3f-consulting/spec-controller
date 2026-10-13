import type { BehaviouralQualityCheck, EvidenceObservation } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";
import { parseScnCitation } from "../lib/scnCitation.js";
import { CORE_MESSAGES, CoreMessage } from "../domain/messages.js";

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

export function parseVitestEvidenceObservations(
  report: VitestJsonReport,
  qualityCheck: BehaviouralQualityCheck,
  root?: string
): EvidenceObservation[] {
  const results: EvidenceObservation[] = [];
  for (const file of report.testResults ?? []) {
    const locator = relativizeToRoot(file.name ?? CORE_MESSAGES[CoreMessage.UnknownVitestFile], root);
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
        testName: assertion.fullName ?? assertion.title,
      });
    }
  }
  return results;
}
