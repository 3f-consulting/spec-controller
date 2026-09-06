/**
 * Step definitions for features/scn-tags.feature (the @integration arm of
 * @SCN-STG-001).
 *
 * Anti-watermelon: this drives the REAL `lint:scn-tags` CLI (via tsx) over PLANTED
 * fixture trees under tests/fixtures/ — NEVER a re-run of the @unit fixture logic,
 * and NEVER a real features/ scenario. Over the tier-less fixture it must exit
 * non-zero naming the offending @SCN; over the fully tiered fixture it must exit 0.
 *
 * @SCN-STG-001 — bidirectional evidence marker for features/scn-tags.feature.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// @SCN-STG-001
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI = path.join(
  repoRoot,
  "tests",
  "checks",
  "lintScnTagsCli.ts"
);
const TSX = path.join(repoRoot, "node_modules", ".bin", "tsx");

let exitCode: number;
let output: string;

// @SCN-STG-001
function runGuardOver(featuresDir: string): void {
  const result = spawnSync(TSX, [CLI, "--features", path.join(repoRoot, featuresDir)], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `guard failed to spawn: ${result.error?.message}`);
  exitCode = typeof result.status === "number" ? result.status : 1;
  output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

// @SCN-STG-001
Given("the scn-tags guard", function () {
  // No fixture yet — each When drives the real CLI over a planted tree.
});

When("it runs over a features tree with a tier-less non-@wip scenario", function () {
  runGuardOver("tests/fixtures/scn-tags-tierless/features");
});

Then("it fails, naming the offending scenario", function () {
  assert.equal(
    exitCode,
    1,
    `expected the scn-tags guard to fail (exit 1) over the tier-less tree, but it exited ${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /SCN-TGT-001/,
    `expected the guard to name the offending @SCN (SCN-TGT-001); got:\n${output}`
  );
});

When(
  "it runs over a fully tiered tree where every @SCN scenario names a tier or is @wip",
  function () {
    runGuardOver("tests/fixtures/scn-tags-compliant/features");
  }
);

Then("it passes", function () {
  assert.equal(
    exitCode,
    0,
    `expected the scn-tags guard to pass (exit 0) over the fully tiered tree, but it exited ${exitCode}. Output:\n${output}`
  );
});

// @SCN-STG-002
Given("the scn-tags static check", function () {
  // No fixture yet — each When drives the real CLI over a planted tree.
});

// @SCN-STG-002
When(
  "it runs over a features tree whose @SCN scenario carries a mistyped tier tag",
  function () {
    runGuardOver("tests/fixtures/scn-tags-unrecognised/features");
  }
);

// @SCN-STG-002
Then("it fails, naming the unrecognised tag and the tier it resembles", function () {
  assert.equal(
    exitCode,
    1,
    `expected the scn-tags static check to fail (exit 1) over a tree whose @SCN scenario ` +
      `carries @untit, but it exited ${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /@untit/,
    `expected the offending tag to be NAMED — "something is wrong in this file" is not a ` +
      `usable message; got:\n${output}`
  );
  assert.match(
    output,
    /@unit/,
    `expected the near-miss tier (@unit) to be named alongside @untit; got:\n${output}`
  );
});

// @SCN-STG-003
When(
  "it runs over a features tree whose tiered @SCN scenario also carries a recognised community deferral tag",
  function () {
    runGuardOver("tests/fixtures/scn-tags-community/features");
  }
);

// @SCN-STG-004
When(
  "it runs over a target whose scenario carries a group-prefixed check tag",
  function () {
    runGuardOver("tests/fixtures/scn-tags-group-prefixed/features");
  }
);

// @SCN-STG-004
Then("it fails, naming the bare tag the group-prefixed one should have been", function () {
  assert.equal(
    exitCode,
    1,
    `expected the scn-tags static check to fail (exit 1) over a tree whose @SCN scenario ` +
      `carries @fitness=complexity, but it exited ${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /@fitness=complexity/,
    `expected the offending tag to be NAMED; got:\n${output}`
  );
  assert.match(
    output,
    /@complexity\b/,
    `expected the BARE tag the author wanted (@complexity) to be named — the group is the ` +
      `part that has to go, and telling them only that the tag means nothing here leaves ` +
      `them to work that out; got:\n${output}`
  );
  assert.match(
    output,
    /1 finding\(s\)/,
    `expected the GRAMMAR question to be the whole of the fault — the fixture scenario names ` +
      `@unit, so the floor has no complaint, and a second finding would mean the two ` +
      `questions have bled; got:\n${output}`
  );
});

/**
 * @SCN-STG-005 — drive the real CLI from INSIDE a planted TARGET tree, not just over its
 * features dir. The check-tag set is the target's own registry, and the CLI resolves it from
 * the `package.json` at its cwd exactly as it resolves the deferral tags. Running from
 * repoRoot (as the fixtures above do) would resolve THIS repository's registry, which is empty
 * — so the arm would prove the shape rule against a set the fixture does not control.
 */
// @SCN-STG-005
function runGuardInTarget(targetRoot: string): void {
  const root = path.join(repoRoot, targetRoot);
  const result = spawnSync(TSX, [CLI, "--features", path.join(root, "features")], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, `guard failed to spawn: ${result.error?.message}`);
  exitCode = typeof result.status === "number" ? result.status : 1;
  output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

// @SCN-STG-005
When(
  "it runs over a target whose stepless scenario carries only its registered bare check tag",
  function () {
    runGuardInTarget("tests/fixtures/scn-tags-fitness");
  }
);

// @SCN-STG-005
When(
  "it runs over a target whose stepped scenario carries that same bare check tag and no tier",
  function () {
    runGuardInTarget("tests/fixtures/scn-tags-fitness-stepped");
  }
);

// @SCN-STG-005
When("it runs over that same stepped target with nothing registering its check tag", function () {
  // Byte-for-byte the corpus above; only the manifest differs, so the pair isolates the REGISTRY
  // rather than the tags or the steps. Without it every Then in this scenario reads `it passes`
  // and a correct ruling is indistinguishable from a floor that stopped looking.
  runGuardInTarget("tests/fixtures/scn-tags-fitness-stepped-unregistered");
});

/**
 * @SCN-STG-005's CONVERTED route (3F-3149). A converted check carries one word for the whole
 * axis and its CHARACTERISTIC is on a configured row, so `checkRegistry` names it nowhere and
 * never will — which is why the pair below turns on `specController.fitnessChecks` rather than
 * on the registry the three Whens above turn on.
 */
// @SCN-STG-005
When(
  "it runs over a target whose converted scenarios carry the fitness axis tag, one named by a configured row and one named by none",
  function () {
    // BOTH scenarios in this tree must pass, and the second is the ruling: a converted scenario
    // no row names satisfies THIS floor, because the missing row is @SCN-LNT-020's to report by
    // id and the run reds on it regardless. A fixture carrying only the configured one would
    // green whichever way that call had gone.
    runGuardInTarget("tests/fixtures/scn-tags-converted");
  }
);

// @SCN-STG-005
When("it runs over that same target with no fitness rows configured at all", function () {
  // Byte-for-byte the corpus above; only the manifest differs, so the pair isolates the ROWS.
  // It passes, and that is the second ruling rather than an omission: which words name a CHECK
  // is the target's answer, which axis a scenario is ON is the model's. A floor gating the axis
  // word on the manifest would red here while the obligation rule — which reads the word with no
  // such gate — was naming SCN-TGT-001 and SCN-TGT-002 as scenarios on that very axis.
  runGuardInTarget("tests/fixtures/scn-tags-converted-unconfigured");
});

// @SCN-STG-005
Then("it fails, naming the scenario that named no tier", function () {
  assert.equal(
    exitCode,
    1,
    `expected the scn-tags static check to fail (exit 1) over a tree whose @SCN scenario names ` +
      `no tier and carries no tag the target registers or measures, but it exited ` +
      `${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /SCN-TGT-001/,
    `expected the offending scenario to be NAMED; got:\n${output}`
  );
  assert.match(
    output,
    /names no evidence tier and is not parked/,
    `expected the TIER FLOOR's own finding among them — an unregistered word names no check, ` +
      `so it satisfies nothing and the floor has to say so by name rather than leaving the ` +
      `grammar arm to imply it. Matched on the FINDING line, never the summary above it: the ` +
      `summary lists all three fault kinds, so a bare /no evidence tier/ matches whichever ` +
      `fault fired and would green a floor that had stopped looking; got:\n${output}`
  );
});

/**
 * @SCN-STG-009 — the MEASURED half of the check-tag set, driven from INSIDE each planted
 * target for `runGuardInTarget`'s reason: a measured check is named ONLY in the target's
 * thresholds, so a run from repoRoot would resolve this repository's manifest — which names
 * no ceiling at all — and the arm would prove nothing about whose ceilings were read.
 */
// @SCN-STG-009
When(
  "it runs over a target whose stepless scenarios carry a measured check tag and a registered one",
  function () {
    runGuardInTarget("tests/fixtures/scn-tags-measured");
  }
);

// @SCN-STG-009
When("it runs over that same target with no thresholds configured", function () {
  // Byte-for-byte the corpus above; only the manifest differs, so the pair isolates the
  // thresholds rather than the tags. Its `@complexity` scenario stays admitted throughout,
  // which is what makes this a red on the MEASURED tag alone.
  runGuardInTarget("tests/fixtures/scn-tags-measured-unconfigured");
});

// @SCN-STG-007
When(
  "it runs over a target whose stepless scenario carries two registered bare check tags",
  function () {
    // Driven from INSIDE the planted target, for @SCN-STG-005's reason: the check-tag set is the
    // TARGET's registry, resolved from the package.json at the CLI's cwd. Run from repoRoot it
    // would resolve THIS repository's registry and the fixture's tags would name nothing.
    runGuardInTarget("tests/fixtures/scn-tags-two-checks");
  }
);

// @SCN-STG-007
Then("it fails, naming the scenario and BOTH check tags", function () {
  assert.equal(
    exitCode,
    1,
    `expected the scn-tags static check to fail (exit 1) over a tree whose STEPLESS scenario ` +
      `carries two registered bare check tags, but it exited ${exitCode}. Output:\n${output}`
  );
  assert.match(
    output,
    /SCN-TGT-002/,
    `expected the offending scenario to be NAMED; got:\n${output}`
  );
  // BOTH tags, because the author has to choose which scenario keeps which check, and a message
  // naming one of them has already chosen for them.
  assert.match(output, /@complexity\b/, `expected @complexity to be named; got:\n${output}`);
  assert.match(output, /@typecheck\b/, `expected @typecheck to be named; got:\n${output}`);
  // NOT the behavioural scenario above it, which carries two TIER tags. Two tiers on a stepped
  // scenario is legal and stays legal; a rule that counted tags rather than reading the shape and
  // the registry reds this one too, and the arm has to be able to fail that.
  assert.doesNotMatch(
    output,
    /SCN-TGT-001/,
    `expected the STEPPED scenario carrying two TIER tags to be left alone — two tiers is ` +
      `legal, and this rule is about fitness tags on a stepless scenario; got:\n${output}`
  );
});

// @SCN-STG-007
When(
  "it runs over that same target with one of the two check tags removed",
  function () {
    // The REMEDY, as its own tree — byte-for-byte the sibling above with one tag gone. The pair is
    // what makes the arm load-bearing: red then green over one tag's difference, rather than a
    // single assertion that could pass for any reason.
    runGuardInTarget("tests/fixtures/scn-tags-two-checks-split");
  }
);

/**
 * @SCN-STG-008 — the parking arm, driven from INSIDE each planted target for the reason
 * `runGuardInTarget` names: the parking set is the TARGET's, resolved from the package.json
 * at the CLI's cwd. Run from repoRoot these three would all resolve spec-controller's own
 * config and the arm would prove nothing about whose set it is.
 */
// @SCN-STG-008
When(
  "it runs over a target whose tier-less scenario carries a parking tag the target itself configured",
  function () {
    // `@parked` is in NO starter set — it parks only because this fixture configures it.
    runGuardInTarget("tests/fixtures/scn-tags-parked");
  }
);

// @SCN-STG-008
When("it runs over that same target with the parking tag removed", function () {
  // Byte-for-byte the sibling above with the tag off the tag line; the config is unchanged,
  // so the pair isolates the tag rather than the config.
  runGuardInTarget("tests/fixtures/scn-tags-parked-unparked");
});

// @SCN-STG-008
When(
  "it runs over a target configuring no parking tags whose tier-less scenario carries @wip",
  function () {
    runGuardInTarget("tests/fixtures/scn-tags-parked-default");
  }
);

// @SCN-STG-007
When(
  "it runs over that same target with both check tags kept and the scenario parked",
  function () {
    // Byte-for-byte `scn-tags-two-checks` plus a parking tag. Both checks are still on the one
    // stepless scenario — what changed is that the author has said "not yet", and the rule is
    // out of scope until they say otherwise (operator ruling, 3F-2655).
    runGuardInTarget("tests/fixtures/scn-tags-two-checks-parked");
  }
);

// @SCN-STG-007
When("it runs over that same target with the parking tag taken off again", function () {
  // THE UNPARK, and it is the arm that makes the skip a skip rather than an erasure: this is
  // the SAME tree the first pair reds, reached by removing the parking tag. A rule that could
  // be switched off permanently by one tag would not be worth having.
  runGuardInTarget("tests/fixtures/scn-tags-two-checks");
});

// @SCN-STG-007
When(
  "it runs over a target whose STEPPED scenario carries two registered bare check tags",
  function () {
    // THE RULING (3F-3126): byte-for-byte `scn-tags-two-checks` with steps on the offending row.
    // Same registry, same two tags, same verdict — the fitness axis is named by the registered
    // TAG, not by whether the author wrote a step. This pair reds only because the rule stopped
    // reading shape, which is why it is the one that would have passed before this commit.
    runGuardInTarget("tests/fixtures/scn-tags-two-checks-stepped");
  }
);
