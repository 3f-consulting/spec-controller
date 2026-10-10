import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";

import { discover, temporaryDirectoryIn } from "./corpusFixtures.testkit.js";
import { parseErrorsIn } from "./gherkinValidation.js";
import { discoverFeatures } from "./ingestScenarios.js";

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

describe("[SCN-GPG-001] the shared feature-file discovery refuses a corpus the parser rejects", () => {
  it("refuses the corpus instead of returning it", () => {
    const { dir } = corpusWithTwoUnreadableFiles();

    const { thrown } = discover(dir);

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).name).toBe("UnreadableFeatureCorpusError");
  });

  it("names BOTH unreadable files, not only the first", () => {
    const { dir, firstBad, secondBad } = corpusWithTwoUnreadableFiles();

    const { thrown } = discover(dir);

    const errors = (thrown as { errors?: readonly { file: string }[] }).errors ?? [];
    expect(errors.map((e) => e.file)).toEqual([firstBad, secondBad]);
  });

  it("carries each file's parse failure in the parser's own words", () => {
    const { dir, firstBad, secondBad } = corpusWithTwoUnreadableFiles();

    const { thrown } = discover(dir);

    const expected = [
      parseErrorsIn(firstBad, CORRUPT_TAG_LINE)[0]!.message,
      parseErrorsIn(secondBad, CORRUPT_SCENARIO_KEYWORD)[0]!.message,
    ];
    const errors = (thrown as { errors?: readonly { message: string }[] }).errors ?? [];
    expect(errors.map((e) => e.message)).toEqual(expected);

    for (const [i, file] of [firstBad, secondBad].entries()) {
      expect((thrown as Error).message).toContain(file);
      expect((thrown as Error).message).toContain(expected[i]!);
    }
  });

  it("hands back nothing, so the well-formed file cannot be read past the refusal", () => {
    const { dir, good } = corpusWithTwoUnreadableFiles();

    const { returned } = discover(dir);

    expect(returned).toBeUndefined();
    expect(JSON.stringify(returned ?? null)).not.toContain(good);
  });

  it("returns the corpus as before when every file parses, only its .feature files, in name order", () => {
    const dir = join(temporaryDirectoryIn(made, `scn-gpg-001-ok-${process.pid}-`), "features");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "c-gamma.feature"), WELL_FORMED.replace("@AAA", "@CCC"));
    writeFileSync(join(dir, "b-beta.feature"), WELL_FORMED.replace("@AAA", "@BBB"));
    writeFileSync(join(dir, "a-alpha.feature"), WELL_FORMED);
    writeFileSync(join(dir, "README.md"), "These notes are not Gherkin.\n");

    const discovered = discoverFeatures(dir);

    expect(discovered.map((f) => f.slug)).toEqual(["a-alpha", "b-beta", "c-gamma"]);
    expect(discovered.map((f) => f.featureCode)).toEqual(["AAA", "BBB", "CCC"]);
  });
});
