import { evidenceReconciliationFromSources } from "../assemble/evidenceReconciliationFromSources.js";
import type { EvidenceReconciliation } from "../assemble/renderInput.js";
import { parsedFeatures } from "../parse/parsedFeatures.test-utils.js";
import { parsedWorkflows } from "../parse/parsedWorkflows.test-utils.js";

const feature = `Feature: every row kind

  @unit @SCN-ROW-001
  Scenario: a balanced scenario

  @unit @SCN-ROW-002
  Scenario: a missing scenario

  @unit @SCN-ROW-003
  Scenario: a failing scenario

  @SCN-ROW-004
  Scenario: a both-missing scenario

  @unit @SCN-ROW-005
  Scenario: a code sharer with an obligation

  @unitpending @SCN-ROW-005
  Scenario: a code sharer with only a pending tag

  @wip @SCN-ROW-005
  Scenario: a code sharer with only a deferral tag

  @SCN-ROW-005
  Scenario: a code sharer with no tag

  @unit @integrationpending @SCN-ROW-006
  Scenario: a Pending Item beside an obligation

  @unitpending @SCN-ROW-007
  Scenario: a Pending Item alone

  @unitpending @SCN-ROW-008
  Scenario: a Pending Item a passing test observes

  @integration @SCN-ROW-009
  Scenario: a scenario observed only through broken evidence

  @unit @SCN-ROW-010
  Scenario: broken evidence beside an observation that ran

  @fitness @SCN-ROW-011
  Scenario: a fitness obligation observed at a step

  @fitness @SCN-ROW-012
  Scenario: a fitness obligation with no observation

  @fitness @SCN-ROW-013
  Scenario: a fitness observation that names no step

  @performance @SCN-ROW-014
  Scenario: a layer no CI step runs

  Scenario: a scenario with no code and no tag

  @unit
  Scenario: a scenario with no code and an evidence tag
`;

const workflow = `name: fixture CI
jobs:
  ci:
    steps:
      - name: Unit tests
        run: pnpm test
      - name: Cucumber
        run: pnpm cucumber
      - name: Property
        id: SCN-ROW-011
        run: pnpm property
      - name: Lint
        run: pnpm lint
`;

/** One ledger holding every kind of row the report can show, read through the assembled path so its rows carry CI steps. */
export function everyRowKind(): EvidenceReconciliation {
  return evidenceReconciliationFromSources({
    features: parsedFeatures([feature], ["rows.feature"]),
    packageJson: {
      scripts: { test: "vitest run", cucumber: "cucumber-js", property: "node property.js", lint: "eslint ." },
      specController: { runners: { unit: "vitest", integration: "cucumber-js" } },
    },
    ciWorkflows: parsedWorkflows([workflow], ["ci.yml"]),
    behaviouralObservations: [
      { qualityCheckKind: "unit", scnId: "SCN-ROW-001", status: "passed" },
      { qualityCheckKind: "unit", scnId: "SCN-ROW-003", status: "failed" },
      { qualityCheckKind: "unit", scnId: "SCN-ROW-006", status: "passed" },
      { qualityCheckKind: "unit", scnId: "SCN-ROW-008", status: "passed" },
      { qualityCheckKind: "integration", scnId: "SCN-ROW-009", status: "failed", broken: true },
      { qualityCheckKind: "unit", scnId: "SCN-ROW-010", status: "passed" },
      { qualityCheckKind: "unit", scnId: "SCN-ROW-010", status: "failed", broken: true },
      { qualityCheckKind: "integration", scnId: "SCN-ROW-010", status: "failed", broken: true },
      { qualityCheckKind: "performance", scnId: "SCN-ROW-014", status: "passed" },
      { qualityCheckKind: "unit", scnId: "SCN-ROW-090", status: "passed" },
      { qualityCheckKind: "integration", scnId: "SCN-ROW-091", status: "failed" },
      { qualityCheckKind: "unit", scnId: null, status: "passed" },
      { qualityCheckKind: "unit", scnId: "SCN-ROW-005", status: "passed" },
      {
        qualityCheckKind: "integration",
        scnId: null,
        status: "passed",
        notes: [{ kind: "several-scn-codes", codes: ["SCN-ROW-001", "SCN-ROW-002"] }],
      },
      { qualityCheckKind: "e2e", scnId: null, status: "failed", broken: true },
    ],
    deferralTags: ["wip"],
    ciStepRecord: {
      "SCN-ROW-011": { outcome: "success", conclusion: "success" },
      "SCN-ROW-013": { outcome: "success", conclusion: "success" },
    },
  });
}
