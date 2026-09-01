/**
 * @unit for the shared feature-file discovery's corpus refusal (@SCN-GPG-001).
 *
 * Bidirectional evidence: the describe carries the @SCN-GPG-001 id matching
 * features/gherkin-parse-gate.feature. The scenario is @unit ALONE — the observation is a
 * function call over files on disk, and Vitest proves that whole path, temp directory included.
 *
 * Parent: 3F-2817 (the three feature-file lints read Gherkin by line).
 */

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import { parseErrorsIn } from "./gherkinValidation.js";
import { discoverFeatures } from "./ingestScenarios.js";

/** Well-formed Gherkin — the readable half of the corpus, the half a partial return would leak. */
const WELL_FORMED = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing
`;

/** `@unit @SCN-BBB-001 x` is not a tag line — "A tag may not contain whitespace" (3F-2792's shape). */
const CORRUPT_TAG_LINE = `@BBB
Feature: beta

  @unit @SCN-BBB-001 x
  Scenario: beta works
    Given a thing
`;

/** `Scenari0:` is not a scenario header, so the file has no grammar the parser can follow. */
const CORRUPT_SCENARIO_KEYWORD = `@CCC
Feature: gamma

  @unit @SCN-CCC-001
  Scenari0: gamma works
    Given a thing
`;

/**
 * A corpus on disk: one well-formed file and TWO the parser rejects. Two, not one, is the
 * point — a discovery that refused at the first bad file would silently narrow the message the
 * balance CLI already prints for every unreadable file (@SCN-CLI-016).
 */
function corpusWithTwoUnreadableFiles(): {
  dir: string;
  good: string;
  firstBad: string;
  secondBad: string;
} {
  const dir = join(mkdtempSync(join(tmpdir(), `scn-gpg-001-${process.pid}-`)), "features");
  mkdirSync(dir, { recursive: true });

  // Named so readdirSync().sort() puts the good file FIRST: a discovery that returned what it
  // could read before it hit trouble would return exactly this one, which is what the last
  // assertion below refuses.
  const good = join(dir, "a-alpha.feature");
  const firstBad = join(dir, "b-beta.feature");
  const secondBad = join(dir, "c-gamma.feature");
  writeFileSync(good, WELL_FORMED);
  writeFileSync(firstBad, CORRUPT_TAG_LINE);
  writeFileSync(secondBad, CORRUPT_SCENARIO_KEYWORD);

  return { dir, good, firstBad, secondBad };
}

/** Run the discovery, keeping BOTH outcomes — what it returned and what it threw. */
function discover(dir: string): { returned: unknown; thrown: unknown } {
  let returned: unknown;
  let thrown: unknown;
  try {
    returned = discoverFeatures(dir);
  } catch (err) {
    thrown = err;
  }
  return { returned, thrown };
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

    // Verbatim, measured against the parser itself rather than against a string typed here:
    // the refusal must not paraphrase what broke (name-the-fault-never-the-cure).
    const expected = [
      parseErrorsIn(firstBad, CORRUPT_TAG_LINE)[0]!.message,
      parseErrorsIn(secondBad, CORRUPT_SCENARIO_KEYWORD)[0]!.message,
    ];
    const errors = (thrown as { errors?: readonly { message: string }[] }).errors ?? [];
    expect(errors.map((e) => e.message)).toEqual(expected);

    // And the refusal READS as those words: one file, then the parser's message, per file.
    for (const [i, file] of [firstBad, secondBad].entries()) {
      expect((thrown as Error).message).toContain(file);
      expect((thrown as Error).message).toContain(expected[i]!);
    }
  });

  it("hands back nothing, so the well-formed file cannot be read past the refusal", () => {
    const { dir, good } = corpusWithTwoUnreadableFiles();

    const { returned } = discover(dir);

    // No partial corpus: a caller cannot scan the readable half of a rejected tree.
    expect(returned).toBeUndefined();
    expect(JSON.stringify(returned ?? null)).not.toContain(good);
  });

  it("returns the corpus as before when every file parses", () => {
    const dir = join(mkdtempSync(join(tmpdir(), `scn-gpg-001-ok-${process.pid}-`)), "features");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "a-alpha.feature"), WELL_FORMED);

    const discovered = discoverFeatures(dir);

    expect(discovered.map((f) => f.slug)).toEqual(["a-alpha"]);
    expect(discovered[0]!.featureCode).toBe("AAA");
    expect(discovered[0]!.scenarioCodes).toEqual(["SCN-AAA-001"]);
  });
});
