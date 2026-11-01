import { describe, it, expect } from "vitest";
import { observationsOf } from "@3f-consulting/spec-controller-core/internal";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runReconcile } from "./corpusReading.test-utils.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

describe("[SCN-CLI-089] test and cucumber CI steps are not candidate fitness functions, because the manifest names their runners", () => {
  it("posts lint:foo and lint:bar alone as fitness functions when the manifest names the runners test and cucumber run", () => {
    const balance = runReconcile({
      features: "tests/fixtures/usg/features",
      ci: "tests/fixtures/usg/ci.yml",
      packageJson: "tests/fixtures/usg/package.json",
    }, resolveTargetRoot({ features: "tests/fixtures/usg/features" }));

    const postings = balance.ledger.claimReconciliations.flatMap((row) =>
      observationsOf(row)
        .filter((o) => o.qualityCheckKind === "fitness")
        .map((o) => [row.kind, o.fitnessFunction])
    );
    expect(postings).toEqual([
      ["scenario", "lint:foo"],
      ["unnamed-claim", "lint:bar"],
    ]);
  });
});

describe("[SCN-CLI-090] balance recognises the step that runs it as the reconciler, with nothing configured, named in its step accounting", () => {
  it("recognises the pipeline step running this command as the reconciler, with nothing configured, named in its step accounting", () => {
    const root = temporaryDirectory(`scn-usg-014-${process.pid}-`);
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
      "jobs:\n  ci:\n    steps:\n      - name: Reconciliation\n        run: pnpm lint:reconcile\n"
    );

    const balance = runReconcile({ features, packageJson, ci }, resolveTargetRoot({ features }));

    expect(balance.summary.stepAccounting?.steps.reconciler).toStrictEqual([
      { step: "ci.yml:ci:Reconciliation", role: "reconciles" },
    ]);
  });
});
