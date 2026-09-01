/**
 * Step definitions for features/gherkin-parse-gate.feature — the @integration arm of
 * @SCN-GPG-002 (3F-2972).
 *
 * Anti-watermelon: each When SPAWNS the real check as its own process, over a planted corpus,
 * and reads the status it actually leaves. The @unit arm beside it calls the same two run
 * functions in-process; what it cannot reach is the process boundary — and the process boundary
 * is the exact reading this slice exists to fix, a single check run on its own by a contributor
 * who changed a feature file.
 *
 * THE COMMAND IS DERIVED, NOT RE-TYPED. Each check is spawned from the package.json script the
 * Examples table names, so this arm cannot drift from what CI runs — the discipline `pnpm ladder`
 * already applies to the ladder itself. A step that re-typed `tsx …/lintFeatureCodesCli.ts` would
 * keep passing after the script moved.
 *
 * THE CORPUS IS STEERED BY THE WORKING DIRECTORY, which is how both checks default it — so
 * neither needs a flag it does not have, and the planted corpus is reached exactly as a real
 * contributor's would be.
 *
 * @SCN-GPG-002 — bidirectional evidence marker for features/gherkin-parse-gate.feature.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseErrorsIn } from "../../packages/spec-controller/src/ingest/gherkinValidation.js";

// @SCN-GPG-002
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * A well-formed file BOTH checks would red over: `ZZZ` is in no registry (feature-codes), and
 * its @SCN scenario names no evidence tier and is not parked (scn-tags). It is what makes
 * "reports no verdict" a withholding rather than a silence.
 */
const READABLE = `@ZZZ
Feature: a readable file each check would have something to say about

  @SCN-ZZZ-001
  Scenario: it names an unregistered feature code and no evidence tier
    Given a thing
`;

/** A tag line carrying whitespace inside the tag — cucumber's own parser rejects the file. */
const UNREADABLE = `@ZZZ
Feature: beta

  @unit @SCN-ZZZ-002 x
  Scenario: beta works
    Given another thing
`;

/** What a spawned check left behind: its status, and everything it said on either stream. */
interface Outcome {
  exitCode: number;
  output: string;
}

let unreadableFile = "";
let riggedRoot = "";
let outcome: Outcome;

/**
 * Write a throwaway corpus and return its root. `a-readable.feature` sorts first, so a check
 * that scanned what it could read before it hit trouble would scan the file bearing the finding.
 */
function writeCorpus(files: readonly (readonly [string, string])[]): string {
  const root = mkdtempSync(path.join(tmpdir(), `scn-gpg-002-${process.pid}-`));
  mkdirSync(path.join(root, "features"), { recursive: true });
  for (const [name, source] of files) {
    writeFileSync(path.join(root, "features", name), source);
  }
  return root;
}

/**
 * The command `pnpm <check>` runs, read from the root package.json rather than restated here.
 * Every check in the Examples table is a `tsx <script>` invocation; anything else is a change
 * this arm must be told about rather than silently paper over.
 */
function commandFor(check: string): readonly [string, string] {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
    scripts: Record<string, string | undefined>;
  };
  const script = pkg.scripts[check];
  assert.ok(script, `package.json names no script "${check}" — the Examples table has drifted`);
  const [runner, entry] = script.split(/\s+/);
  assert.equal(runner, "tsx", `expected "${check}" to be a tsx invocation; got "${script}"`);
  assert.ok(entry, `"${check}" names no entry point: "${script}"`);
  return [path.join(repoRoot, "node_modules", ".bin", "tsx"), path.join(repoRoot, entry)];
}

/** Spawn the real check as its own process, with `corpusRoot` as its working directory. */
function spawnCheckOver(check: string, corpusRoot: string): Outcome {
  const [tsx, entry] = commandFor(check);
  const result = spawnSync(tsx, [entry], { cwd: corpusRoot, encoding: "utf8" });
  assert.equal(result.error, undefined, `${check} failed to spawn: ${result.error?.message}`);
  return {
    exitCode: typeof result.status === "number" ? result.status : 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/** The check the current example names, kept so the control run drives the same one. */
let checkUnderTest = "";

// @SCN-GPG-002
Given("a feature corpus holding one file the Gherkin parser rejects beside one it accepts", function () {
  riggedRoot = writeCorpus([
    ["a-readable.feature", READABLE],
    ["b-unreadable.feature", UNREADABLE],
  ]);
  unreadableFile = path.join(riggedRoot, "features", "b-unreadable.feature");
});

// @SCN-GPG-002
When("{word} is asked to check that corpus", function (check: string) {
  checkUnderTest = check;
  outcome = spawnCheckOver(check, riggedRoot);
});

// @SCN-GPG-002
Then("the check refuses the corpus instead of reporting on it", function () {
  assert.equal(
    outcome.exitCode,
    2,
    `expected ${checkUnderTest} to refuse the unreadable corpus with the status this repository ` +
      `reserves for an input it cannot read, but it exited ${outcome.exitCode}. Output:\n${outcome.output}`,
  );
});

// @SCN-GPG-002
Then("it names the unreadable file and carries the parser's own words", function () {
  assert.ok(
    outcome.output.includes(unreadableFile),
    `expected ${checkUnderTest} to NAME ${unreadableFile}; got:\n${outcome.output}`,
  );
  // Measured against the parser itself, never a string typed in here, so a paraphrase at the
  // edge cannot pass this — name-the-fault-never-the-cure.
  const parserWords = parseErrorsIn(unreadableFile, UNREADABLE)[0]!.message;
  assert.ok(
    outcome.output.includes(parserWords),
    `expected the parser's own words verbatim:\n${parserWords}\ngot:\n${outcome.output}`,
  );
});

// @SCN-GPG-002
Then("it says so as a sentence, not as a stack trace", function () {
  assert.ok(
    !/^\s+at\s/m.test(outcome.output),
    `expected a sentence, but ${checkUnderTest} printed stack frames:\n${outcome.output}`,
  );
  assert.ok(
    outcome.output.includes("The feature corpus contains a file that could not be parsed as Gherkin:"),
    `expected the refusal's sentence to open the output; got:\n${outcome.output}`,
  );
});

/** A verdict of either kind: the clean bill, or the finding list. Neither may survive a refusal. */
const VERDICT = /lint: (OK|FAILED)/;

// @SCN-GPG-002
Then(
  "it reports no verdict about the corpus it could not read, neither a clean bill nor the finding the readable file would have earned",
  function () {
    assert.ok(
      !VERDICT.test(outcome.output),
      `expected ${checkUnderTest} to report NO verdict over a corpus it could not read; got:\n${outcome.output}`,
    );
    // The vacuity floor: the readable file really would have earned a finding, so the silence
    // above is a withholding rather than a check with nothing to say.
    const control = spawnCheckOver(checkUnderTest, writeCorpus([["a-readable.feature", READABLE]]));
    assert.match(
      control.output,
      /lint: FAILED/,
      `the planted corpus must earn ${checkUnderTest} a finding when it CAN read it, or this ` +
        `scenario proves nothing; got:\n${control.output}`,
    );
  },
);

// @SCN-GPG-002
Then(
  "the refusal is told apart from a finding, so a caller can tell an unreadable corpus from a failing one",
  function () {
    const control = spawnCheckOver(checkUnderTest, writeCorpus([["a-readable.feature", READABLE]]));
    assert.equal(
      control.exitCode,
      1,
      `expected ${checkUnderTest} to answer a corpus it CAN read with its finding-bearing ` +
        `verdict; got ${control.exitCode}. Output:\n${control.output}`,
    );
    assert.notEqual(
      outcome.exitCode,
      control.exitCode,
      `a refusal that shares its status with a verdict is unreadable to a caller: ` +
        `${checkUnderTest} exited ${outcome.exitCode} over both.`,
    );
  },
);
