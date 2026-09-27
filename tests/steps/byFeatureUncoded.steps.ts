/**
 * Step definitions for the by-feature cut's scenarios carrying no @SCN code: a corpus is written to a
 * scratch directory, the built binary reconciles it there and saves its JSON, and the same binary
 * renders that JSON again. Running from the scratch directory keeps every default input off this tree.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

let corpus: string | undefined;
let written = "";
let rendered = "";

function writeCorpus(files: Record<string, string>): void {
  corpus = mkdtempSync(join(tmpdir(), "spec-controller-byfeature-uncoded-"));
  mkdirSync(join(corpus, "features"));
  for (const [name, source] of Object.entries(files)) writeFileSync(join(corpus, "features", name), source);
}

function balance(args: string[]): string {
  const result = spawnSync(NODE, [...SPEC_CONTROLLER_ARGV, "balance", ...args], { cwd: corpus, encoding: "utf8" });
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  assert.ok(result.stdout.includes("### Run verdict"), `expected a report (exit ${result.status}):\n${result.stderr}`);
  return result.stdout;
}

/** The by-feature table's data rows, each split into its cells. */
function byFeatureRows(md: string): string[][] {
  const at = md.indexOf("### Out-of-balance by feature");
  assert.ok(at >= 0, `expected an out-of-balance-by-feature cut; got:\n${md}`);
  const section = md.slice(at);
  const end = section.indexOf("\n#", 1);
  return (end > 0 ? section.slice(0, end) : section)
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Feature ") && !line.startsWith("| ---"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

Given("a feature file with no feature code whose three scenarios carry no @SCN code", function () {
  writeCorpus({
    "checkout.feature": [
      "Feature: checkout",
      "",
      "  Scenario: pay by card",
      "    Given a basket",
      "",
      "  Scenario: pay by voucher",
      "    Given a basket",
      "",
      "  Scenario: pay on account",
      "    Given a basket",
      "",
    ].join("\n"),
  });
});

Given(
  "a feature file headed by a feature code, holding one scenario carrying its code, one carrying no @SCN code and one tagged only with an over-long code",
  function () {
    writeCorpus({
      "one.feature": [
        "@ONE",
        "Feature: one",
        "",
        "  @unit @SCN-ONE-001",
        "  Scenario: a coded scenario",
        "    Given a thing",
        "",
        "  Scenario: an uncoded scenario",
        "    Given a thing",
        "",
        "  @SCN-TOOLONGCODE-001",
        "  Scenario: an over-long code",
        "    Given a thing",
        "",
      ].join("\n"),
    });
  },
);

When(
  "that corpus is reconciled and its report written, then rendered again from its saved reconciliation",
  function () {
    written = balance(["--features", "features", "--format", "md", "--format", "json:report.json"]);
    rendered = balance(["--render-from-json", "report.json"]);
  },
);

Then(
  "the by-feature cut holds one row, named by that file, counting all three as carrying no @SCN code",
  function () {
    assert.deepEqual(byFeatureRows(written), [["checkout.feature", "3", "3 with no `@SCN` code"]]);
  },
);

Then(
  "the by-feature cut holds one row, the headed feature's, counting all three and naming only the one carrying its code",
  function () {
    assert.deepEqual(byFeatureRows(written), [["one (ONE)", "3", "SCN-ONE-001 and 2 with no `@SCN` code"]]);
  },
);

Then("no cell of the by-feature cut locates a scenario by its file and name", function () {
  const locators = byFeatureRows(written)
    .flat()
    .filter((cell) => cell.includes(" : "));
  assert.deepEqual(locators, [], "a by-feature cell holds a file-and-name locator");
});

Then("the report rendered again from its saved reconciliation is the report first written", function () {
  assert.equal(rendered, written);
});

After(function () {
  if (corpus !== undefined) rmSync(corpus, { recursive: true, force: true });
  corpus = undefined;
});
