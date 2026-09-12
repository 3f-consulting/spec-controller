/**
 * Step definitions for @SCN-MUT-022 — this repository's mutation bar is ONE number with two
 * readers: the ledger's row and the runner's break threshold.
 *
 * @SCN-MUT-022 — the bidirectional @integration evidence marker (Evidence Manifesto §9).
 *
 * IT READS THE REAL ARTEFACTS, WHICH IS THE WHOLE SCENARIO. Every other Rule in
 * mutation-score.feature decides over planted data, because a rule is shown going wrong by feeding
 * it something wrong. This one is not a claim about the engine: it is a claim about THIS
 * repository's own wiring, so it opens `package.json` and `stryker.config.mjs` where they actually
 * live. A fixture manifest compared to a fixture config would pass over a tree whose real bar had
 * been typed twice, which is the fault the scenario exists to make unreachable.
 *
 * NEITHER SIDE IS RE-DERIVED HERE. The row is read through `resolveFitnessChecks`, the engine's own
 * reading of a target's `specController.fitnessChecks`, and the threshold is read by IMPORTING the
 * config the way the runner loads it and looking at what it exported. Re-implementing either and
 * comparing this file's answer to the artefact would measure the re-implementation and manufacture
 * whatever agreement it was written to find (3F-3218).
 *
 * AND THE SECOND `Then` IS WHAT STOPS THE FIRST BEING ARITHMETIC. Two hard-coded 80s satisfy
 * `80 === 80` exactly as well as a derivation does, so the identity alone cannot tell a reader
 * which of the two this tree has. The second arm moves the ROW — the real config's own bytes,
 * loaded beside a manifest whose row carries a different bar — and requires the threshold to move
 * with it. Two inputs, two matching outputs: no constant survives both.
 *
 * THE PLANT IS OF THE RECORD, NEVER OF THE WIRING. What the second arm writes to a scratch
 * directory is the config VERBATIM, byte for byte off disk, so the derivation under test is this
 * repository's own and not a copy of it written here. Nothing of the sort is committed to the tree
 * either, which keeps every source-grep over `package.json` seeing one manifest (3F-3245).
 *
 * Parent: @SCN-MUT-022 (3F-3336).
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { carriesBar } from "../../packages/core/src/domain/fitnessChecks.js";
import {
  resolveFitnessChecks,
  type KillFloorReader,
} from "../../packages/core/src/parse/targetManifest.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// @SCN-MUT-022
/** The one row both readers answer to. */
const SCN = "SCN-FIT-002";

/** This repository's own manifest and its own runner config — the subjects, not fixtures of them. */
const PACKAGE_JSON = path.join(repoRoot, "package.json");
const STRYKER_CONFIG = path.join(repoRoot, "stryker.config.mjs");

/**
 * No record to source a gate reference from.
 *
 * A ROW WHOSE BAR CAME FROM A RECORD WOULD READ AS NO BAR HERE, AND THAT IS THE HONEST ANSWER. The
 * bar this scenario is about is the one the ROW states — a number the two readers share — so a row
 * that had gone back to naming a mutation gate would arrive with `null` beside it and red on the
 * `Given`, naming the row rather than agreeing with a threshold by some other route.
 */
const NO_RECORD: KillFloorReader = () => null;

/**
 * A bar the tree does not hold, for the arm that moves the row.
 *
 * Its only requirement is that it differ from the real one, which the arm asserts rather than
 * assumes: a constant that happened to equal the live bar would make the moved arm agree for the
 * one reason it exists to rule out.
 */
const MOVED_BAR = 41;

const scratchRoots: string[] = [];

/** The bar the ledger reads off the row, as the engine reads it. */
let rowBar: number;

/** The threshold the runner would break on, as the runner's own loader hands it over. */
let breakThreshold: unknown;

/** The runner config's own bytes, carried to wherever the moved row is written. */
let configSource: string;

/** Load a Stryker config the way Stryker loads one: as a module, and read what it exported. */
async function breakThresholdOf(configPath: string): Promise<unknown> {
  assert.ok(
    existsSync(configPath),
    `the runner config must be readable at ${configPath} for this scenario to mean anything`,
  );
  const loaded = (await import(pathToFileURL(configPath).href)) as {
    default?: { thresholds?: { break?: unknown } };
  };
  return loaded.default?.thresholds?.break;
}

Given("this repository's own ledger row for its mutation score", function () {
  // No plant. The subject is the manifest this test is running out of.
  const manifest = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
    specController?: { fitnessChecks?: unknown };
  };
  const row = resolveFitnessChecks(manifest, NO_RECORD).get(SCN);
  assert.ok(row !== undefined, `${PACKAGE_JSON} must carry a ${SCN} row for this scenario to read`);
  assert.ok(carriesBar(row), `${SCN}'s row must carry a bar — it is the number this scenario is about`);
  assert.ok(
    row.bar !== null && row.bar !== undefined,
    `${SCN}'s row names a bar nothing could read, so there is no number for the runner to share`,
  );
  // THE DIRECTION IS PART OF THE BAR. A mutation score is satisfied by standing ABOVE its bar, and
  // the same figure read as a ceiling would red the suite it exists to pass. A row that flipped
  // would still hand the runner an integer, and only this line notices.
  assert.equal(row.bar.atLeast, true, `${SCN}'s bar must be a floor — a mutation score is held up to it`);
  rowBar = row.bar.threshold;
  configSource = readFileSync(STRYKER_CONFIG, "utf8");
});

When("the runner that sweeps it is asked what it breaks on", async function () {
  breakThreshold = await breakThresholdOf(STRYKER_CONFIG);
});

Then("the bar it breaks on is that row's own", function () {
  assert.equal(
    breakThreshold,
    rowBar,
    "the runner's break threshold and the ledger's row are one number with two readers; these are two numbers",
  );
});

Then(
  "the same runner over a row carrying a different bar breaks on that one instead",
  async function () {
    // VACUITY FLOOR. The whole point of this arm is that the threshold MOVED, which a planted bar
    // equal to the live one could not show.
    assert.notEqual(MOVED_BAR, rowBar, "the moved bar must differ from the live one to move anything");

    const scratch = mkdtempSync(path.join(tmpdir(), "scn-mut-022-"));
    scratchRoots.push(scratch);

    // The real manifest with ONE field moved — every other row, and the shape around them, is the
    // tree's own, so the reader is being handed the thing it actually reads.
    const moved = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
      specController: { fitnessChecks: { scn: string; atLeast?: number }[] };
    };
    const row = moved.specController.fitnessChecks.find((entry) => entry.scn === SCN);
    assert.ok(row !== undefined, `${SCN}'s row must be findable in the manifest to be moved`);
    row.atLeast = MOVED_BAR;
    writeFileSync(path.join(scratch, "package.json"), JSON.stringify(moved, null, 2));

    // The config VERBATIM. Relocated, never rewritten: a config edited on the way here would be a
    // scenario about a derivation this file invented.
    const relocated = path.join(scratch, "stryker.config.mjs");
    writeFileSync(relocated, configSource);

    assert.equal(
      await breakThresholdOf(relocated),
      MOVED_BAR,
      "the runner's break threshold did not follow the row, so it is a number of its own that agrees with the row today",
    );
  },
);

After(function () {
  while (scratchRoots.length > 0) {
    rmSync(scratchRoots.pop() as string, { recursive: true, force: true });
  }
});
