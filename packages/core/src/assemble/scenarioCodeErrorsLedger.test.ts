import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import type { EvidenceObservation } from "../model.js";

type Corpus = Record<string, { code: string | null; ids: string[] }>;

function reconcileCorpus(corpus: Corpus): EvidenceReconciliation {
  const entries = Object.entries(corpus);
  const sources = entries.map(([slug, { code, ids }]) => {
    const header = code === null ? "" : `@${code}\n`;
    const scenarios = ids.map((id) => `  @unit @${id}\n  Scenario: ${id}\n    Given a thing\n`).join("\n");
    return `${header}Feature: ${slug}\n\n${scenarios}`;
  });
  const credits: EvidenceObservation[] = entries
    .flatMap(([, { ids }]) => ids)
    .map((scnId) => ({ qualityCheck: "unit", scnId, status: "passed" }));
  return evidenceReconciliationFromSources({
    featureSources: sources,
    featureFiles: entries.map(([slug, { code }]) => ({ slug, featureCode: code })),
    untaggedScenarios: [],
    packageJson: {},
    ciSources: [],
    runtimeObservations: credits,
    deferralTags: [],
  });
}

function byCode(reconciliation: EvidenceReconciliation) {
  return [...reconciliation.ledger.scenarioReconciliations].sort((a, b) =>
    String(a.scnId).localeCompare(String(b.scnId))
  );
}

const PAIRS: { fault: string; misfiled: Corpus; twin: Corpus }[] = [
  {
    fault: "foreign-scn-code",
    misfiled: { one: { code: "ONE", ids: ["SCN-ONE-001"] }, two: { code: "TWO", ids: ["SCN-TWO-001", "SCN-ONE-002"] } },
    twin: { one: { code: "ONE", ids: ["SCN-ONE-001", "SCN-ONE-002"] }, two: { code: "TWO", ids: ["SCN-TWO-001"] } },
  },
  {
    fault: "no-feature-code",
    misfiled: { one: { code: "ONE", ids: ["SCN-ONE-001"] }, unc: { code: null, ids: ["SCN-UNC-001"] } },
    twin: { one: { code: "ONE", ids: ["SCN-ONE-001"] }, unc: { code: "UNC", ids: ["SCN-UNC-001"] } },
  },
  {
    fault: "duplicate-feature-code",
    misfiled: { one: { code: "ONE", ids: ["SCN-ONE-001"] }, "one-b": { code: "ONE", ids: ["SCN-ONE-002"] } },
    twin: { one: { code: "ONE", ids: ["SCN-ONE-001", "SCN-ONE-002"] } },
  },
];

describe("[SCN-STG-020] a misfiled account reconciles exactly as it would if correctly filed", () => {
  for (const { fault, misfiled, twin } of PAIRS) {
    it(`${fault}: the ledger and summary equal the correctly filed twin's; only the code errors differ`, () => {
      const wrong = reconcileCorpus(misfiled);
      const right = reconcileCorpus(twin);
      expect(wrong.scenarioCodeErrors?.map((e) => e.kind)).toEqual([fault]);
      expect(right.scenarioCodeErrors).toEqual([]);
      expect(byCode(wrong)).toEqual(byCode(right));
      expect(wrong.summary).toEqual(right.summary);
    });
  }
});
