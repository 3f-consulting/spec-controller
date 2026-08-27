/**
 * A PLANTED CHECKOUT holding one action, the source its bundle is built from, and that bundle —
 * the tree @SCN-ACT-003 holds the drift rule against.
 *
 * PLANTED RATHER THAN THIS REPOSITORY'S OWN, for the reason the whole feature is split along: a
 * drift rule proved only over a tree that has never drifted has never been shown to red, and the
 * day it stops redding nothing notices. Here the drift is made on purpose, watched, and undone.
 *
 * THE SOURCE IS TWO FILES, NOT ONE, so the bundle has something to inline and a rebuild has
 * something to do. A single-file source would bundle to very nearly itself, and a rule comparing
 * bytes would then be indistinguishable from one comparing the source against a copy of itself.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  bundledSourceOf,
  type ActionBundle,
} from "../../../packages/spec-controller/static-checks/actionBundles.js";

/** A checkout planted for one action, and the manifest entry naming its parts. */
export interface PlantedBundleTree {
  /** The checkout's own directory. */
  readonly root: string;
  /** The one entry a check reading this tree is given. */
  readonly entry: ActionBundle;
}

/** The entry every planted tree is built around. */
const PLANTED_ENTRY: ActionBundle = {
  action: "planted",
  source: "src/tool.ts",
  bundle: ".github/actions/planted/dist/planted.mjs",
};

/** What the planted source is, across the two files it is spread over. */
const PLANTED_SOURCE: ReadonlyMap<string, string> = new Map([
  [
    "src/tool.ts",
    'import { workDone } from "./work.js";\n\nconsole.log(workDone("planted"));\n',
  ],
  [
    "src/work.ts",
    "export function workDone(of: string): string {\n  return `${of}: the work is done`;\n}\n",
  ],
]);

const plantedRoots: string[] = [];

/** Write `contents` at `at`, making whatever parent directories it needs on the way. */
function write(at: string, contents: string): void {
  mkdirSync(path.dirname(at), { recursive: true });
  writeFileSync(at, contents, "utf8");
}

/**
 * Plant a checkout whose committed bundle is exactly what building its source produces.
 *
 * The starting state is the honest one — a tree nobody has let rot — so every assertion after this
 * is about the change the test makes to it.
 */
export async function plantBundleTree(): Promise<PlantedBundleTree> {
  const root = mkdtempSync(path.join(tmpdir(), "planted-bundle-"));
  plantedRoots.push(root);
  for (const [at, contents] of PLANTED_SOURCE) write(path.join(root, at), contents);
  const tree = { root, entry: PLANTED_ENTRY };
  await rebuildTheBundle(tree);
  return tree;
}

/** Build the tree's bundle from its source, as its owner would. */
export async function rebuildTheBundle(tree: PlantedBundleTree): Promise<void> {
  write(path.join(tree.root, tree.entry.bundle), await bundledSourceOf(tree.entry, tree.root));
}

/**
 * Let the tree rot: edit the committed bundle so it no longer says what its source produces.
 *
 * ONE BYTE, DELIBERATELY. Real rot is a source edited and a bundle not rebuilt, which is a much
 * bigger difference — so a rule that catches the smallest possible change catches that too, and a
 * rule that only caught the big one would be a rule with a threshold nobody chose.
 */
export function editTheBundle(tree: PlantedBundleTree): void {
  const at = path.join(tree.root, tree.entry.bundle);
  writeFileSync(at, `${readFileSync(at, "utf8")}\n`, "utf8");
}

/** Take the committed bundle away entirely — the other shape of a bundle that is not its source. */
export function removeTheBundle(tree: PlantedBundleTree): void {
  rmSync(path.join(tree.root, tree.entry.bundle), { force: true });
}

/** Forget every tree planted so far. */
export function forgetPlantedTrees(): void {
  for (const root of plantedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
}
