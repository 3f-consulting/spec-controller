import { copyFileSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";

import { temporaryDirectoryIn } from "./corpusFixtures.test-utils.js";
import { parseFeatureCorpus } from "@3f-consulting/spec-controller-core";
import { featureNamesOf, readCorpus } from "./ingestQualityChecks.js";
import { readEvidenceObligations, readFeatureCorpus, runReconcile } from "./corpusReading.test-utils.js";
import { readFeatureSources } from "./ingestScenarios.js";
import { resolveTargetRoot } from "../run-management/resolveRunInputs.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const WELL_FORMED = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;

const CORRUPT_TAG_LINE = `@BBB
Feature: beta

  @unit @SCN-BBB-001 x
  Scenario: beta works
    Given a thing
`;

const CORRUPT_SCENARIO_KEYWORD = `@CCC
Feature: gamma

  @unit @SCN-CCC-001
  Scenari0: gamma works
    Given a thing
`;

function corpusWithTwoUnreadableFiles(): {
  dir: string;
  good: string;
  firstBad: string;
  secondBad: string;
} {
  const dir = join(temporaryDirectoryIn(made, `scn-gpg-001-${process.pid}-`), "features");
  mkdirSync(dir, { recursive: true });

  const good = join(dir, "a-alpha.feature");
  const firstBad = join(dir, "b-beta.feature");
  const secondBad = join(dir, "c-gamma.feature");
  writeFileSync(good, WELL_FORMED);
  writeFileSync(firstBad, CORRUPT_TAG_LINE);
  writeFileSync(secondBad, CORRUPT_SCENARIO_KEYWORD);

  return { dir, good, firstBad, secondBad };
}

function parserWordsFor(source: string): string {
  const parse = parseFeatureCorpus([{ file: "any.feature", source }]);
  return parse.kind === "unparseable" ? parse.faults[0]!.message : "";
}

describe("[SCN-GPG-001] the shared feature-file discovery refuses a corpus the parser rejects", () => {
  it("returns no corpus, and names every file the parser rejects with the parser's own words, in path order", () => {
    const { dir, firstBad, secondBad } = corpusWithTwoUnreadableFiles();

    expect(readCorpus(dir)).toEqual({
      kind: "unparseable",
      faults: [
        { file: firstBad, message: parserWordsFor(CORRUPT_TAG_LINE) },
        { file: secondBad, message: parserWordsFor(CORRUPT_SCENARIO_KEYWORD) },
      ],
    });
  });
});

const NESTED = "tests/fixtures/nested-corpus";
const NESTED_FEATURES = `${NESTED}/features`;
const NESTED_FILES = ["area/deeper/deep.feature", "area/middle.feature", "top.feature"];

function featureNamed(code: string): string {
  return `@${code}\nFeature: ${code}\n\n  @unit @SCN-${code}-001\n  Scenario: ${code} works\n    Given a thing\n`;
}

function flatCopyOfNested(): string {
  const dir = join(temporaryDirectoryIn(made, `scn-cli-085-flat-${process.pid}-`), "features");
  mkdirSync(dir);
  for (const file of NESTED_FILES) copyFileSync(join(NESTED_FEATURES, file), join(dir, basename(file)));
  return dir;
}

function reconciled(features: string): ReturnType<typeof runReconcile> {
  return runReconcile({ features, vitest: join(NESTED, "vitest.json"), packageJson: join(NESTED, "package.json"), ci: NESTED }, resolveTargetRoot({ features }));
}

describe("[SCN-CLI-085] a feature file in a subdirectory of the corpus, at any depth, is read and judged as at the top level", () => {
  it("reads every feature file under the corpus, in the order of its path under the corpus", () => {
    expect(readFeatureSources(NESTED_FEATURES).map(({ path }) => path)).toEqual(
      NESTED_FILES.map((file) => join(NESTED_FEATURES, file)),
    );
  });

  it("reads each nested file's feature code, as it would at the top level", () => {
    expect(readFeatureCorpus(NESTED_FEATURES).map(({ featureCode }) => featureCode)).toEqual(["NTC", "NTB", "NTA"]);
  });

  it("reconciles the scenarios of every nested file exactly as it reconciles the same files laid flat", () => {
    const nested = reconciled(NESTED_FEATURES);
    const flat = reconciled(flatCopyOfNested());

    expect(nested.ledger.claimReconciliations.flatMap((row) => (row.kind === "scenario" ? [row.scnId] : [])).sort()).toEqual(
      ["SCN-NTA-001", "SCN-NTB-001", "SCN-NTC-001", "SCN-NTC-002"],
    );
    expect(nested.ledger).toEqual(flat.ledger);
    expect(nested.summary).toEqual(flat.summary);
    expect(nested.scenarioCodePopulation).toEqual(flat.scenarioCodePopulation);
  });

  it("does not enter a symlinked directory, and reads a symlinked feature file", () => {
    const root = temporaryDirectoryIn(made, `scn-cli-085-links-${process.pid}-`);
    const outside = join(root, "outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "elsewhere.feature"), featureNamed("ELS"));
    const corpus = join(root, "features");
    mkdirSync(join(corpus, "sub"), { recursive: true });
    writeFileSync(join(corpus, "sub", "inner.feature"), featureNamed("INN"));
    symlinkSync(outside, join(corpus, "linked-dir"), "dir");
    symlinkSync(join(outside, "elsewhere.feature"), join(corpus, "linked.feature"));

    expect(readFeatureSources(corpus).map(({ path }) => path)).toEqual([
      join(corpus, "linked.feature"),
      join(corpus, "sub", "inner.feature"),
    ]);
  });
});

const SAME_NAME = "tests/fixtures/same-name-corpus";
const SAME_NAME_FEATURES = `${SAME_NAME}/features`;

describe("[SCN-CLI-086] a feature file in a subdirectory is named by its path under the corpus, so two files of one name are told apart", () => {
  it("names each feature file by its path under the corpus, without its extension", () => {
    expect(readFeatureCorpus(SAME_NAME_FEATURES).map(({ slug }) => slug)).toEqual(["alpha/run", "beta/run"]);
  });

  it("maps each feature code to the path of its own file", () => {
    expect([...featureNamesOf(readFeatureCorpus(SAME_NAME_FEATURES))]).toEqual([
      ["SNA", "alpha/run"],
      ["SNB", "beta/run"],
    ]);
  });

  it("names each untagged scenario's feature file by its path under the corpus", () => {
    expect(readEvidenceObligations(SAME_NAME_FEATURES).untaggedScenarios).toEqual([
      { feature: "alpha/run.feature", scenario: "the run has no scenario code" },
      { feature: "beta/run.feature", scenario: "the run has no scenario code" },
    ]);
  });

  it("reconciles the two same-titled untagged scenarios as two rows, each naming its own file", () => {
    const { ledger } = runReconcile({
      features: SAME_NAME_FEATURES,
      vitest: `${SAME_NAME}/vitest.json`,
      packageJson: `${SAME_NAME}/package.json`,
      ci: SAME_NAME,
    }, resolveTargetRoot({ features: SAME_NAME_FEATURES }));

    expect(ledger.claimReconciliations.map(({ scnId }) => scnId)).toEqual([
      "SCN-SNA-001",
      "SCN-SNB-001",
      "alpha/run.feature : the run has no scenario code",
      "beta/run.feature : the run has no scenario code",
    ]);
  });
});
