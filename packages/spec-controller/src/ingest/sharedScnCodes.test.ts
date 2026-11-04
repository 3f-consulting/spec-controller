import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readEvidenceObligations } from "./corpusReading.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { scenarioName } from "../../../../tests/steps/support/scenarioName.js";

function corpus(files: Record<string, string>): string {
  const dir = join(temporaryDirectory("scn-stg-017-"), "features");
  mkdirSync(dir);
  for (const [name, source] of Object.entries(files)) writeFileSync(join(dir, name), source);
  return dir;
}

describe("[SCN-CLI-099] readEvidenceObligations names the scenarios sharing each code", () => {
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
          scenarioName("one.feature", "the scenario in one"),
          scenarioName("two.feature", "the scenario in two"),
        ],
      },
    ]);
  });
});
