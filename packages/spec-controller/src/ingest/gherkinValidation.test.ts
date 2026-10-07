import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";

import { APP_MESSAGES, AppMessage } from "../messages.js";
import { parseErrorsIn } from "./gherkinValidation.js";
import { discoverFeatures } from "./ingestScenarios.js";
import { corpusReadFault, featureCorpusParseErrors } from "./ingestQualityChecks.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function corpusOf(files: Record<string, string>): { features: string; paths: Record<string, string> } {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-016-${process.pid}-`));
  made.push(root);
  const features = join(root, "features");
  mkdirSync(features);
  const paths: Record<string, string> = {};
  for (const [name, source] of Object.entries(files)) {
    paths[name] = join(features, name);
    writeFileSync(paths[name], source);
  }
  return { features, paths };
}

function refusalOf(features: string): Error {
  try {
    discoverFeatures(features);
  } catch (err) {
    return err as Error;
  }
  throw new Error("the corpus was read, not refused");
}

const WELL_FORMED = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  @unit @SCN-AAA-002
  Scenario: beta works
    Given another thing
`;

describe("[SCN-CLI-016] the Gherkin validator refuses a feature file the parser cannot read", () => {
  it("reports NO errors for well-formed Gherkin, so a healthy corpus reconciles as before", () => {
    expect(parseErrorsIn("features/target.feature", WELL_FORMED)).toEqual([]);
  });

  it("reports a parse error for a CORRUPT TAG LINE — the one-character false-green (3F-1767)", () => {
    const source = WELL_FORMED.replace("@unit @SCN-AAA-002", "@unit @SCN-AAA-002 x");

    const errors = parseErrorsIn("features/target.feature", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("features/target.feature");
    expect(errors[0]!.message).toMatch(/tag|whitespace/i);
  });

  it("reports a parse error for a CORRUPT SCENARIO KEYWORD, which the old scan could not see at all", () => {
    const source = WELL_FORMED.replace("Scenario: beta works", "Scenari0: beta works");

    const errors = parseErrorsIn("features/target.feature", source);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toMatch(/expected|Scenari0/i);
  });

  it("reports a parse error for a wholly unparseable file", () => {
    const errors = parseErrorsIn("features/target.feature", "not gherkin at all {{{\n");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("features/target.feature");
    expect(errors[0]!.message).not.toBe("");
  });

  it("reports NO error for a VALID scenario carrying no @SCN tag — that is 3F-1774, not a parse fault", () => {
    const untagged = `@AAA
Feature: alpha

  @unit @SCN-AAA-001
  Scenario: alpha works
    Given a thing

  Scenario: beta works
    Given another thing
`;
    expect(parseErrorsIn("features/target.feature", untagged)).toEqual([]);
  });

  it("reads an unparseable corpus as a parse failure, never as an input it could not read", () => {
    const { features, paths } = corpusOf({
      "good.feature": WELL_FORMED,
      "target.feature": "not gherkin at all {{{\n",
    });

    expect(corpusReadFault(features)).toBeNull();
    expect(featureCorpusParseErrors(features).map((e) => e.file)).toEqual([paths["target.feature"]]);
  });

  it("lays out the refusal as its heading, then each unparseable file's path on its own line above that file's parse failure", () => {
    const corruptTag = WELL_FORMED.replace("@unit @SCN-AAA-002", "@unit @SCN-AAA-002 x");
    const corruptKeyword = WELL_FORMED.replace("Scenario: beta works", "Scenari0: beta works");
    const { features, paths } = corpusOf({
      "a.feature": corruptTag,
      "b.feature": WELL_FORMED,
      "c.feature": corruptKeyword,
    });
    const first = paths["a.feature"]!;
    const second = paths["c.feature"]!;

    expect(refusalOf(features).message).toBe(
      [
        APP_MESSAGES[AppMessage.FeatureCorpusUnparseable](),
        first,
        parseErrorsIn(first, corruptTag)[0]!.message,
        second,
        parseErrorsIn(second, corruptKeyword)[0]!.message,
      ].join("\n")
    );
  });
});
