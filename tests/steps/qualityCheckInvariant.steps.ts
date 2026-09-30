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
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const EVERY_OUTCOME_CORPUS = {
  features: "tests/fixtures/every-outcome-corpus/features",
  vitest: "tests/fixtures/every-outcome-corpus/vitest.json",
  cucumber: "tests/fixtures/every-outcome-corpus/cucumber.json",
  ci: "tests/fixtures/every-outcome-corpus/ci.yml",
  packageJson: "tests/fixtures/every-outcome-corpus/package.json",
};

const sampleObligation: EvidenceObligation = { qualityCheck: "unit" };
const sampleObservation: EvidenceObservation = {
  qualityCheck: "unit",
  scnId: "SCN-LDG-030",
  status: "passed",
};

let profile: typeof OUTCOME_SIDE_PROFILE;
let constructedPresence: Record<string, { obligation: boolean; observation: boolean }> = {};

function spawnBalance(args: string[]): SpawnSyncReturns<string> {
  const root = process.cwd();
  const result = spawnSync(
    NODE,
    [...SPEC_CONTROLLER_ARGV, "balance", ...args],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return result;
}

Given("the canon outcome-side profile OUTCOME_SIDE_PROFILE", function () {
  profile = OUTCOME_SIDE_PROFILE;
  assert.equal(Object.keys(profile).length, 11, "expected eleven outcomes in OUTCOME_SIDE_PROFILE");
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
      assert.throws(
        () =>
          makeQualityCheckReconciliation({
            outcome,
            ...(row.obligation === "Exists" ? {} : { evidenceObligation: sampleObligation }),
            ...(row.observation === "Exists" ? { evidenceObservation: sampleObservation } : {}),
          }),
        `${outcomeKey}: a forbidden obligation side must be unconstructible`,
      );
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

function outcomesCheckedAgainstCanon(report: {
  ledger: { scenarioReconciliations: { scnId: string; qualityCheckReconciliations: { outcome: string; evidenceObligation?: unknown; evidenceObservation?: unknown }[] }[] };
}): Set<string> {
  const emittedOutcomes = new Set<string>();
  for (const sr of report.ledger.scenarioReconciliations) {
    for (const q of sr.qualityCheckReconciliations) {
      const row = OUTCOME_SIDE_PROFILE[q.outcome as Outcome];
      assert.ok(row !== undefined, `emitted QCR carries an unknown outcome: ${q.outcome}`);
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
  return emittedOutcomes;
}

Then(
  "when the real tool balances a corpus that exercises every outcome, every emitted Quality Check Reconciliation's sides match its canon row",
  function () {
    const root = process.cwd();
    for (const p of Object.values(EVERY_OUTCOME_CORPUS)) {
      assert.ok(existsSync(join(root, p)), `missing fixture path: ${p}`);
    }
    const result = spawnBalance([
      "--features", EVERY_OUTCOME_CORPUS.features,
      "--vitest", EVERY_OUTCOME_CORPUS.vitest,
      "--cucumber", EVERY_OUTCOME_CORPUS.cucumber,
      "--ci", EVERY_OUTCOME_CORPUS.ci,
      "--package-json", EVERY_OUTCOME_CORPUS.packageJson,
      "--format", "json",
    ]);
    assert.ok(
      result.stdout.trim().length > 0,
      `expected report JSON on stdout; stderr was: ${result.stderr}`,
    );
    const emittedOutcomes = outcomesCheckedAgainstCanon(JSON.parse(result.stdout));
    const missingOutcomes = Object.keys(OUTCOME_SIDE_PROFILE).filter((o) => !emittedOutcomes.has(o));
    assert.deepEqual(
      missingOutcomes,
      [],
      `expected every outcome exercised; not emitted: ${missingOutcomes.join(", ")}`,
    );
  },
);
