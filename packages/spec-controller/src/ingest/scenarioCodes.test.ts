import { afterAll, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CORPUS_DIR, EMPTY_CORPUS, targetMaker } from "./corpusFixtures.testkit.js";
import { readFeatureNames, runReconcile } from "./ingestQualityChecks.js";
import { extractFeatureCode } from "./ingestScenarios.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const targetFor = targetMaker(made);

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

describe("[SCN-STG-023] a corpus with no feature file is judged, never skipped", () => {
  it("reads an empty feature directory as a corpus of no file and no code, with no scenario code error", () => {
    const root = targetFor(EMPTY_CORPUS);
    const balance = runReconcile({
      features: join(root, CORPUS_DIR),
      packageJson: join(root, "package.json"),
      ci: root,
    });

    expect(balance.scenarioCodeErrors).toEqual([]);
    expect(balance.scenarioCodePopulation).toEqual({ featureFiles: 0, featureCodes: 0 });
  });
});

describe("[SCN-STG-024] a feature file headed by a code of two or five characters carries that code", () => {
  it("reads the two- and five-character header codes, and not the one- or six-character ones", () => {
    const headed = (code: string) => `@${code}\nFeature: ${code.toLowerCase()}\n\n  @unit @SCN-${code}-001\n  Scenario: s\n    Given a step\n`;
    expect(["A", "AB", "FIVEC", "SIXCHR"].map((code) => extractFeatureCode(headed(code)))).toEqual([null, "AB", "FIVEC", null]);
  });
});
