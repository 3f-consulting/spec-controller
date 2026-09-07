/**
 * Step definitions for @SCN-SLF-004 — the fitness axis's banked row count (3F-3192).
 *
 * ANTI-WATERMELON. This runs the REAL `pnpm fitness:bank` as a subprocess over planted trees and
 * reads the record files back off disk. The @unit arm in `tests/checks/fitnessRowBank.test.ts`
 * owns the rule — the count comes off the manifest, it is written upward, a fall is refused — and
 * this arm owns the only two facts a projection over strings cannot hold: that the command is
 * WIRED at all, and that a file on disk actually changed. A test that asserted the returned string
 * would agree with a bank that wrote nothing.
 *
 * PLANTED TREES RATHER THAN THIS ONE, FOR THE REASON THE SLF FAMILY ALREADY GIVES. The bank only
 * ever raises, so a second banking over this repository's own record is refused by construction and
 * the raise arm would have nothing to prove. Both trees below are complete miniature targets — a
 * manifest holding rows, a record banking a count — and `--root` moves the whole read and write to
 * them.
 *
 * THE PLANTED ROOT IS ASSERTED TO SIT OUTSIDE THE WORKING DIRECTORY. A command that found a tree of
 * its own would agree with a caller for exactly as long as it sat beside that caller's code, and
 * an arm planted inside this repository could not tell the two apart.
 *
 * @SCN-SLF-004 — bidirectional evidence marker. Grepping SCN-SLF-004 returns the scenario, this
 * step block, and the @unit blocks in tests/checks/fitnessRowBank.test.ts.
 *
 * Parent: 3F-3192 (sub-issue 1 of 3 under 3F-3180).
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// @SCN-SLF-004
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Where a planted target files its bars — the same name this repository uses for its own. */
const RECORD_FILE = "quality-thresholds.yml";

/** The outcome of one banking run over one planted tree. */
interface BankRun {
  exitCode: number;
  output: string;
}

/** One planted target: its root, and the record's bytes exactly as they were written. */
interface PlantedTarget {
  root: string;
  recordBefore: string;
}

const plantedRoots: string[] = [];
let raiseTarget: PlantedTarget;
let raiseRun: BankRun;

/**
 * Plant a complete miniature target: a manifest holding `rows` fitness rows, and a record banking
 * `banked` of them.
 *
 * THE RECORD CARRIES COMMENTS, AND THAT IS AN ASSERTION RATHER THAN DECORATION. A record file is
 * mostly justification, and a recorder that re-serialised a parsed document would drop every line
 * of it while writing the numeral perfectly. The byte comparison downstream is what notices.
 */
// @SCN-SLF-004
function plantTarget(rows: number, banked: number): PlantedTarget {
  const root = mkdtempSync(path.join(tmpdir(), "spec-controller-slf004-"));
  plantedRoots.push(root);
  assert.ok(
    !root.startsWith(process.cwd()),
    `the planted tree at ${root} sits inside the working directory, so this arm proves nothing about which tree was read.`,
  );

  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "planted",
        specController: {
          fitnessChecks: Array.from({ length: rows }, (_unused, at) => ({
            scn: `SCN-PLT-${String(at + 1).padStart(3, "0")}`,
            characteristic: "traceability",
            command: "pnpm lint:planted",
          })),
        },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  const recordBefore = [
    "# The planted target's own quality bars.",
    "#",
    "# IT READS UPWARD AND IT IS BANKED, NEVER TYPED. This comment is here to be preserved.",
    "",
    "fitness-axis:",
    `  rows: ${banked}`,
    "",
  ].join("\n");
  writeFileSync(path.join(root, RECORD_FILE), recordBefore, "utf8");

  return { root, recordBefore };
}

/** Run the REAL bank command over a planted tree and capture its outcome. */
// @SCN-SLF-004
function runBank(root: string): BankRun {
  try {
    const output = execFileSync("pnpm", ["fitness:bank", "--root", root], {
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

/** The record as it now stands on disk. */
// @SCN-SLF-004
function recordAt(target: PlantedTarget): string {
  return readFileSync(path.join(target.root, RECORD_FILE), "utf8");
}

// @SCN-SLF-004
Given("a repository whose record banks fewer fitness rows than its manifest holds", function () {
  raiseTarget = plantTarget(16, 12);
});

// @SCN-SLF-004
When("the repository banks the fitness-row count its manifest states", function () {
  raiseRun = runBank(raiseTarget.root);
});

// @SCN-SLF-004
Then(
  "the record states the count read from the manifest, and stands otherwise byte for byte as it was",
  function () {
    assert.equal(
      raiseRun.exitCode,
      0,
      `the banking should have been accepted; it ended ${raiseRun.exitCode}.\n${raiseRun.output}`,
    );

    const after = recordAt(raiseTarget);
    assert.equal(
      after,
      raiseTarget.recordBefore.replace("rows: 12", "rows: 16"),
      `the record should differ from the one that was planted in exactly the banked count.\n${after}`,
    );
    // The count is the manifest's, stated back so a reader of the run knows what was banked.
    assert.match(raiseRun.output, /16/, `the run does not say what it banked: ${raiseRun.output}`);
  },
);

// @SCN-SLF-004
Then(
  "banking over a manifest that has since lost rows is refused, naming both counts and leaving the record as it stood",
  function () {
    // A SECOND TARGET RATHER THAN A SECOND EDIT OF THE FIRST. The record just raised holds 16, so a
    // fall is planted by giving a target more banked than its tree carries — which is the shape the
    // emptied axis arrives in, one row at a time or all sixteen at once.
    const fallen = plantTarget(15, 16);
    const run = runBank(fallen.root);

    assert.notEqual(run.exitCode, 0, `a fall must be refused; the run ended cleanly.\n${run.output}`);
    assert.match(run.output, /15/, `the refusal does not name what the tree holds: ${run.output}`);
    assert.match(run.output, /16/, `the refusal does not name what the record banks: ${run.output}`);
    assert.match(
      run.output,
      /by hand/,
      `the refusal does not name the one route down: ${run.output}`,
    );
    assert.equal(
      recordAt(fallen),
      fallen.recordBefore,
      "a refused banking must leave the record exactly as it stood.",
    );
  },
);

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});
