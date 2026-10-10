import { afterAll, describe, it, expect } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { temporaryDirectoryIn } from "./corpusFixtures.testkit.js";
import { readEvidenceObligations } from "./ingestQualityChecks.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function corpus(files: Record<string, string>): string {
  const dir = join(temporaryDirectoryIn(made, "scn-stg-017-"), "features");
  mkdirSync(dir);
  for (const [name, source] of Object.entries(files)) writeFileSync(join(dir, name), source);
  return dir;
}

describe("[SCN-STG-017] readEvidenceObligations names the scenarios sharing each code", () => {
  it("lists a code carried in two files with the file and the name of each scenario", () => {
    const features = corpus({
      "one.feature": "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: the scenario in one\n    Given a thing\n",
      "two.feature":
        "@TWO\nFeature: two\n\n  @unit @SCN-ONE-001\n  Scenario: the scenario in two\n    Given a thing\n\n" +
        "  @unit @SCN-TWO-001\n  Scenario: its own\n    Given a thing\n",
    });
    expect(readEvidenceObligations(features).sharedScnCodes).toEqual([
      {
        scnId: "SCN-ONE-001",
        scenarios: [
          { feature: "one.feature", scenario: "the scenario in one" },
          { feature: "two.feature", scenario: "the scenario in two" },
        ],
      },
    ]);
  });

  it("lists nothing when every code is carried once", () => {
    const features = corpus({
      "one.feature": "@ONE\nFeature: one\n\n  @unit @SCN-ONE-001\n  Scenario: only\n    Given a thing\n",
    });
    expect(readEvidenceObligations(features).sharedScnCodes ?? []).toEqual([]);
  });
});
