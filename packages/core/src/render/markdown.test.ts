import { describe, expect, it } from "vitest";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { EvidenceObservation } from "../domain/postEvidenceObservation.js";
import { coreText } from "./coreText.js";
import { renderMarkdown } from "./markdown.js";

const ONE_001 = { featureCode: "ONE", number: "001" };

function observation(said: Partial<EvidenceObservation> = {}): EvidenceObservation {
  return { cites: [ONE_001], result: "failed", kind: "unit", place: "a.test.ts", name: "a test", message: "it broke", notes: [], ...said };
}

function everySection(failing: EvidenceObservation = observation()): EvidenceReconciliation {
  return {
    provenance: {
      target: "acme/widgets",
      sourceSha: "abc123",
      toolSha: "def456",
      toolVersion: "0.2.0",
      inputs: [{ name: "features", path: "features" }, { name: "workflows" }],
    },
    errorsInTheInputs: {
      claimCodeErrors: [{ kind: "no-feature-code", files: ["three.feature"] }],
      configurationErrors: [{ kind: "configuration-unknown-key", entry: "runnerz" }],
    },
    runIntegrity: { neverRan: [observation({ result: "never-ran", name: "a file that never loaded" })] },
    runVerdict: { verdict: "out-of-balance" },
    totals: {
      claimReconciliations: { total: 1, balanced: 0, outOfBalance: 1 },
      qualityCheckReconciliations: { total: 1, outOfBalance: 1, byOutcome: [{ outcome: "failing", count: 1 }], missingByKind: [{ kind: "unit", count: 0 }] },
      evidenceObservations: { total: 1, byKind: [{ kind: "unit", count: 1 }], onExecutableClaim: 1, onPhantomClaim: 0, onUnnamedClaim: 0, fitnessFunctionsRan: 0 },
      outOfBalanceByFeature: [{ file: "one.feature", count: 1 }],
      excludedClaimCodeOccurrences: 0,
    },
    stepAccount: {
      jobs: [{ workflow: "ci.yml", job: "ci", stepsRead: 3, runners: 1, reconcilerSteps: 1, nonChecks: 1, plumbing: 0, candidates: 0 }],
      total: { stepsRead: 3, runners: 1, reconcilerSteps: 1, nonChecks: 1, plumbing: 0, candidates: 0, accountedFor: 3 },
    },
    claimReconciliations: [
      {
        claim: { claimCode: ONE_001, file: "one.feature", title: "a claim", obligations: [{ kind: "unit" }] },
        qualityCheckReconciliations: [{ outcome: "failing", kind: "unit", obligation: { kind: "unit" }, observation: failing }],
        verdict: "out-of-balance",
      },
    ],
  };
}

function headingsAt(level: number, markdown: string): string[] {
  const marker = `${"#".repeat(level)} `;
  return markdown.split("\n").flatMap((line) => (line.startsWith(marker) ? [line.slice(marker.length)] : []));
}

describe("the Markdown report's sections will come in a fixed order", () => {
  it("[CLM-RPT-009] the Markdown report's sections will come in a fixed order", () => {
    expect(headingsAt(2, renderMarkdown(everySection()))).toEqual([
      coreText("provenance-heading"),
      coreText("errors-in-the-inputs-heading"),
      coreText("run-integrity-heading"),
      coreText("summary-heading"),
      coreText("claim-reconciliations-heading"),
    ]);
  });
});
