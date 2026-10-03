import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";

const ci = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Unit tests
        run: pnpm test
      - name: Lint
        run: pnpm lint
`;

const feature = `Feature: fixture

  @unit @SCN-FIX-001
  Scenario: a fixture behaviour
    Given a fixture
`;

const scripts = { test: "vitest run", lint: "eslint ." };

function reconcile(runners: Record<string, string | null>): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [feature],
    untaggedScenarios: [],
    packageJson: {
      scripts,
      specController: {
        runners,
        notChecks: ["ci.yml:quality:Checkout", "ci.yml:quality:Install"],
      },
    },
    ciSources: [ci],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
}

function suspenseChecks(reconciliation: EvidenceReconciliation) {
  return reconciliation.ledger.scenarioReconciliations
    .filter((row) => row.kind === "suspense-scenario")
    .flatMap((row) =>
      row.qualityCheckReconciliations.map((item) => [item.staticCheck, item.outcome])
    );
}

describe("[SCN-USG-019] a runners key that is not one of the four tiers is reported, never silently honoured", () => {
  it("names the key outside the four tiers, and keeps the check it names on the books as uncited", () => {
    const reconciliation = reconcile({ unit: "vitest", lint: "eslint" });
    expect(reconciliation.summary.unrecognisedRunnerKeys).toStrictEqual(["lint"]);
    expect(suspenseChecks(reconciliation)).toStrictEqual([["lint", "cites-no-scenario"]]);
  });

  it("names no unrecognised runner key for a target whose every runners key is a tier", () => {
    const reconciliation = reconcile({ unit: "vitest" });
    expect(reconciliation.summary).not.toHaveProperty("unrecognisedRunnerKeys");
  });
});
