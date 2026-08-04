/**
 * Step definitions for the @SCN-VOC-016 arm of features/vocabulary-audit.feature — the
 * data-floor gate.
 *
 * ANTI-WATERMELON. This runs the REAL `pnpm lint:exempt-data-floor` over the REAL exempt
 * list and reads its actual outcome, rather than re-running the predicate in isolation.
 * The @unit arm owns the judgement over constructed lists; this one owns the verdict over
 * the list this repository actually ships — which is the only thing that says the floor was
 * reached rather than merely describable.
 *
 * WHY BOTH ARMS RUN HERE. The gate must red a code file and pass a pure-data one. The real
 * list holds only pure-data paths once the relocation lands, so the redding arm is driven
 * by a planted list rather than by damaging the real one — the same reason the LNT trio use
 * planted fixtures.
 *
 * @SCN-VOC-016 — bidirectional evidence marker.
 *
 * Parent: 3F-2386 (sub-issue 1 of 2 under 3F-2378).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isPureDataPath, exemptionFaults } from "../../packages/spec-controller/static-checks/lintExemptDataFloorCli.js";
import type { ExemptionKind } from "../../packages/spec-controller/static-checks/selfExempt.js";

// @SCN-VOC-016
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The outcome of the real gate over the real list. */
interface GateRun {
  exitCode: number;
  output: string;
}

let realRun: GateRun;
let codeFileVerdict: ReturnType<typeof exemptionFaults>;
let pureDataVerdict: ReturnType<typeof exemptionFaults>;

// @SCN-VOC-016
Given("the set of files the audit is told to skip", function () {
  // No fixture — the assertions below read the list this repository actually ships.
});

// @SCN-VOC-016
When(
  "each is judged on whether every banned word in it is a mention rather than a use",
  function () {
    try {
      realRun = {
        exitCode: 0,
        output: execFileSync("pnpm", ["lint:exempt-data-floor"], {
          cwd: repoRoot,
          encoding: "utf8",
        }),
      };
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      realRun = {
        exitCode: typeof e.status === "number" ? e.status : 1,
        output: `${e.stdout ?? ""}${e.stderr ?? ""}`,
      };
    }

    // The redding arm, over a PLANTED list: a code file that genuinely holds banned words.
    // Driven through the same predicate the gate uses, not a re-implementation of it.
    const pure: ExemptionKind = { kind: "pure-data", note: "planted" };
    const codeFile = "packages/spec-controller/static-checks/vocabAudit.ts";
    codeFileVerdict = exemptionFaults(new Map([[codeFile, pure]]), new Map([[codeFile, 8]]));

    const dataFile = "packages/spec-controller/static-checks/blockedVocabulary.md";
    pureDataVerdict = exemptionFaults(new Map([[dataFile, pure]]), new Map([[dataFile, 25]]));
  },
);

// @SCN-VOC-016
Then("a file that also holds live vocabulary is refused the exemption", function () {
  assert.equal(
    codeFileVerdict.length,
    1,
    `expected a code file on the exempt list to be refused; got no fault. A code file can ` +
      `hold a USE behind a mention, which is exactly what hid 3F-2300.`,
  );
  assert.equal(codeFileVerdict[0]?.kind, "code-file-exempt");
  assert.equal(
    isPureDataPath("packages/spec-controller/static-checks/vocabAudit.ts"),
    false,
    "a .ts module under static-checks is code, whatever data it happens to carry",
  );
});

// @SCN-VOC-016
Then("a file whose every banned word is data keeps it", function () {
  assert.deepEqual(
    pureDataVerdict,
    [],
    "expected a pure-data path covering real mentions to keep its exemption — a gate that " +
      "reds on everything is as useless as one that reds on nothing",
  );

  // And the REAL list satisfies the floor: this is the arm that says it was reached.
  assert.equal(
    realRun.exitCode,
    0,
    `expected the data-floor gate to PASS over the real exempt list; it exited ` +
      `${realRun.exitCode}. Output:\n${realRun.output}`,
  );
});

/** @SCN-VOC-017 — the ratchet: an exemption covering nothing is stale. */
let staleVerdict: ReturnType<typeof exemptionFaults>;
let staleResidualVerdict: ReturnType<typeof exemptionFaults>;

// @SCN-VOC-017
Given("an exemption granted for a file that held banned words as data", function () {
  // The real list is the control: every entry on it covers a mention today, which is what
  // the gate's own green over the real tree asserts. This arm plants the opposite.
});

// @SCN-VOC-017
When("the file no longer holds any", function () {
  const table = "packages/spec-controller/static-checks/blockedVocabulary.md";
  const pure: ExemptionKind = { kind: "pure-data", note: "planted" };
  staleVerdict = exemptionFaults(new Map([[table, pure]]), new Map([[table, 0]]));

  const code = "packages/spec-controller/static-checks/vocabAudit.ts";
  const residual: ExemptionKind = { kind: "residual", pending: "3F-2392", note: "planted" };
  staleResidualVerdict = exemptionFaults(new Map([[code, residual]]), new Map([[code, 0]]));
});

// @SCN-VOC-017
Then("the exemption reds as stale, so the list can only shrink", function () {
  assert.equal(
    staleVerdict.length,
    1,
    "expected an exemption covering no banned word to red as stale; it covers nothing, so " +
      "left alone it is licence for the next file that happens to match the path",
  );
  assert.equal(staleVerdict[0]?.kind, "stale-entry");
});

// @SCN-VOC-017
Then("a residual entry says which ticket it was still waiting on", function () {
  // A stale RESIDUAL is worse than a stale pure-data entry: it claims someone still owes
  // work that is in fact already done, so the red must name the ticket to close.
  assert.equal(staleResidualVerdict[0]?.kind, "stale-entry");
  assert.match(
    staleResidualVerdict[0]?.message ?? "",
    /3F-2392/,
    "expected the stale residual's red to name the ticket it was pending on",
  );
});
