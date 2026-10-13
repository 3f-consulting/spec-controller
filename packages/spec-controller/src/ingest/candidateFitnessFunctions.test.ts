import { afterAll, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runReconcile } from "./ingestQualityChecks.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-USG-003] test and cucumber CI steps are not candidate fitness functions, because the manifest names their runners", () => {
  it("posts lint:foo and lint:bar alone as fitness functions when the manifest names the runners test and cucumber run", () => {
    const balance = runReconcile({
      features: "tests/fixtures/usg/features",
      ci: "tests/fixtures/usg/ci.yml",
      packageJson: "tests/fixtures/usg/package.json",
    }, resolveTargetRoot({ features: "tests/fixtures/usg/features" }));

    const postings = balance.ledger.scenarioReconciliations.flatMap((row) =>
      row.evidenceObservations
        .filter((o) => o.qualityCheck === "fitness")
        .map((o) => [row.kind, o.fitnessFunction])
    );
    expect(postings).toEqual([
      ["scenario", "lint:foo"],
      ["suspense-scenario", "lint:bar"],
    ]);
  });
});

describe("[SCN-USG-014] the balance step and its step-record dump are not candidates, and no configuration says so", () => {
  it("recognises the pipeline step running this command as the reconciler, with nothing configured", () => {
    const root = mkdtempSync(join(tmpdir(), `scn-usg-014-${process.pid}-`));
    made.push(root);
    const features = join(root, "features");
    mkdirSync(features);
    writeFileSync(
      join(features, "target.feature"),
      "@TGT\nFeature: target\n\n  @unit @SCN-TGT-001\n  Scenario: a behaviour\n    Given a thing\n"
    );
    const packageJson = join(root, "package.json");
    writeFileSync(
      packageJson,
      JSON.stringify({ scripts: { "lint:reconcile": "spec-controller balance --features features" } })
    );
    const ci = join(root, "ci.yml");
    writeFileSync(
      ci,
      "jobs:\n  ci:\n    steps:\n      - name: Self-reconciliation balance\n        run: pnpm lint:reconcile\n"
    );

    const balance = runReconcile({ features, packageJson, ci }, resolveTargetRoot({ features }));

    expect(balance.summary.reconcilerSteps).toStrictEqual([
      { step: "ci.yml:ci:Self-reconciliation balance", role: "reconciles" },
    ]);
  });
});
