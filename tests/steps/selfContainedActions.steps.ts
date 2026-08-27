/**
 * @integration for features/self-contained-actions.feature — the bundles this repository commits
 * beside its `action.yml` files, run where a caller would run them.
 *
 * @SCN-ACT-001 — the bidirectional evidence marker (Evidence Manifesto §9) on the step block below.
 * Its @unit pin lives in packages/spec-controller/static-checks/actionBundles.test.ts, over the same
 * probes.
 *
 * WHAT THIS ARM ADDS OVER THAT PIN. The pin proves each file runs; this drives all three from one
 * scenario and fails naming every one that did not, which is the reading a caller wiring these
 * actions up actually needs — "one of your three actions is broken" is a different morning from
 * "your actions are broken". It is also the arm that would notice a fourth action arriving with no
 * bundle at all, because it walks the manifest rather than a list of its own.
 *
 * ITS OWN STEP TEXT, EVERY LINE OF IT. Cucumber's step registry is process-wide (3F-2772 is open
 * against exactly this hazard), so every phrase below names a workspace, an action's bundled
 * command, or the work one did — never a bare measurement phrase another file's fixtures would
 * bind to.
 */

import { Given, When, Then, After } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  ACTION_BUNDLES,
  bundleDriftFaultsIn,
  REBUILD_WITH,
  type BundleDriftFault,
} from "../../packages/spec-controller/static-checks/actionBundles.js";
import {
  readActionSources,
  stepCommandFaultsIn,
  type StepCommandFault,
} from "../../packages/spec-controller/static-checks/actionSteps.js";
import {
  BUNDLED_WORK,
  faultRunningBundleBare,
} from "../fixtures/action-bundles/bundledWork.js";
import {
  editTheBundle,
  forgetPlantedTrees,
  plantBundleTree,
  rebuildTheBundle,
  type PlantedBundleTree,
} from "../fixtures/action-bundles/plantedBundleTree.js";
import {
  PLANTED_BINS,
  REACHES_FOR_A_BIN,
  RUNS_WHAT_TRAVELS_WITH_IT,
  type PlantedAction,
} from "../fixtures/action-bundles/plantedActions.js";

/** What each action's bundled command left undone, keyed by the action it travels with. */
let faults: Map<string, string>;

// @SCN-ACT-001
// NOTHING TO PLANT HERE, AND THAT IS THE POINT. The workspace each command runs in is made fresh
// by the probe that runs it — a temporary directory with no `node_modules` anywhere above it,
// which is what a cross-repository `uses:` hands an action and what this checkout cannot be.
Given("a workspace holding neither this package nor anything built from it", function () {
  faults = new Map();
});

// @SCN-ACT-001
When("each action's own bundled command is asked there to do the work it is for", function () {
  for (const probe of BUNDLED_WORK) {
    const entry = ACTION_BUNDLES.find((candidate) => candidate.action === probe.action);
    if (entry === undefined) {
      faults.set(probe.action, "the manifest names no bundle for this action at all");
      continue;
    }
    const fault = faultRunningBundleBare(entry.bundle, probe);
    if (fault !== undefined) faults.set(probe.action, fault);
  }
});

// @SCN-ACT-001
Then("each one does that work, against only the tree it was pointed at", function () {
  // EVERY ONE THAT FAILED, IN ONE READING. Stopping at the first would hide the difference between
  // one action mis-wired and a bundler that never ran, which are the two ways this arrives and the
  // two that want different mornings.
  const named = [...faults].map(([action, fault]) => `  ${action}: ${fault}`).join("\n");
  assert.equal(
    faults.size,
    0,
    `every committed bundle must do its action's own work with nothing installed:\n${named}`,
  );
  // AND THE MANIFEST IS WHAT WAS WALKED. A probe list that had quietly fallen behind would report
  // nothing wrong about an action nobody ran.
  assert.deepEqual(
    BUNDLED_WORK.map((probe) => probe.action).sort(),
    ACTION_BUNDLES.map((entry) => entry.action).sort(),
    "every bundle the manifest names is probed here; a fourth action must not arrive unrun",
  );
});

/** The checkout this scenario planted its actions into, and the actions it planted there. */
let plantedCheckout: string;

/** What the rule said about the tree that was planted. */
let stepFaults: readonly StepCommandFault[];

const plantedCheckouts: string[] = [];

After(function () {
  for (const root of plantedCheckouts.splice(0)) rmSync(root, { recursive: true, force: true });
  forgetPlantedTrees();
});

/** Plant one action's file where a checkout's `.github/actions/` keeps it. */
function plant(action: PlantedAction): void {
  if (plantedCheckout === undefined) {
    plantedCheckout = mkdtempSync(path.join(tmpdir(), "planted-actions-"));
    plantedCheckouts.push(plantedCheckout);
  }
  const at = path.join(plantedCheckout, ".github", "actions", action.action, "action.yml");
  mkdirSync(path.dirname(at), { recursive: true });
  writeFileSync(at, action.yaml, "utf8");
}

// @SCN-ACT-002
// PLANTED AS REAL DIRECTORIES, WHICH IS WHAT THIS ARM ADDS. The @unit pin hands the rule its
// sources; this makes a checkout the discovery has to find them in — the half where a rule right in
// isolation and pointed at the wrong place reports a clean tree it never read.
Given("an action whose step reaches for a bin out of the workspace it is called from", function () {
  plantedCheckout = undefined as unknown as string;
  plant(REACHES_FOR_A_BIN);
});

// @SCN-ACT-002
Given("an action beside it whose step runs the file committed alongside it", function () {
  plant(RUNS_WHAT_TRAVELS_WITH_IT);
});

// @SCN-ACT-002
When("the check reads what each of their steps runs", function () {
  stepFaults = stepCommandFaultsIn(readActionSources(plantedCheckout), PLANTED_BINS);
});

// @SCN-ACT-002
Then(
  "it reds the first, naming the action, the step and the command it objects to",
  function () {
    const found = stepFaults.find((fault) => fault.action === REACHES_FOR_A_BIN.action);
    assert.ok(
      found !== undefined,
      `the step reaching for a bin must red; the check found ${JSON.stringify(stepFaults)}`,
    );
    // ALL THREE TERMS. A red naming only the action sends its reader to open a file and search it,
    // which on these three is several screens of prose about the very route being objected to.
    assert.equal(found.step, "Do the work", "the red names the step");
    assert.ok(
      found.command.includes("widget-persist-measurements"),
      `the red quotes the command it objects to; it quoted ${JSON.stringify(found.command)}`,
    );
    assert.ok(
      found.why.includes("node_modules"),
      `the red says where that bin resolves from; it said ${JSON.stringify(found.why)}`,
    );
  },
);

// @SCN-ACT-002
Then("it says nothing at all about the second", function () {
  assert.deepEqual(
    stepFaults.filter((fault) => fault.action === RUNS_WHAT_TRAVELS_WITH_IT.action),
    [],
    "an action running the file committed beside it draws nothing — including from its own prose",
  );
});

/** The checkout planted for the drift Rule, and what the check said about it. */
let bundleTree: PlantedBundleTree;
let driftFaults: readonly BundleDriftFault[];

// @SCN-ACT-003
Given(
  "an action whose committed bundle was built from the source it travels with",
  async function () {
    // BUILT RATHER THAN WRITTEN OUT, so the starting state is one nobody has let rot and every
    // assertion after this is about the change this scenario makes to it.
    bundleTree = await plantBundleTree();
    driftFaults = await bundleDriftFaultsIn([bundleTree.entry], bundleTree.root);
    assert.deepEqual(
      driftFaults,
      [],
      `a bundle just built from its source draws nothing; the check said ${JSON.stringify(driftFaults)}`,
    );
  },
);

// @SCN-ACT-003
When("that bundle is edited and the check builds the source afresh", async function () {
  editTheBundle(bundleTree);
  driftFaults = await bundleDriftFaultsIn([bundleTree.entry], bundleTree.root);
});

// @SCN-ACT-003
Then("it reds that action, and names how to bring the bundle back into line", function () {
  const found = driftFaults.find((fault) => fault.action === bundleTree.entry.action);
  assert.ok(
    found !== undefined,
    `an edited bundle must red; the check said ${JSON.stringify(driftFaults)}`,
  );
  // THE COMMAND, NOT THE DIFFERENCE. Whoever reads this has never read the bundle and never will.
  assert.ok(
    found.why.includes(REBUILD_WITH),
    `the red says what to type; it said ${JSON.stringify(found.why)}`,
  );
  assert.ok(
    found.why.includes(bundleTree.entry.source),
    `the red names the source it fell behind; it said ${JSON.stringify(found.why)}`,
  );
});

// @SCN-ACT-003
Then("it says nothing once the bundle is built from its source again", async function () {
  await rebuildTheBundle(bundleTree);
  const after = await bundleDriftFaultsIn([bundleTree.entry], bundleTree.root);
  assert.deepEqual(
    after,
    [],
    `a rebuilt bundle draws nothing — without which the red above is only a rule that reds always; the check said ${JSON.stringify(after)}`,
  );
});
