/**
 * Step definitions for @SCN-SLF-005 — the banked figure held against the axis (3F-3193) — and for
 * @SCN-SLF-006, the repository that banked no figure at all (3F-3194).
 *
 * ANTI-WATERMELON. This runs the REAL `pnpm balance:self` as a subprocess over planted trees and
 * reads its actual exit code. The @unit arm in `tests/checks/fitnessAxisBar.test.ts` owns the
 * comparison — what a fall is, and that the sentence carries both numbers — and this arm owns the
 * only fact a projection over strings cannot hold: that the GATE runs the comparison at all and
 * ends on it. A test that called the comparison directly would agree with a gate that never
 * consulted it.
 *
 * TWO TREES DIFFERING IN ONE NUMERAL. Both plant the same manifest, the same corpus and the same
 * evidence reports; only the figure their record banks differs. So the red arm's only difference
 * from its control is the count, which is what makes the red attributable to it rather than to some
 * other flaw in a differently-built plant — the @SCN-SLF-002 shape, one axis over.
 *
 * PLANTED TREES RATHER THAN THIS ONE, for the reason the SLF family already gives: a repository
 * cannot keep a permanent real fall in-tree to point a passing arm at, and this scenario IS a
 * cucumber run, so a live report of itself does not exist while it executes.
 *
 * WHAT @SCN-SLF-006 ADDS HERE AND WHAT IT CANNOT. This arm proves the GATE passes over a
 * repository that never banked — which is the fact a consumer meets on first use, and which a
 * projection over strings cannot hold. It cannot prove that the silence is an ABSENT bar rather
 * than a DEFAULTED bar of zero: a bar of zero is cleared by every count, so both readings exit 0
 * over every tree there is. That distinction belongs to the reader's own boundary and is asserted
 * in the @unit arm; here it is read once, off a planted record's real bytes, so a defaulting cure
 * cannot pass this file either.
 *
 * @SCN-SLF-005 / @SCN-SLF-006 — bidirectional evidence markers. Grepping either returns the
 * scenario, this step block, and the @unit blocks in tests/checks/fitnessAxisBar.test.ts.
 *
 * Parents: 3F-3193 (sub-issue 2 of 3) and 3F-3194 (sub-issue 3 of 3), under 3F-3180.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bankedFitnessRowsIn, FITNESS_AXIS, ROWS } from "../checks/fitnessRowBank.js";

// @SCN-SLF-005
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Where a planted target files its bars — the same name this repository uses for its own. */
const RECORD_FILE = "quality-thresholds.yml";

/** How many fitness rows every planted manifest below holds. */
const ROWS_HELD = 3;

/** The outcome of one gate run over one planted tree. */
interface GateRun {
  exitCode: number;
  output: string;
}

const plantedRoots: string[] = [];
let fallenRoot: string;
let fallenRun: GateRun;
// @SCN-SLF-006
let noRecordRoot: string;
// @SCN-SLF-006
let overBankedRoot: string;

/**
 * What a planted target's record has to say about the axis: a banked figure, a record that files no
 * block for it, or no record file at all (@SCN-SLF-006). The last two are the two ordinary forms of
 * never having banked — where a consumer starts, and where one arrives the day it adopts any other
 * bar here.
 */
type Banking = number | "no-block" | "no-record";

/**
 * Plant a complete miniature target the gate can reconcile: a corpus naming one `@unit` scenario,
 * the evidence that settles it, a manifest holding `ROWS_HELD` fitness rows, and a record saying
 * `banked` about them.
 *
 * THE TREE IS OTHERWISE IN BALANCE ON PURPOSE. A plant that was out-of-balance for its own reasons
 * would exit 1 either way, and the exit code would then say nothing about the axis.
 */
// @SCN-SLF-005
// @SCN-SLF-006
function plantTarget(banked: Banking): string {
  const root = mkdtempSync(path.join(tmpdir(), "spec-controller-slf005-"));
  plantedRoots.push(root);

  mkdirSync(path.join(root, "features"), { recursive: true });
  mkdirSync(path.join(root, ".github/workflows"), { recursive: true });
  mkdirSync(path.join(root, "runs/self-balance"), { recursive: true });

  writeFileSync(
    path.join(root, "features/planted.feature"),
    [
      "@PLT",
      "Feature: a planted target",
      "",
      "  Rule: the planted rule",
      "",
      "    @unit @SCN-PLT-001",
      "    Scenario: the planted behaviour holds",
      "      Given a planted precondition",
      "      Then the planted outcome follows",
      "",
    ].join("\n"),
  );

  writeFileSync(path.join(root, ".github/workflows/ci.yml"), "name: CI\njobs: {}\n");

  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "planted",
      specController: {
        fitnessChecks: Array.from({ length: ROWS_HELD }, (_unused, at) => ({
          scn: `SCN-PLT-1${String(at + 1).padStart(2, "0")}`,
          characteristic: "traceability",
          command: "pnpm lint:planted",
        })),
      },
    }) + "\n",
  );

  // The section and field names are the bank's own constants rather than a second spelling: the
  // record a bank writes and the record this gate reads are one file, and two copies of its shape
  // would agree until somebody edited one. A target that files NO record writes nothing at all
  // here, which is the state a consumer's tree is in before it has ever banked anything.
  if (banked !== "no-record") {
    writeFileSync(
      path.join(root, RECORD_FILE),
      [
        "# The planted target's own quality bars.",
        "",
        ...(banked === "no-block" ? [] : [`${FITNESS_AXIS}:`, `  ${ROWS}: ${banked}`]),
        "",
      ].join("\n"),
    );
  }

  writeFileSync(
    path.join(root, "runs/self-balance/vitest.json"),
    JSON.stringify({
      testResults: [
        {
          name: path.join(root, "planted.test.ts"),
          assertionResults: [
            {
              fullName: "[SCN-PLT-001] the planted behaviour holds",
              title: "the planted behaviour holds",
              status: "passed",
            },
          ],
        },
      ],
    }) + "\n",
  );
  writeFileSync(path.join(root, "runs/self-balance/cucumber.json"), JSON.stringify([]) + "\n");

  return root;
}

/** Run the REAL gate over a planted tree and capture its outcome. */
// @SCN-SLF-005
function runGate(root: string): GateRun {
  try {
    const output = execFileSync("pnpm", ["balance:self", "--root", root], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return { exitCode: 0, output };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: typeof e.status === "number" ? e.status : 1,
      output: `${e.stdout ?? ""}${e.stderr ?? ""}`,
    };
  }
}

// @SCN-SLF-005
Given("a repository whose manifest has lost fitness rows since its record was banked", function () {
  fallenRoot = plantTarget(16);
});

// @SCN-SLF-005
When(
  "the self-reconciliation gate reconciles that repository, and one whose manifest still holds every row its record banks",
  function () {
    fallenRun = runGate(fallenRoot);
  },
);

// @SCN-SLF-005
Then(
  "the gate fails over the repository that has lost rows, naming both the figure the record banks and the count the manifest now holds",
  function () {
    assert.notEqual(
      fallenRun.exitCode,
      0,
      `a fallen axis must red the gate; the run ended cleanly.\n${fallenRun.output}`,
    );
    assert.match(
      fallenRun.output,
      new RegExp(`banked 16, found ${ROWS_HELD}`),
      `the red does not name both numbers: ${fallenRun.output}`,
    );
  },
);

// @SCN-SLF-005
Then(
  "the gate says nothing about the axis over the repository whose rows are all still there",
  function () {
    // THE CONTROL, AND IT IS A SECOND TREE RATHER THAN A SECOND EDIT OF THE FIRST — planted from
    // the same function, differing in the one numeral its record banks.
    const intact = runGate(plantTarget(ROWS_HELD));

    assert.equal(
      intact.exitCode,
      0,
      `the intact tree balances and must pass; it ended ${intact.exitCode}.\n${intact.output}`,
    );
    assert.doesNotMatch(
      intact.output,
      /banked \d+, found \d+/,
      `the gate reported a fall over an axis that has lost nothing: ${intact.output}`,
    );
  },
);

/**
 * How many rows the over-banked repository's record banks — more than `ROWS_HELD`, so it is a fall
 * and the gate has something to say. It is the control for @SCN-SLF-006's two silences.
 */
const OVER_BANKED = 16;

// @SCN-SLF-006
let noRecordRun: GateRun;
// @SCN-SLF-006
let noBlockRoot: string;
// @SCN-SLF-006
let noBlockRun: GateRun;
// @SCN-SLF-006
let overBankedRun: GateRun;

// @SCN-SLF-006
Given(
  "a repository filing no record at all, one whose record files no block for the axis, and one whose record banks more rows than its manifest holds",
  function () {
    noRecordRoot = plantTarget("no-record");
    noBlockRoot = plantTarget("no-block");
    overBankedRoot = plantTarget(OVER_BANKED);
  },
);

// @SCN-SLF-006
When("the self-reconciliation gate reconciles each of them", function () {
  noRecordRun = runGate(noRecordRoot);
  noBlockRun = runGate(noBlockRoot);
  overBankedRun = runGate(overBankedRoot);
});

// @SCN-SLF-006
Then(
  "the gate says nothing about the axis over the repositories that banked no figure",
  function () {
    // ALL THREE TREES HOLD THE SAME THREE-ROW MANIFEST. What separates these two from the control
    // below is only what their record says about the axis, so a red here could not be blamed on a
    // differently-built plant.
    for (const [what, run] of [
      ["files no record at all", noRecordRun],
      ["files a record with no block for the axis", noBlockRun],
    ] as const) {
      assert.equal(
        run.exitCode,
        0,
        `a repository that ${what} has set no bar and must not be held to one; the gate ended ` +
          `${run.exitCode}.\n${run.output}`,
      );
      assert.doesNotMatch(
        run.output,
        /banked \d+, found \d+/,
        `the gate reported a fall against a figure nobody banked: ${run.output}`,
      );
      assert.doesNotMatch(
        run.output,
        new RegExp(FITNESS_AXIS),
        `the gate spoke about the axis over a repository that never banked: ${run.output}`,
      );
    }
  },
);

// @SCN-SLF-006
Then(
  "a record filing no block for the axis is read as banking none at all, rather than as banking zero",
  function () {
    // READ OFF THE PLANTED RECORD'S REAL BYTES, so this arm and the gate above it are looking at
    // one file rather than at a fixture and a tree that agree by diligence.
    //
    // AND IT IS ASSERTED HERE BECAUSE THE EXIT CODES ABOVE CANNOT SAY IT. A bar of zero is cleared
    // by every count there is, so a reader that defaulted to zero would exit 0 over both trees
    // above and agree with every assertion in this file but this one. Absent and zero part company
    // at the reader's boundary or nowhere.
    const read = bankedFitnessRowsIn(
      readFileSync(path.join(noBlockRoot, RECORD_FILE), "utf8"),
      RECORD_FILE,
    );

    assert.equal(
      read,
      null,
      `a record filing no block for the axis banks no figure; it was read as ${String(read)}.`,
    );
  },
);

// @SCN-SLF-006
Then(
  "the gate fails over the repository whose record does bank a figure, so the silence is the absent figure's and not the gate's",
  function () {
    // THE POSITIVE CONTROL, AND WITHOUT IT THE TWO SILENCES ABOVE ARE WHAT A GATE THAT HAD STOPPED
    // LOOKING WOULD ALSO PRODUCE. Same plant, same manifest, same evidence; the record banks a
    // figure this manifest cannot meet, and the gate reds on it.
    assert.notEqual(
      overBankedRun.exitCode,
      0,
      `the gate must still red where a figure IS banked and unmet; it ended cleanly.\n` +
        overBankedRun.output,
    );
    assert.match(
      overBankedRun.output,
      new RegExp(`banked ${OVER_BANKED}, found ${ROWS_HELD}`),
      `the red does not name both numbers: ${overBankedRun.output}`,
    );
  },
);

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});
