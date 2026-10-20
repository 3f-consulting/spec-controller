import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";

import { runBalanceCaptured } from "../../test-support/runBalance.js";
import { APP_MESSAGES, AppMessage } from "../messages.js";
import { parseFeatureCorpus } from "@3f-consulting/spec-controller-core";
import { readCorpus } from "./ingestQualityChecks.js";

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

function parserMessageOf(source: string): string {
  const parse = parseFeatureCorpus([{ file: "a.feature", source }]);
  return parse.kind === "unparseable" ? parse.faults[0]!.message : "";
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
    const corruptTag = WELL_FORMED.replace("@unit @SCN-AAA-002", "@unit @SCN-AAA-002 x");
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
      APP_MESSAGES[AppMessage.CorpusFileUnparseable](
        APP_MESSAGES[AppMessage.FlaggedCorpus]("--features"),
        file,
        parserMessageOf(source),
      );
    const { stdout, stderr, exitCode } = runBalanceCaptured(["--features", features, "--ci", ci]);

    expect({ report: stdout, stderr, exitCode }).toEqual({
      report: "",
      stderr:
        [refusalFor(paths["a.feature"]!, corruptTag), refusalFor(paths["c.feature"]!, corruptKeyword)].join("\n") +
        "\n",
      exitCode: 2,
    });
  });
});
