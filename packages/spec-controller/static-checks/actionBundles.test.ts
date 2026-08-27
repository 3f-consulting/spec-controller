/**
 * @unit for @SCN-ACT-001 — every bundle this repository commits beside an `action.yml` does that
 * action's own work somewhere nothing has been installed.
 *
 * THE ONE THING THE REST OF THIS SLICE STRUCTURALLY CANNOT SEE. Everything else under
 * `lint:action-bundles` reads FILES: it parses an `action.yml` and says the step names no bin, and
 * it rebuilds a bundle and says the bytes match. Both of those pass over a bundle that inlined
 * nothing, because both of them agree with themselves. Only running the file answers the question
 * the defect was actually about — whether the thing a caller checks out can run — and the only
 * place it can be honestly asked is a directory with no `node_modules` anywhere above it.
 *
 * THE BAR IS THE COMMAND'S OWN WORK AND NOT ITS EXIT CODE, and the fixture beside this holds it:
 * `tests/fixtures/action-bundles/bundledWork.ts`. A bundle handed a flag it does not understand
 * ends non-zero, and so does one that could not resolve a dependency; a bundle that ends cleanly
 * having read nothing is worse than either, because it reads as working. So each probe plants the
 * tree its command reads and asserts what is on disk afterwards.
 *
 * The @integration arm is tests/steps/selfContainedActions.steps.ts, over the same three bundles
 * through the same probes.
 */

import { describe, expect, it } from "vitest";

import { BUNDLED_WORK, faultRunningBundleBare } from "../../../tests/fixtures/action-bundles/bundledWork.js";
import { ACTION_BUNDLES } from "./actionBundles.js";

/** The committed bundle the manifest files under `action`, insisted on rather than looked for. */
function bundleFor(action: string): string {
  const entry = ACTION_BUNDLES.find((candidate) => candidate.action === action);
  if (entry === undefined) {
    throw new Error(`ACTION_BUNDLES names no bundle for ${action}; the probes and the manifest disagree`);
  }
  return entry.bundle;
}

describe("[SCN-ACT-001] a bundled CLI does its own work in a tree with nothing installed", () => {
  // EVERY ENTRY, DRIVEN OFF THE MANIFEST. A list written here would be a second answer to which
  // files are action bundles, and the two would agree until the day an action was added — which is
  // the day the new one silently stops being run at all.
  it.each(BUNDLED_WORK.map((probe) => [probe.action, probe] as const))(
    "%s does its own work with nothing installed above it",
    (action, probe) => {
      expect(faultRunningBundleBare(bundleFor(action), probe)).toBeUndefined();
    },
  );

  it("covers every bundle the manifest names, so a fourth action cannot arrive unprobed", () => {
    expect(BUNDLED_WORK.map((probe) => probe.action).sort()).toEqual(
      ACTION_BUNDLES.map((entry) => entry.action).sort(),
    );
  });
});
