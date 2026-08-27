/**
 * THE BUILDER — `pnpm build:action-bundles`, which writes every file `ACTION_BUNDLES` names
 * (@SCN-ACT-001).
 *
 * WHAT IT WRITES IS COMMITTED, WHICH IS THE EXCEPTION AND NOT THE RULE. This repository ignores
 * `dist/` with no re-includes, because a build output in a diff is a build output somebody reads as
 * source. A composite action is the one place that cannot hold: `${{ github.action_path }}` is the
 * only directory such an action can rely on having, the checkout beside it is the CALLER's tree, and
 * the caller's tree is precisely what a library must not have opinions about. So the bundle travels
 * with the action, and `.gitignore` carves the exception out at exactly those paths.
 *
 * AND BECAUSE IT IS COMMITTED, IT CAN ROT — which is what `lint:action-bundles` exists for. Nothing
 * about running this command by hand makes the tree honest; what makes it honest is the check that
 * rebuilds each committed bundle and reds on any difference. This is the command that check's red
 * tells its reader to type, and it is the only thing that should ever write these files.
 *
 * IT REPORTS EVERY ENTRY AND ITS SIZE. A bundler that inlined nothing is not loud — it succeeds,
 * quickly, and produces a small file — so the size is the one number a reader can sanity-check the
 * run against without opening the output.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ACTION_BUNDLES, bundledSourceOf } from "./actionBundles.js";

// The workspace this was invoked from. A root taken from where this FILE sits agrees with its
// caller only for as long as it sits beside that caller's code — the argument `reconcile.ts` makes
// at length, and the reason every path in the manifest is repository-relative.
const root = process.cwd();

for (const entry of ACTION_BUNDLES) {
  const bundled = await bundledSourceOf(entry, root);
  const at = path.join(root, entry.bundle);
  // The action's own `dist/` is not there on a fresh clone of a tree that has never built these,
  // so the first thing to write into it is the thing that creates it.
  mkdirSync(path.dirname(at), { recursive: true });
  writeFileSync(at, bundled, "utf8");
  console.log(
    `action bundles: ${entry.action} — ${entry.bundle} written from ${entry.source} ` +
      `(${(Buffer.byteLength(bundled, "utf8") / 1024).toFixed(1)} kb).`,
  );
}
