import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "./renderInput.js";
import { rowsOf } from "./checkStep.testkit.js";

const manifest = {
  scripts: {
    "lint:alpha": "eslint",
    "lint:beta": "scn-subissues",
    typecheck: "tsc --noEmit",
    build: "tsup",
  },
  specController: {
    staticChecks: ["typecheck"],
    notChecks: [
      "ci.yml:quality:Checkout",
      "ci.yml:quality:Set up Node",
      "ci.yml:quality:Install",
      "ci.yml:quality:Build",
    ],
  },
};

const unannotatedCi = `name: fixture CI
jobs:
  quality:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
      - name: Complexity
        run: pnpm lint:alpha
      - name: Traceability
        run: pnpm lint:beta
      - name: Types
        run: pnpm typecheck
`;

function reconcileUnannotated(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    featureSources: [],
    untaggedScenarios: [],
    packageJson: manifest,
    ciSources: [unannotatedCi],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
  });
}

describe("[SCN-LNT-029] an unannotated pipeline is reported as every check it runs, citing nothing", () => {
  it("puts every check on the one suspense row and reports the steps that are not checks nowhere", () => {
    expect(rowsOf(reconcileUnannotated())).toEqual([
      [
        "(no scenario)",
        "suspense-scenario",
        "out-of-balance",
        [
          ["lint:alpha", "cites-no-scenario"],
          ["lint:beta", "cites-no-scenario"],
          ["typecheck", "cites-no-scenario"],
        ],
      ],
    ]);
  });

  it("carries the handle that ran and no citation at all, so nothing was manufactured for it", () => {
    expect(reconcileUnannotated().ledger.scenarioReconciliations[0]?.evidenceObservations).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: "lint:alpha",
        exists: true,
        enforcedOverRealSource: true,
      },
      {
        qualityCheck: "fitness",
        staticCheck: "lint:beta",
        exists: true,
        enforcedOverRealSource: true,
      },
      {
        qualityCheck: "fitness",
        staticCheck: "typecheck",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });
});
