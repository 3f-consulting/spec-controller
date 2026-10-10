import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";

import { discover, temporaryDirectoryIn } from "./corpusFixtures.testkit.js";

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
});
