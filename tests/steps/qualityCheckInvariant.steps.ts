/**
 * @SCN-LDG-030 — a Quality Check Reconciliation's carried sides are consistent with its outcome
 * (the (outcome, side-presence) invariant, 3F-2016 / 3F-2031).
 *
 * Bidirectional evidence: the Given/When/Then carry the SCN-LDG-030 id, matching
 * features/ledger.feature's @SCN-LDG-030 scenario; the @unit arm lives in
 * packages/core/src/domain/qualityCheckReconciliation.test.ts.
 *
 * Two arms in one scenario:
 *  - IN-PROCESS construction — `makeQualityCheckReconciliation` mints a canon-correct pair for
 *    every outcome and REFUSES (throws on) any forbidden pair, expectations derived from the
 *    type-forced OUTCOME_SIDE_PROFILE map (never a hand-copied list).
 *  - THE ARTEFACT-VS-MANIFESTO GATE (@integration) — the REAL `spec-controller balance` binary is
 *    spawned over a ten-outcome corpus fixture; every emitted Quality Check Reconciliation's
 *    side-presence is checked against its canon row, and all ten outcomes must be exercised. This
 *    verifies the object the real tool EMITS against canon, not a golden.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  makeQualityCheckReconciliation,
  OUTCOME_SIDE_PROFILE,
} from "../../packages/core/src/domain/qualityCheckReconciliation.js";
import type { Outcome } from "../../packages/core/src/domain/qualityCheckReconciliation.js";
import type { EvidenceObligation, EvidenceObservation } from "../../packages/core/src/domain/journal.js";

// @SCN-LDG-030

/** The ten-outcome corpus fixture — shaped so the real reconcile emits ALL TEN outcomes. */
const TEN_OUTCOME_CORPUS = {
  features: "tests/fixtures/ten-outcome-corpus/features",
  vitest: "tests/fixtures/ten-outcome-corpus/vitest.json",
  cucumber: "tests/fixtures/ten-outcome-corpus/cucumber.json",
  ci: "tests/fixtures/ten-outcome-corpus/ci.yml",
  packageJson: "tests/fixtures/ten-outcome-corpus/package.json",
};

/** A REAL debit and a REAL credit — content is immaterial to the presence-only invariant. */
const sampleObligation: EvidenceObligation = { qualityCheck: "unit" };
const sampleObservation: EvidenceObservation = {
  qualityCheck: "unit",
  scnId: "SCN-LDG-030",
  status: "passed",
};

let profile: typeof OUTCOME_SIDE_PROFILE;
let constructedPresence: Record<string, { obligation: boolean; observation: boolean }> = {};

/**
 * Spawn the REAL top-level binary (packages/spec-controller/src/cli.ts) with the `balance`
 * subcommand — the standalone core + app pipeline, no in-process shortcut.
 */
function spawnBalance(args: string[]): SpawnSyncReturns<string> {
  const root = process.cwd();
  const result = spawnSync(
    join(root, "node_modules", ".bin", "tsx"),
    [join(root, "packages", "spec-controller", "src", "cli.ts"), "balance", ...args],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

Given("the canon outcome-side profile OUTCOME_SIDE_PROFILE", function () {
  profile = OUTCOME_SIDE_PROFILE;
  // Totality: the type-forced record keys every Outcome — all ten.
  assert.equal(Object.keys(profile).length, 10, "expected ten outcomes in OUTCOME_SIDE_PROFILE");
});

When(
  "a Quality Check Reconciliation is constructed for each outcome with its canon-correct sides",
  function () {
    constructedPresence = {};
    for (const [outcomeKey, row] of Object.entries(profile)) {
      const outcome = outcomeKey as Outcome;
      const rec = makeQualityCheckReconciliation({
        outcome,
        ...(row.obligation === "Exists" ? { evidenceObligation: sampleObligation } : {}),
        ...(row.observation === "Exists" ? { evidenceObservation: sampleObservation } : {}),
      });
      constructedPresence[outcome] = {
        obligation: rec.evidenceObligation !== undefined,
        observation: rec.evidenceObservation !== undefined,
      };
    }
  },
);

Then("each reconciliation's side-presence matches its canon row", function () {
  for (const [outcomeKey, row] of Object.entries(profile)) {
    const got = constructedPresence[outcomeKey];
    assert.ok(got, `${outcomeKey}: was not constructed`);
    assert.equal(got.obligation, row.obligation === "Exists", `${outcomeKey}: obligation presence`);
    assert.equal(got.observation, row.observation === "Exists", `${outcomeKey}: observation presence`);
  }
});

Then(
  "constructing any outcome with a forbidden side throws — a divergent pair is unconstructible",
  function () {
    for (const [outcomeKey, row] of Object.entries(profile)) {
      const outcome = outcomeKey as Outcome;
      // FLIP the obligation side away from canon — carry it where the row says None, omit it where
      // the row says Exists. A canon-inconsistent pair must be unconstructible.
      assert.throws(
        () =>
          makeQualityCheckReconciliation({
            outcome,
            ...(row.obligation === "Exists" ? {} : { evidenceObligation: sampleObligation }),
            ...(row.observation === "Exists" ? { evidenceObservation: sampleObservation } : {}),
          }),
        `${outcomeKey}: a forbidden obligation side must be unconstructible`,
      );
      // FLIP the observation side away from canon (the mirror).
      assert.throws(
        () =>
          makeQualityCheckReconciliation({
            outcome,
            ...(row.obligation === "Exists" ? { evidenceObligation: sampleObligation } : {}),
            ...(row.observation === "Exists" ? {} : { evidenceObservation: sampleObservation }),
          }),
        `${outcomeKey}: a forbidden observation side must be unconstructible`,
      );
    }
  },
);

Then(
  "when the real tool balances a ten-outcome corpus, every emitted Quality Check Reconciliation's sides match its canon row",
  function () {
    const root = process.cwd();
    for (const p of Object.values(TEN_OUTCOME_CORPUS)) {
      assert.ok(existsSync(join(root, p)), `missing fixture path: ${p}`);
    }
    const result = spawnBalance([
      "--features", TEN_OUTCOME_CORPUS.features,
      "--vitest", TEN_OUTCOME_CORPUS.vitest,
      "--cucumber", TEN_OUTCOME_CORPUS.cucumber,
      "--ci", TEN_OUTCOME_CORPUS.ci,
      "--package-json", TEN_OUTCOME_CORPUS.packageJson,
      "--format", "json",
    ]);
    // The corpus is deliberately out-of-balance AND unsound (it carries a broken proof), so the
    // gate sets a NON-ZERO exit (4). The report JSON is flushed to stdout regardless (the CLI uses
    // process.exitCode, not process.exit) — a non-zero status is EXPECTED here, not a spawn failure.
    assert.ok(
      result.stdout.trim().length > 0,
      `expected report JSON on stdout; stderr was: ${result.stderr}`,
    );
    const report = JSON.parse(result.stdout);
    const emittedOutcomes = new Set<string>();
    for (const sr of report.ledger.scenarioReconciliations) {
      for (const q of sr.qualityCheckReconciliations) {
        const row = OUTCOME_SIDE_PROFILE[q.outcome as Outcome];
        assert.ok(row !== undefined, `emitted QCR carries an unknown outcome: ${q.outcome}`);
        // The artefact the REAL tool emits, checked against canon — the debit/credit PRESENCE of
        // every emitted reconciliation must match its OUTCOME_SIDE_PROFILE row.
        assert.equal(
          q.evidenceObligation !== undefined,
          row.obligation === "Exists",
          `${q.outcome} (scn ${sr.scnId}): emitted obligation side-presence must match canon`,
        );
        assert.equal(
          q.evidenceObservation !== undefined,
          row.observation === "Exists",
          `${q.outcome} (scn ${sr.scnId}): emitted observation side-presence must match canon`,
        );
        emittedOutcomes.add(q.outcome);
      }
    }
    // All ten outcomes are exercised — the corpus spans the whole table.
    assert.equal(
      emittedOutcomes.size,
      10,
      `expected all ten outcomes exercised, got: ${[...emittedOutcomes].sort().join(", ")}`,
    );
  },
);
