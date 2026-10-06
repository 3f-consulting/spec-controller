import { afterAll, describe, it, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  featureCorpusParseErrors,
  readEvidenceObligations,
  readFeatureNames,
  runReconcile,
} from "./ingestQualityChecks.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function absentCorpus(): { features: string; packageJson: string; ci: string } {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-017-absent-${process.pid}-`));
  made.push(root);
  const packageJson = join(root, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "new-client-target", scripts: {} }));
  const features = join(root, "features");
  expect(existsSync(features)).toBe(false);
  return { features, packageJson, ci: root };
}

function unreadableCorpus(): { features: string; packageJson: string; file: string } {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-017-unreadable-${process.pid}-`));
  made.push(root);
  const packageJson = join(root, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "new-client-target", scripts: {} }));
  const features = join(root, "features");
  mkdirSync(features, { recursive: true });
  const file = join(features, "target.feature");
  writeFileSync(file, "not gherkin at all {{{\n");
  return { features, packageJson, file };
}

describe("[SCN-CLI-017] balance reads an absent corpus as no corpus, at every reader", () => {
  it("reports no parse errors — there is nothing to parse", () => {
    const { features } = absentCorpus();

    expect(featureCorpusParseErrors(features)).toEqual([]);
  });

  it("reads no feature-code map", () => {
    const { features } = absentCorpus();

    expect([...readFeatureNames(features)]).toEqual([]);
  });

  it("raises no evidence obligation, and finds no untagged scenario", () => {
    const { features } = absentCorpus();

    const obligations = readEvidenceObligations(features);

    expect(obligations.scenarioCount).toBe(0);
    expect(obligations.rawScnOccurrences).toBe(0);
    expect(obligations.untaggedScenarios).toEqual([]);
  });

  it("reconciles the target instead of throwing, and the ledger has no accounts", () => {
    const { features, packageJson, ci } = absentCorpus();

    const balance = runReconcile({ features, packageJson, ci });

    expect(balance.ledger.scenarioReconciliations).toEqual([]);
  });
});

describe("[SCN-STG-022] a feature part no file's header carries has no file behind its by-feature row", () => {
  it("maps no file to THR when the only scenario coded for it sits in a file headed @TWO", () => {
    const root = mkdtempSync(join(tmpdir(), `scn-stg-022-${process.pid}-`));
    made.push(root);
    const features = join(root, "features");
    mkdirSync(features);
    writeFileSync(
      join(features, "one.feature"),
      "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: first\n    Given a thing\n"
    );
    writeFileSync(
      join(features, "two.feature"),
      "@TWO\nFeature: two\n\n  @unit @SCN-TWO-001\n  Scenario: first\n    Given a thing\n\n" +
        "  @unit @SCN-THR-002\n  Scenario: foreign\n    Given a thing\n"
    );

    expect(Object.fromEntries(readFeatureNames(features))).toEqual({ ONE: "one", TWO: "two" });
  });
});

describe("[SCN-CLI-017] a corpus that is PRESENT and unreadable is still refused", () => {
  it("keeps reporting the parse failure rather than reading absence into it", () => {
    const { features, file } = unreadableCorpus();

    const errors = featureCorpusParseErrors(features);

    expect(errors.map((e) => e.file)).toEqual([file]);
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

    const balance = runReconcile({ features, packageJson, ci });

    expect(balance.summary.reconcilerSteps).toStrictEqual([
      { step: "ci.yml:ci:Self-reconciliation balance", role: "reconciles" },
    ]);
  });
});
