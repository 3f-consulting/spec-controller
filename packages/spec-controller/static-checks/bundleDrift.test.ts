/**
 * @unit for @SCN-ACT-003 — a committed bundle that no longer says what building its source
 * produces, over a planted checkout.
 *
 * THE ONE SANCTIONED COMMITTED BUILD OUTPUT, MECHANISED RATHER THAN HONOURED. `.gitignore` ignores
 * `dist/` with no re-includes precisely so nobody has to remember; the action bundles are carved
 * out of that, and every JS action in the world shipping one can rot the same way — the source is
 * edited, the bundle is not rebuilt, and the step goes on running last month's code while the tree
 * reads as though it were fixed. Intending to rebuild does not stop that. This does.
 *
 * BOTH DIRECTIONS AND BOTH FAULTS. The edited bundle reds and the rebuilt one draws nothing —
 * without the second, a rule that redded everything would pass this file. And absence reds
 * separately from difference, because a bundle nobody built is a step that dies on its first run
 * while a bundle behind its source is a step that runs the wrong code quietly.
 *
 * The @integration arm is tests/steps/selfContainedActions.steps.ts, over the same planted tree.
 */

import { readFileSync } from "node:fs";

import { afterAll, describe, expect, it } from "vitest";

import {
  editTheBundle,
  forgetPlantedTrees,
  plantBundleTree,
  rebuildTheBundle,
  removeTheBundle,
} from "../../../tests/fixtures/action-bundles/plantedBundleTree.js";
import { bundleDriftFaultsIn, REBUILD_WITH } from "./actionBundles.js";

afterAll(forgetPlantedTrees);

describe("[SCN-ACT-003] a committed bundle that no longer matches a fresh build of its source reds the check", () => {
  it("says nothing about a bundle that is exactly what building its source produces", async () => {
    const tree = await plantBundleTree();

    expect(await bundleDriftFaultsIn([tree.entry], tree.root)).toEqual([]);
  });

  it("reds a bundle edited by a single byte, naming the action and how to put it back", async () => {
    const tree = await plantBundleTree();
    editTheBundle(tree);

    const [fault, ...rest] = await bundleDriftFaultsIn([tree.entry], tree.root);

    expect(rest).toEqual([]);
    expect(fault?.action).toBe(tree.entry.action);
    expect(fault?.bundle).toBe(tree.entry.bundle);
    // WHAT TO TYPE, NOT WHAT CHANGED. The reader of this fault has never read the bundle and never
    // will; a byte diff of a 280 kb file tells them nothing they can act on.
    expect(fault?.why).toContain(REBUILD_WITH);
    // AND WHICH SOURCE IT FELL BEHIND, so the fix is checked rather than merely typed.
    expect(fault?.why).toContain(tree.entry.source);
  });

  it("stops redding once the bundle is built from its source again", async () => {
    const tree = await plantBundleTree();
    editTheBundle(tree);
    expect(await bundleDriftFaultsIn([tree.entry], tree.root)).not.toEqual([]);

    await rebuildTheBundle(tree);

    expect(await bundleDriftFaultsIn([tree.entry], tree.root)).toEqual([]);
  });

  it("reds a bundle that is absent altogether, and says so rather than reporting a difference", async () => {
    const tree = await plantBundleTree();
    removeTheBundle(tree);

    const [fault] = await bundleDriftFaultsIn([tree.entry], tree.root);

    expect(fault?.action).toBe(tree.entry.action);
    expect(fault?.why).toContain("nothing is committed");
    expect(fault?.why).toContain(REBUILD_WITH);
  });

  it("rebuilds in memory, leaving the checkout exactly as it found it", async () => {
    const tree = await plantBundleTree();
    editTheBundle(tree);
    const asItStood = readFileSync(`${tree.root}/${tree.entry.bundle}`, "utf8");

    await bundleDriftFaultsIn([tree.entry], tree.root);

    // A CHECK THAT WROTE WOULD BE A CHECK WITH A CLEANUP PATH TO GET WRONG — and one that fixed
    // the drift as a side effect of noticing it would never red twice.
    expect(readFileSync(`${tree.root}/${tree.entry.bundle}`, "utf8")).toBe(asItStood);
  });
});
