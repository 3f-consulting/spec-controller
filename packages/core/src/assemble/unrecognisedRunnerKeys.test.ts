import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { unitTestsAndLintCi as ci, feature } from "../evidenceReconciliation.test-utils.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";
import { lineReadingsOf } from "../domain/qualityCheckReconciliation.test-utils.js";

const scripts = { test: "vitest run", lint: "eslint ." };

function reconcile(runners: Record<string, string | null>): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature]),
    packageJson: {
      scripts,
      specController: {
        runners,
        notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install"],
      },
    },
    ciWorkflows: parsedWorkflows([ci], ["ci.yml"]),
    behaviouralObservations: [],
    deferralTags: [],
  });
}

function unnamedClaimChecks(reconciliation: EvidenceReconciliation) {
  return reconciliation.ledger.claimReconciliations
    .filter((row) => row.kind === "unnamed-claim")
    .flatMap((row) =>
      lineReadingsOf(row.qualityCheckReconciliations)
    );
}

describe("[SCN-CFG-003] a runners key that is not one of the four tiers is reported, never silently honoured", () => {
  it("names the key outside the four layers, and keeps the check it names on the books as uncited", () => {
    const reconciliation = reconcile({ unit: "vitest", lint: "eslint" });
    expect(reconciliation.summary.runnerKeysNotALayer).toStrictEqual(["lint"]);
    expect(unnamedClaimChecks(reconciliation)).toStrictEqual([[["lint"], "cites-no-scenario"]]);
  });

  it("names no unrecognised runner key for a target whose every runners key is a layer", () => {
    const reconciliation = reconcile({ unit: "vitest" });
    expect(reconciliation.summary).not.toHaveProperty("runnerKeysNotALayer");
  });
});
