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
 * THE COMMAND IS DERIVED, NOT RE-TYPED. The Examples cell names a package.json script and, after
 * it, the subcommand to hand that script; the script's own text is read from package.json rather
 * than restated here. So this arm cannot drift from what CI runs — the discipline `pnpm ladder`
 * already applies to the ladder itself. A step that re-typed `tsx …/cli.ts tags` would keep passing
 * after the script moved.
 *
 * THE CORPUS IS STEERED BY THE WORKING DIRECTORY, which is how `tags` defaults both its inputs —
 * so it needs neither `--features` nor `--package-json` here, and the planted corpus is reached
 * exactly as a real contributor's would be.
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
 * A well-formed file `spec-controller tags` reds over: its @SCN scenario carries `@untit`, a tag
 * that is neither an evidence tier, a recognised deferral tag nor a word naming a check, so the
 * grammar rule earns it a finding. It is what makes "reports no verdict" a withholding rather
 * than a silence.
 *
 * THE FINDING USED TO BE A MISSING TIER, and it stopped being one when 3F-3309 deleted the tier
 * floor. A fixture rigged to be answerable is only rigged while the check still has something to
 * say about it: measured after the floor left, this file's original form ran `lint: OK`, exit 0,
 * which would have greened the refusal arm above by silence instead of by withholding. 3F-3309
 * put `@untit` here for that reason, and 3F-3310 re-measured it against the shipped command the
 * Examples table now names — `tags: FAILED`, exit 1, on the grammar rule.
 *
 * THE UNREGISTERED HEADER CODE IS NO LONGER A SECOND FINDING. `ZZZ` is in no registry because
 * there is no registry left: `tags` polices what the corpus itself says — one header code per
 * file, and a scenario id naming its own file — and a hand-kept allocation table was the "second
 * list to drift" this slice retired. So the grammar rule is the whole of what answers here.
 */
const READABLE = `@ZZZ
Feature: a readable file the check would have something to say about

  @untit @SCN-ZZZ-001
  Scenario: it carries a tag that means nothing
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
 *
 * The Examples cell is a script name followed by whatever arguments that script takes — for
 * `spec-controller tags`, the workspace CLI and the subcommand to give it. The script's own text
 * is a `tsx <entry>` invocation; anything else is a change this arm must be told about rather than
 * silently paper over.
 */
function commandFor(check: string): readonly [string, readonly string[]] {
  const [scriptName, ...subcommand] = check.split(/\s+/);
  assert.ok(scriptName, `the Examples table names no command: "${check}"`);
  // THE SOURCE CLI BY PATH, AND DELIBERATELY NOT THROUGH THE ROOT SCRIPT (3F-3413).
  //
  // This used to read `package.json`'s script for `scriptName` and assert it was a `tsx <entry>`
  // invocation, then spawn that entry. Two things were wrong with it once 3F-3105 pinned this
  // repository to its own published package. It BROKE, because the root `spec-controller` script is
  // now the bare binary name rather than a `tsx` invocation — a re-derivation of how a command is
  // spelled is coupled to a spelling that was free to change. And had it been "fixed" by running the
  // script, this scenario would have quietly begun asserting the PUBLISHED artefact's parse gate
  // instead of this tree's: a regression in the source parse gate would have gone green here, with
  // nothing in the diff to say so.
  //
  // So the entry is named directly. @SCN-GPG-002 is a claim about the product's behaviour and must
  // exercise the code under change, exactly as @SCN-SLF-008's arm does. The Examples cell still
  // names the command a consumer types; only the resolution of it is pinned to this tree.
  const entry = path.join("packages", "spec-controller", "src", "cli.ts");
  assert.equal(
    scriptName,
    "spec-controller",
    `the Examples table names "${scriptName}", but this arm resolves only spec-controller's own CLI`,
  );
  return [
    path.join(repoRoot, "node_modules", ".bin", "tsx"),
    [path.join(repoRoot, entry), ...subcommand],
  ];
}

/** Spawn the real check as its own process, with `corpusRoot` as its working directory. */
function spawnCheckOver(check: string, corpusRoot: string): Outcome {
  const [tsx, args] = commandFor(check);
  const result = spawnSync(tsx, [...args], { cwd: corpusRoot, encoding: "utf8" });
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

/**
 * A REGEX, NOT `{word}`. The Examples cell names a command, and a command is a script plus its
 * subcommand — two words with a space in them, which the built-in `{word}` parameter cannot match.
 */
// @SCN-GPG-002
When(/^(.+) is asked to check that corpus$/, function (check: string) {
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

/**
 * A verdict of either kind: the clean bill, or the finding list. Neither may survive a refusal.
 * `tags:` is the shipped command's own prefix on both — the word it opens each verdict with, and
 * the one thing a caller reading stdout would take as an answer about the corpus.
 */
const VERDICT = /tags: (OK|FAILED)/;

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
      /tags: FAILED/,
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
