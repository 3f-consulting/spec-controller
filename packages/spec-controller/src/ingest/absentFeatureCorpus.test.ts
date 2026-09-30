import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  featureCorpusParseErrors,
  readEvidenceObligations,
  readFeatureNames,
  runReconcile,
} from "./ingestQualityChecks.js";

function absentCorpus(): { features: string; packageJson: string; ci: string } {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-017-absent-${process.pid}-`));
  const packageJson = join(root, "package.json");
  writeFileSync(packageJson, JSON.stringify({ name: "new-client-target", scripts: {} }));
  const features = join(root, "features");
  expect(existsSync(features)).toBe(false);
  return { features, packageJson, ci: root };
}

function unreadableCorpus(): { features: string; packageJson: string; file: string } {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-017-unreadable-${process.pid}-`));
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

describe("[SCN-CLI-017] a corpus that is PRESENT and unreadable is still refused", () => {
  it("keeps reporting the parse failure rather than reading absence into it", () => {
    const { features, file } = unreadableCorpus();

    const errors = featureCorpusParseErrors(features);

    expect(errors.map((e) => e.file)).toEqual([file]);
  });
});
