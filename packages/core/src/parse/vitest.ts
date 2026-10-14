import type { BehaviouralQualityCheck, EvidenceObservation } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";
import { scnCitationsOf } from "../lib/scnCitation.js";
import { attributionOf } from "../domain/attribution.js";

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
    const locator = file.name && relativizeToRoot(file.name, root);
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
      const { scnId, severalCodes } = attributionOf(citingCodesOf(assertion));
      results.push({
        qualityCheck,
        scnId,
        status,
        locator,
        testName: assertion.fullName ?? assertion.title,
        ...(severalCodes ? { notes: [{ kind: "several-scn-codes" as const, codes: severalCodes }] } : {}),
      });
    }
  }
  return results;
}

function citingCodesOf(assertion: { readonly title?: string; readonly fullName?: string }): string[] {
  const leafCodes = scnCitationsOf(assertion.title ?? "");
  return leafCodes.length > 0 ? leafCodes : scnCitationsOf(assertion.fullName ?? "");
}
