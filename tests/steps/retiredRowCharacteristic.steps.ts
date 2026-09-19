/**
 * @SCN-LNT-039 step defs — a characteristic a configured row still carries is named as a retired
 * key, and the row is credited by its own step's outcome exactly as a row carrying none.
 *
 * Drives the BUILT CLI over tests/fixtures/scn-lnt-039 — the scn-lnt-021 target with one row, its
 * characteristic still written on it. Both halves are read off ONE run: the markdown's retired-key
 * account and the JSON's `summary.retiredKeys` for the name, the JSON ledger and the exit code for
 * the credit. The third Then re-runs the SAME target with the word stripped out of a temporary
 * manifest, so "read exactly as a row carrying none" is a comparison rather than a claim.
 * // @SCN-LNT-039
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = join(process.cwd(), "tests/fixtures/scn-lnt-039");

interface CharacteristicRowRun {
  status: number | null;
  md: string;
  json: {
    summary: { retiredKeys?: string[]; scenarioReconciliations: { outOfBalance: number } };
    ledger: { scenarioReconciliations: unknown[] };
  };
}

let run: CharacteristicRowRun;

/** One run of the built binary over the fixture, with `--package-json` pointed wherever asked. */
function reconcileWith(packageJson: string): CharacteristicRowRun {
  const dir = mkdtempSync(join(tmpdir(), "spec-controller-lnt039-"));
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", join(FIXTURE, "features"),
      "--ci", join(FIXTURE, "ci.yml"),
      "--package-json", packageJson,
      "--ci-steps", join(FIXTURE, "ci-steps.json"),
      "--target", "lnt-039-fixture",
      "--source-sha", "0000000000000000000000000000000000000000",
      "--format", `md:${join(dir, "report.md")}`,
      "--format", `json:${join(dir, "report.json")}`,
    ],
    { cwd: dir, encoding: "utf8" }
  );
  assert.equal(result.error, undefined, `CLI failed to spawn: ${result.error?.message}`);
  return {
    status: result.status,
    md: readFileSync(join(dir, "report.md"), "utf8"),
    json: JSON.parse(readFileSync(join(dir, "report.json"), "utf8")) as CharacteristicRowRun["json"],
  };
}

// @SCN-LNT-039
Given("a target whose configured row for its @fitness scenario still carries a characteristic", function () {
  // THE PREMISE, ASSERTED FOR ITS SHAPE: the word this scenario is about, on the row it names.
  const manifest = JSON.parse(readFileSync(join(FIXTURE, "package.json"), "utf8")) as {
    specController: { fitnessChecks: Record<string, unknown>[] };
  };
  assert.deepEqual(
    manifest.specController.fitnessChecks,
    [{ scn: "SCN-CVT-001", characteristic: "complexity", command: "eslint" }],
    "expected the fixture's one row to carry exactly the retired key this scenario names"
  );
});

// @SCN-LNT-039
Given("its CI run's record says that check's step succeeded", function () {
  const record = JSON.parse(readFileSync(join(FIXTURE, "ci-steps.json"), "utf8")) as Record<
    string,
    { outcome?: string }
  >;
  assert.deepEqual(
    Object.entries(record).map(([id, step]) => [id, step.outcome]),
    [
      ["SCN-CVT-001", "success"],
      ["dump-the-step-record", "success"],
    ],
    "expected the check's step to have succeeded, beside the step that wrote the record"
  );
});

// @SCN-LNT-039
When(
  "the characteristic-carrying target's reconciliation report is rendered with the record its own CI run wrote",
  function () {
    run = reconcileWith(join(FIXTURE, "package.json"));
  }
);

// @SCN-LNT-039
Then("the report names the characteristic the row carries as a retired key, with the row it sits on", function () {
  const tail =
    "retired: this reader no longer reads a row's characteristic — one @fitness scenario is one " +
    "check, keyed by its own @SCN — and the row is credited by its step's outcome.";
  const start = run.md.indexOf("### Static checks");
  const section = run.md.slice(start, run.md.indexOf("\n###", start + 1));
  assert.deepEqual(
    section.split("\n").filter((line) => line.startsWith("- specController.")),
    [`- specController.fitnessChecks[SCN-CVT-001].characteristic — ${tail}`],
    `expected the characteristic named with its row. Got:\n${run.md}`
  );
  assert.deepEqual(
    run.json.summary.retiredKeys,
    ["fitnessChecks[SCN-CVT-001].characteristic"],
    "expected the JSON's retired-key account to carry the same key the markdown names"
  );
});

// @SCN-LNT-039
Then(
  "that row is credited by its own step's outcome, its Evidence Obligation reads satisfied, and the run balances at exit 0",
  function () {
    assert.deepEqual(
      run.json.ledger.scenarioReconciliations,
      [
        {
          scnId: "SCN-CVT-001",
          kind: "scenario",
          verdict: "balanced",
          evidenceObligations: [{ qualityCheck: "fitness" }],
          evidenceObservations: [
            {
              qualityCheck: "fitness",
              staticCheck: "SCN-CVT-001",
              scnId: "SCN-CVT-001",
              exists: true,
              enforcedOverRealSource: true,
              status: "passed",
            },
          ],
          qualityCheckReconciliations: [
            {
              qualityCheck: "fitness",
              outcome: "satisfied",
              evidenceObligation: { qualityCheck: "fitness" },
              evidenceObservation: {
                qualityCheck: "fitness",
                staticCheck: "SCN-CVT-001",
                scnId: "SCN-CVT-001",
                exists: true,
                enforcedOverRealSource: true,
                status: "passed",
              },
            },
          ],
          reconcilingItems: [],
          pendingItems: [],
        },
      ],
      `expected the row credited by its own step, as a row carrying no characteristic is. Got ` +
        JSON.stringify(run.json.ledger.scenarioReconciliations)
    );
    assert.equal(run.json.summary.scenarioReconciliations.outOfBalance, 0);
    assert.equal(run.status, 0, `expected the run to balance (exit 0); got ${run.status}`);
  }
);

// @SCN-LNT-039
Then(
  "the same target with the characteristic removed reconciles to the same ledger and the same exit code, naming no retired key",
  function () {
    // THE COMPARISON, not a second claim: the SAME corpus, CI and record, with one key struck out
    // of a temporary copy of the manifest. Anything the word still reached would show as a diff.
    const manifest = JSON.parse(readFileSync(join(FIXTURE, "package.json"), "utf8")) as {
      specController: { fitnessChecks: Record<string, unknown>[] };
    };
    manifest.specController.fitnessChecks = manifest.specController.fitnessChecks.map(
      ({ characteristic: _retired, ...rest }) => rest
    );
    const dir = mkdtempSync(join(tmpdir(), "spec-controller-lnt039-plain-"));
    const plainManifest = join(dir, "package.json");
    writeFileSync(plainManifest, JSON.stringify(manifest, null, 2));

    const plain = reconcileWith(plainManifest);
    assert.deepEqual(
      plain.json.ledger,
      run.json.ledger,
      "expected the ledger to be identical with and without the retired key — the key is named, never read"
    );
    assert.equal(plain.status, run.status, "expected the same exit code either way");
    assert.equal(
      plain.json.summary.retiredKeys,
      undefined,
      `expected no retired-key account at all for rows carrying none; got ${JSON.stringify(plain.json.summary.retiredKeys)}`
    );
    assert.ok(
      !plain.md.includes("- specController."),
      `expected no retired-key line in the markdown either; got:\n${plain.md}`
    );
  }
);
