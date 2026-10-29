import type { EvidenceObservation } from "../model.js";
import { relativizeToRoot } from "../lib/portablePath.js";
import { scnCitationsOf } from "../lib/scnCitation.js";
import { attributionOf } from "../domain/attribution.js";
import { evidenceOfRunResult, fallbackQualityCheckOf, type RunResult } from "../domain/journal.js";

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

export function parseVitestEvidenceObservations(report: VitestJsonReport, root?: string): EvidenceObservation[] {
  const qualityCheck = fallbackQualityCheckOf("test-results");
  const results: EvidenceObservation[] = [];
  for (const file of report.testResults ?? []) {
    const locator = file.name && relativizeToRoot(file.name, root);
    const assertions = file.assertionResults ?? [];
    if (file.status === "failed" && assertions.length === 0) {
      const evidence = evidenceOfRunResult("never-reached-its-assertions")!;
      results.push({
        qualityCheck,
        scnId: null,
        status: evidence.status,
        locator,
        broken: evidence.broken,
        message: file.message,
      });
      continue;
    }
    for (const assertion of assertions) {
      const evidence = evidenceOfRunResult(runResultOf(assertion.status));
      if (evidence === undefined) continue;
      const { scnId, severalCodes } = attributionOf(citingCodesOf(assertion));
      results.push({
        qualityCheck,
        scnId,
        status: evidence.status,
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

function runResultOf(status: string | undefined): RunResult {
  return status === "passed" || status === "failed" ? status : "inconclusive";
}
