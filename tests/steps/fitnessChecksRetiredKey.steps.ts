/**
 * @SCN-USG-024 step defs — a manifest still carrying `specController.fitnessChecks` is named as
 * carrying a retired key, and the same target without the key reconciles identically.
 *
 * Drives the BUILT CLI over tests/fixtures/usg-fitness-checks-retired — one `@fitness` scenario,
 * one CI step stating that scenario's `@SCN` as its `id:`, and a manifest that ALSO still declares
 * the check the retired way. Both halves are read off runs of that one target: the markdown's
 * retired-key account and the JSON's `summary.retiredKeys` for the name, and a second run against
 * a manifest with the key struck out for the comparison.
 *
 * THE COMPARISON IS THE POINT, AND IT IS WHY THIS IS NOT AN ARM OF @SCN-USG-021. *Named* is what
 * the three keys before it assert. *Changes nothing* is the promise an adopter relies on while
 * their manifest still carries the key, and a conserved exit code alone would hide a changed
 * verdict — so the whole ledger is compared, not the ending.
 * // @SCN-USG-024
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, SPEC_CONTROLLER_ARGV } from "./support/builtCli.js";

const FIXTURE = join(process.cwd(), "tests/fixtures/usg-fitness-checks-retired");

interface RetiredKeyRun {
  status: number | null;
  md: string;
  json: {
    summary: { retiredKeys?: string[]; scenarioReconciliations: { outOfBalance: number } };
    ledger: { scenarioReconciliations: unknown[] };
  };
}

let retiredKeyRun: RetiredKeyRun;

/** One run of the built binary over the fixture, with `--package-json` pointed wherever asked. */
function reconcileWith(packageJson: string): RetiredKeyRun {
  const dir = mkdtempSync(join(tmpdir(), "spec-controller-usg024-"));
  const result = spawnSync(
    NODE,
    [
      ...SPEC_CONTROLLER_ARGV,
      "balance",
      "--features", join(FIXTURE, "features"),
      "--ci", join(FIXTURE, "ci.yml"),
      "--package-json", packageJson,
      "--ci-steps", join(FIXTURE, "ci-steps.json"),
      "--target", "usg-024-fixture",
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
    json: JSON.parse(readFileSync(join(dir, "report.json"), "utf8")) as RetiredKeyRun["json"],
  };
}

// @SCN-USG-024
Given(
  "a target whose manifest still declares its fitness check through specController.fitnessChecks",
  function () {
    // THE PREMISE, ASSERTED FOR ITS SHAPE: the retired key this scenario is about, carrying the
    // entry a consumer would have written. Drift — the fixture losing the key — and the arm would
    // go on passing while asserting nothing.
    const manifest = JSON.parse(readFileSync(join(FIXTURE, "package.json"), "utf8")) as {
      specController: { fitnessChecks?: unknown };
    };
    assert.deepEqual(
      manifest.specController.fitnessChecks,
      [{ scn: "SCN-CVT-001", command: "eslint" }],
      "expected the fixture's manifest to carry exactly the retired key this scenario names"
    );
  }
);

// @SCN-USG-024
Given(
  "that target's corpus carries that check's @fitness scenario, and its CI step states that scenario's @SCN",
  function () {
    // THE TWO ARTEFACTS THAT DO THE DECLARING (3F-3582), read off the fixture's own bytes. Without
    // both, the comparison below could be between two runs that reconcile nothing either way.
    const corpus = readFileSync(join(FIXTURE, "features/target.feature"), "utf8");
    assert.ok(
      corpus.includes("@fitness @SCN-CVT-001"),
      `expected the corpus to carry the @fitness scenario; got:\n${corpus}`
    );
    const ci = readFileSync(join(FIXTURE, "ci.yml"), "utf8");
    assert.ok(
      ci.includes("id: SCN-CVT-001"),
      `expected the pipeline's check step to state the scenario's @SCN; got:\n${ci}`
    );
  }
);

// @SCN-USG-024
When("that target's reconciliation report is rendered from its own manifest", function () {
  retiredKeyRun = reconcileWith(join(FIXTURE, "package.json"));
});

// @SCN-USG-024
Then("the report names specController.fitnessChecks as a key it no longer reads", function () {
  // THE SAME LINE, WORD FOR WORD, AS THE THREE KEYS BEFORE IT — one account, one shape.
  const start = retiredKeyRun.md.indexOf("### Static checks");
  const section = retiredKeyRun.md.slice(start, retiredKeyRun.md.indexOf("\n###", start + 1));
  assert.deepEqual(
    section.split("\n").filter((line) => line.startsWith("- specController.")),
    [
      "- specController.fitnessChecks — retired: this reader no longer reads it, and none of its entries reach the books.",
    ],
    `expected the retired key NAMED on the report. Got:\n${retiredKeyRun.md}`
  );
  assert.deepEqual(
    retiredKeyRun.json.summary.retiredKeys,
    ["fitnessChecks"],
    "expected the JSON's retired-key account to carry the same key the markdown names"
  );
});

// @SCN-USG-024
Then(
  "the same target with the key removed reconciles to the same ledger and the same exit code, naming no retired key",
  function () {
    // THE COMPARISON, not a second claim: the SAME corpus, CI and run record, with one key struck
    // out of a temporary copy of the manifest. Anything the key still reached would show as a diff.
    const manifest = JSON.parse(readFileSync(join(FIXTURE, "package.json"), "utf8")) as {
      specController: Record<string, unknown>;
    };
    delete manifest.specController["fitnessChecks"];
    const dir = mkdtempSync(join(tmpdir(), "spec-controller-usg024-plain-"));
    const plainManifest = join(dir, "package.json");
    writeFileSync(plainManifest, JSON.stringify(manifest, null, 2));

    const plain = reconcileWith(plainManifest);
    assert.deepEqual(
      plain.json.ledger,
      retiredKeyRun.json.ledger,
      "expected the ledger to be identical with and without the retired key — the key is named, never read"
    );
    assert.equal(plain.status, retiredKeyRun.status, "expected the same exit code either way");
    // AND THE RUN IS A VERDICT, NOT A WALL OF MISSING ROWS. Without this, two identically broken
    // runs would satisfy the comparison above.
    assert.equal(
      retiredKeyRun.json.summary.scenarioReconciliations.outOfBalance,
      0,
      `expected the target to balance, so the comparison is between two real verdicts. Got:\n${retiredKeyRun.md}`
    );
    assert.equal(retiredKeyRun.status, 0, `expected exit 0; got ${retiredKeyRun.status}`);
    assert.equal(
      plain.json.summary.retiredKeys,
      undefined,
      `expected no retired-key account at all for a manifest carrying none; got ${JSON.stringify(plain.json.summary.retiredKeys)}`
    );
    assert.ok(
      !plain.md.includes("- specController."),
      `expected no retired-key line in the markdown either; got:\n${plain.md}`
    );
  }
);
