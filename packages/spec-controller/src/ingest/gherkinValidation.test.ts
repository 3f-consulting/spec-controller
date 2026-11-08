import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import { captured, expectRefused } from "../cli-balance/balanceRun.test-utils.js";
import { AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";
import { parseFeatureCorpus } from "@3f-consulting/spec-controller-core";
import { readCorpus } from "./ingestQualityChecks.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

function corpusOf(files: Record<string, string>): { features: string; paths: Record<string, string> } {
  const root = temporaryDirectory(`clm-cli-016-${process.pid}-`);
  const features = join(root, "features");
  mkdirSync(features);
  const paths: Record<string, string> = {};
  for (const [name, source] of Object.entries(files)) {
    paths[name] = join(features, name);
    writeFileSync(paths[name], source);
  }
  return { features, paths };
}

function parserMessageOf(source: string): string {
  const parse = parseFeatureCorpus([{ file: "a.feature", source }]);
  return parse.kind === "unparseable" ? parse.faults[0]!.message : "";
}

const WELL_FORMED = `@AAA
Feature: alpha

  @unit @CLM-AAA-001
  Scenario: alpha works
    Given a thing

  @unit @CLM-AAA-002
  Scenario: beta works
    Given another thing
`;

describe("[CLM-CLI-016] the Gherkin validator refuses a feature file the parser cannot read", () => {

  it("reads an unparseable corpus as a parse failure, never as an input it could not read", () => {
    const { features, paths } = corpusOf({
      "good.feature": WELL_FORMED,
      "target.feature": "not gherkin at all {{{\n",
    });

    const reading = readCorpus(features);

    expect(reading.kind).toBe("unparseable");
    expect(reading.kind === "unparseable" ? reading.faults.map(({ file }) => file) : []).toEqual([paths["target.feature"]]);
  });

  it("runBalance refuses a corpus holding two unparseable files at exit 2, naming each file in name order above its parse failure, reconciling nothing", () => {
    const corruptTag = WELL_FORMED.replace("@unit @CLM-AAA-002", "@unit @CLM-AAA-002 x");
    const corruptKeyword = WELL_FORMED.replace("Scenario: beta works", "Scenari0: beta works");
    const { features, paths } = corpusOf({
      "a.feature": corruptTag,
      "b.feature": WELL_FORMED,
      "c.feature": corruptKeyword,
    });
    const ci = join(features, "..", "workflows");
    mkdirSync(ci);
    writeFileSync(join(ci, "ci.yml"), "jobs: {}\n");
    const refusalFor = (file: string, source: string): string =>
      message(AppError.CorpusFileUnparseable, { corpus: message(AppMessage.FlaggedCorpus, { flag: "--features" }), file, message: parserMessageOf(source) });
    expectRefused(
      captured(["--features", features, "--ci", ci]),
      refusalFor(paths["a.feature"]!, corruptTag),
      refusalFor(paths["c.feature"]!, corruptKeyword),
    );
  });
});
