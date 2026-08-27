/**
 * CLI entry point for the action-bundles static check — `pnpm lint:action-bundles` in CI, over the
 * REAL tree (@SCN-ACT-004).
 *
 * TWO RULES, ONE SCRIPT, BECAUSE THEY ARE ONE CLAIM. A step that runs a file travelling with its
 * action and a bundle that is what building its source produces are not two properties a reader
 * cares about separately: either the thing a caller checks out runs their code, or it does not.
 * Split across two scripts they would be two rows on the ledger for one guarantee, and a tree could
 * sit half-green — a step correctly reaching for a bundle that had rotted six weeks ago.
 *
 * BOTH RULES RUN BEFORE EITHER REPORTS. Stopping at the first would hide the second behind it, and
 * these two fail together on exactly the change that matters: an action rewritten to reach its own
 * directory, by somebody who did not then build the file it now points at.
 *
 * THE `lint:` PREFIX IS REQUIRED, NOT COSMETIC. `runningStaticChecks` observes a package.json
 * script only when its name carries an observed prefix (`lint:` / `guard:`) and a CI `run:` step
 * invokes it. A name outside that set would run here while being invisible to this repository's own
 * ledger — a real quality check kept off the books, which is where a watermelon hides. Named so it
 * IS observed; the bare `@action-bundles` tag on @SCN-ACT-004 is what then keeps it out of the
 * suspense row as an uncited static check.
 *
 * THE BIN NAMES COME FROM THE MANIFEST THAT SHIPS THEM. Which names are a project's bins is that
 * project's own fact, so the rule takes them as an argument and this is the caller that knows them:
 * a list retyped here would agree with `packages/spec-controller/package.json` until the day a bin
 * was renamed, and the rule would then stop noticing the one route it exists to fence.
 */

import { readFileSync } from "node:fs";

import { ACTION_BUNDLES, bundleDriftFaultsIn } from "./actionBundles.js";
import { readActionSources, stepCommandFaultsIn } from "./actionSteps.js";

/** The package whose bins these actions must not reach for. */
const PACKAGE_MANIFEST = "packages/spec-controller/package.json";

/** The bin names that manifest ships. */
function binNames(root: string): string[] {
  const manifest = JSON.parse(readFileSync(`${root}/${PACKAGE_MANIFEST}`, "utf8")) as {
    bin?: Record<string, string>;
  };
  return Object.keys(manifest.bin ?? {});
}

const root = process.cwd();

const sources = readActionSources(root);
const reaching = stepCommandFaultsIn(sources, binNames(root));
const drifted = await bundleDriftFaultsIn(ACTION_BUNDLES, root);

if (reaching.length === 0 && drifted.length === 0) {
  // BOTH COUNTS, BECAUSE THEY ARE NOT THE SAME NUMBER AND THE GAP BETWEEN THEM IS THE RESIDUAL.
  // The step rule reads every action it FINDS under `.github/actions/`; the drift rule rebuilds
  // every bundle ACTION_BUNDLES NAMES. An action added to the tree and not to that list is read by
  // the first and invisible to the second — its step is held to reaching its own directory, and the
  // file it reaches for is never compared against its source. Reporting the manifest's length alone
  // would state coverage of three while four sat there, which is the shape of claim this whole
  // feature exists to refuse. Printed apart, a reader sees the gap the run itself cannot close.
  // 3F-2826 makes it red rather than merely visible.
  console.log(
    `action-bundles lint: OK — each of the ${sources.length} action(s) under .github/actions/ ` +
      `runs a file that travels with it, and each of the ${ACTION_BUNDLES.length} committed ` +
      "bundle(s) is what building its source produces.",
  );
  process.exit(0);
}

console.error(
  `action-bundles lint: FAILED — ${reaching.length + drifted.length} finding(s). A composite ` +
    "action is checked out into the CALLER's workspace, so the only file its step can rely on is " +
    "one committed beside it:",
);
for (const fault of reaching) {
  console.error(`  ${fault.action} — step "${fault.step}": ${fault.why}`);
  console.error(`    the command: ${fault.command}`);
}
for (const fault of drifted) {
  console.error(`  ${fault.action} — ${fault.why}`);
}
process.exit(1);
