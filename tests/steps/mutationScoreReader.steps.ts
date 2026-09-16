/**
 * @integration for @SCN-MUT-019 — the sweep record's reader, run as the row runs it, against a
 * record planted in a root of this scenario's own.
 *
 * The bidirectional evidence marker (Evidence Manifesto §9) is on the step blocks below; the @unit
 * pin is tests/checks/measurementArtefact.supersededCode.test.ts.
 *
 * WHY THIS ARM RUNS THE REAL READER. The @unit pin beside it proves the matching rule over rows it
 * hands in directly; what it cannot reach is everything between a command line and a file on disk —
 * the argument parse, the evidence-root resolution, the record found where the placement left it, and
 * the exit code its own CI step reports as its outcome. A widening right in the matcher
 * and wrong at the flag reads green at unit and refuses on every push.
 *
 * ITS OWN STEP TEXT, EVERY LINE OF IT. Cucumber's step registry is process-wide, and several files
 * here register unqualified measurement phrases over their own module-local fixtures. Every step
 * below names the sweep record or the row it is about.
 *
 * THE ROOT IS PLANTED, AND IT IS THE EVIDENCE ROOT RATHER THAN A TARGET ROOT. `--root` is what
 * `resolveEvidenceRoot` takes as already-resolved (3F-3099), so nothing here reads or writes the
 * outer run's own record — which matters more than usual for this scenario: the evidence root
 * persists between local runs, so an arm that withheld a record would otherwise find the previous
 * run's still sitting there and measure that.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  SWEEP_RECORD_PATH,
  type Measurement,
} from "../checks/measurementArtefact.js";

const repoRoot = process.cwd();
const reader = path.join(
  repoRoot,
  "tests",
  "checks",
  "mutationScoreReaderCli.ts",
);
const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");

/** The workflow every push runs, and the one that places the record this reader reads. */
const LADDER = path.join(".github", "workflows", "ci.yml");

/** The number the planted sweep left behind, which is the whole of what a satisfied read prints. */
const PLANTED_MEASUREMENT = 774;

const plantedRoots: string[] = [];

let plantedRoot: string;
let askedScn: string;
let askedCheck: string;
let supersededScn: string | null;
let readEndedWith: number | null;
let readPrinted: string;
let readSaid: string;

After(function () {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// @SCN-MUT-019
Given(
  "a sweep record holding one measurement, stamped with the scenario {string} on the check {string}",
  function (scnId: string, check: string) {
    plantedRoot = mkdtempSync(path.join(tmpdir(), "sweep-record-"));
    plantedRoots.push(plantedRoot);
    const record: { measurements: Measurement[] } = {
      measurements: [{ scnId, checkTag: check, measured: PLANTED_MEASUREMENT }],
    };
    const at = path.join(plantedRoot, SWEEP_RECORD_PATH);
    mkdirSync(path.dirname(at), { recursive: true });
    writeFileSync(at, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  },
);

// @SCN-MUT-019
Given(
  "a row measuring {string} on the scenario {string}, which states that it supersedes {string}",
  function (check: string, scnId: string, superseded: string) {
    askedCheck = check;
    askedScn = scnId;
    supersededScn = superseded;
  },
);

// @SCN-MUT-019
Given(
  "a row measuring {string} on the scenario {string}, which states no superseded code",
  function (check: string, scnId: string) {
    askedCheck = check;
    askedScn = scnId;
    // The safe default, and the one every row had before any row could ask.
    supersededScn = null;
  },
);

// @SCN-MUT-019
When("that row's check is asked for its measurement", function () {
  const superseding = supersededScn === null ? [] : ["--supersedes", supersededScn];
  const finished = spawnSync(
    tsxBin,
    [reader, "--scn", askedScn, "--check", askedCheck, ...superseding, "--root", plantedRoot],
    { cwd: repoRoot, encoding: "utf8" },
  );
  readEndedWith = finished.status;
  readPrinted = finished.stdout ?? "";
  readSaid = finished.stderr ?? "";
});

// @SCN-MUT-019
Then("it answers with the number that measurement holds", function () {
  if (readEndedWith !== 0) {
    assert.fail(
      `expected the read to answer, and it ended ${String(readEndedWith)} saying: ${readSaid.trim()}`,
    );
  }
  // THE WHOLE OF STDOUT, because that is the contract the measured step definition reads it under:
  // a banner or a units suffix here would not be ignored, it would post the wrong number or none.
  if (readPrinted.trim() !== String(PLANTED_MEASUREMENT)) {
    assert.fail(
      `expected the read to print ${PLANTED_MEASUREMENT} and nothing else; it printed "${readPrinted.trim()}"`,
    );
  }
});

// @SCN-MUT-019
Then("it refuses, naming the row it could not find", function () {
  if (readEndedWith === 0) {
    assert.fail(`expected the read to refuse; it ended 0 printing "${readPrinted.trim()}"`);
  }
  if (readPrinted.trim() !== "") {
    assert.fail(
      `expected a refusal to print no number at all; it printed "${readPrinted.trim()}"`,
    );
  }
  // The row it was asked for, named — a refusal that said only that something was missing sends
  // whoever reads it hunting through a record for a key it never states.
  if (!readSaid.includes(askedScn)) {
    assert.fail(`expected the refusal to name ${askedScn}; it said: ${readSaid.trim()}`);
  }
  if (supersededScn !== null && !readSaid.includes(supersededScn)) {
    assert.fail(
      `expected a refusal that looked under two codes to name both; it said: ${readSaid.trim()}`,
    );
  }
});

/** The step this claim is about, by the name the workflow gives it. */
const PLACEMENT_STEP = "Place the scheduled sweep's measurement";

/**
 * The lines of ONE named step of the workflow, and nothing else.
 *
 * THE CLAIM WAS ALWAYS ABOUT THIS STEP AND USED TO BE MEASURED OVER THE WHOLE FILE, which held
 * while the file placed one thing. 3F-3333 added a second placement — the per-mutant record
 * SCN-FIT-017 is judged against — and every shape below matched twice, so an arm asserting an
 * ORDER inside this step failed over a step it says nothing about. Scoping is what keeps the
 * instrument pointed at the subject; it does not loosen it, because "exactly one" is still refused
 * inside the slice and the slice still has to exist.
 */
function theStep(lines: readonly string[], named: string): readonly string[] {
  const opens = lines.flatMap((line, at) => (line.includes(`- name: ${named}`) ? [at] : []));
  if (opens.length !== 1) {
    assert.fail(`${LADDER} holds ${opens.length} steps named "${named}"; it must hold exactly one.`);
  }
  const from = opens[0]!;
  const after = lines.findIndex((line, at) => at > from && /^\s{6}- name: /.test(line));
  return lines.slice(from, after === -1 ? lines.length : after);
}

/** The one line of a step matching a shape, refused where there is not exactly one. */
function theOneLine(lines: readonly string[], shape: RegExp, what: string): number {
  const found = lines.flatMap((line, at) => (shape.test(line) ? [at] : []));
  if (found.length !== 1) {
    assert.fail(
      `the "${PLACEMENT_STEP}" step of ${LADDER} holds ${found.length} lines that ${what}; ` +
        "it must hold exactly one.",
    );
  }
  return found[0]!;
}

// @SCN-MUT-019
Then(
  "what keeps a lapsed sweep's number out is untouched: the measurement carries no clock of its own, and the window is applied against the producing run's own clock where the record is placed, before any code in it is read",
  function () {
    // HALF THE CLAIM IS THE PAYLOAD'S SHAPE. A row is two terms and a number, so there is nothing in
    // the record an age could be read from — which is what makes "this widens which code counts,
    // not which record counts" a property of the artefact rather than a promise about the reader.
    const record = JSON.parse(
      readFileSync(path.join(plantedRoot, SWEEP_RECORD_PATH), "utf8"),
    ) as { measurements: readonly Record<string, unknown>[] };
    for (const row of record.measurements) {
      const held = Object.keys(row).sort().join(", ");
      if (held !== "checkTag, measured, scnId") {
        assert.fail(`expected a sweep record's row to carry no clock; it holds ${held}`);
      }
    }

    // AND THE OTHER HALF IS AN ORDER IN THE STEP THAT PLACES IT. A run past the window is never
    // downloaded and never placed, so this reader meets no record at all — superseded code or
    // current. Move the window check after the download and this reds, which is exactly the edit
    // that would turn "answers a superseded code" into "answers a stale one".
    //
    // IT READS THE CALL, NOT THE COMPARISON, SINCE 3F-3200. The age-versus-window arithmetic moved
    // into `scripts/freshness-window.sh` so that one window governs every placed row; the literal
    // this used to pin is not in the step any more. The property is untouched — the shared rule is
    // asked BEFORE the payload is fetched and before anything is placed — and only the line that
    // stands for "the window is applied here" changed.
    const lines = theStep(
      readFileSync(path.join(repoRoot, LADDER), "utf8").split("\n"),
      PLACEMENT_STEP,
    );
    const refusesPastTheWindow = theOneLine(
      lines,
      /\binside_the_freshness_window "/,
      "refuse a run past the window",
    );
    const fetches = theOneLine(lines, /\bgh\s+run\s+download\b/, "fetch the payload");
    const places = theOneLine(lines, /cp "\$\{found\}"/, "place the record where this reader reads it");
    if (!(refusesPastTheWindow < fetches && fetches < places)) {
      assert.fail(
        `expected the window to be cleared before the payload is fetched and placed; the window is ` +
          `refused at line ${refusesPastTheWindow + 1}, the payload fetched at ${fetches + 1} and ` +
          `placed at ${places + 1}`,
      );
    }
  },
);
