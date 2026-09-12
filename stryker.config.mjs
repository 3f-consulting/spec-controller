/**
 * Stryker's configuration — the mutated surface, the runner that measures it, and the ONE bar the
 * sweep breaks on (@SCN-FIT-002, 3F-3334).
 *
 * WHY THIS IS `.mjs` AND NOT `.json`. The break threshold below is a rule, and a rule has to carry
 * its reason beside the number it governs. Stryker reads a `.json` config through strict
 * `JSON.parse`, which refuses prose outright — MEASURED on this tree, not reasoned: a `//` line
 * beside `thresholds` ends the run with `Invalid config file "stryker.config.json". File contains
 * invalid JSON`. `stryker.config.mjs` is Stryker's own JavaScript default and takes comments.
 *
 * AND THE `.json` WAS DELETED RATHER THAN LEFT BESIDE THIS FILE. `SUPPORTED_CONFIG_FILE_NAMES` is
 * searched in order and `stryker.config.json` is found before `stryker.config.mjs`, so a tree
 * holding both runs the one nobody is reading and every edit here would be silent. Two config files
 * for one runner is the two-arbiters shape this repository keeps deleting, in its quietest form.
 *
 * WHAT IS NOT RESTATED HERE. Where the `json` reporter writes is Stryker's own default, read by
 * `tests/checks/mutationScore.ts` and stated once there; a second copy of a path is two things
 * keyed by one word, agreeing until the day one is edited.
 */

import { readFileSync } from "node:fs";

/** The fitness row this runner and the ledger both answer to. */
const SCN = "SCN-FIT-002";

/**
 * The break threshold, READ off `package.json`'s `SCN-FIT-002` row rather than typed here — one
 * record, two readers (3F-2765, and @SCN-MUT-022 asserts it off these two real artefacts).
 *
 * THE BAR IS RAISED AS DELIBERATE PROCESS OPTIMISATION, IN ITS OWN COMMIT WITH ITS OWN REASON, AND
 * IS NEVER LOWERED BECAUSE A PUSH WENT RED — lowering a bar in answer to a red PR is the gate
 * certifying the regression it exists to catch.
 *
 * 95 IS NEITHER THE CONVENTION NOR THIS TREE'S OWN MAXIMUM, WHICH IS THE WHOLE OF WHY IT IS 95.
 * The sweep measures 96.53% here — 807 kills of 836 mutants, run at 3F-3334 rather than quoted from
 * the ticket — so a bar seeded there would be self-certification (3F-2286), and the industry's 80
 * would sit 138 kills below what this suite already does: the same blindness the banked 694/697 had
 * (113 kills of head-room) arriving by a third route. 95 is the band THIS REPOSITORY HAD ALREADY
 * AUTHORED, as the `high` it carried before that sweep was taken — a standard the code must clear
 * rather than a number read off the code.
 *
 * AND IT IS THE ONLY THRESHOLD, BECAUSE THE OTHER TWO FAILED NOTHING. `high` and `low` set the
 * reporter's colour bands and trigger no action, so a gate carrying them states a standard it does
 * not enforce — window dressing beside a bar (operator ruling, 2026-09-12). The value 95 survives
 * them by being promoted into the one threshold that ends a run.
 *
 * IT IS A FLOOR UNDER A SUITE THAT COLLAPSES, AND IT IS NOT THE LOST-KILL DETECTOR. Measured: with
 * one kill deliberately removed the sweep still scored 96.4% and Stryker exited 0. A single kill
 * going missing is caught by `pnpm mutation:regression`, per mutant, against the nightly's record —
 * never by this number, at any value a bar could honestly take.
 *
 * IT THROWS RATHER THAN DEFAULTING. A row that lost its bar, or gained an object-shaped one, would
 * otherwise arrive here as `undefined` and Stryker would run with no break at all — a gate that
 * stopped gating and said nothing, which is the exact silence this repository is named for.
 */
function breakThresholdFromTheLedgersOwnRow() {
  const manifest = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  const row = manifest.specController?.fitnessChecks?.find((check) => check.scn === SCN);
  if (typeof row?.atLeast !== "number") {
    throw new Error(
      `stryker.config.mjs: package.json's ${SCN} row carries no numeric \`atLeast\`, so this runner has no bar to break on.`,
    );
  }
  return row.atLeast;
}

export default {
  packageManager: "pnpm",
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  coverageAnalysis: "perTest",
  mutate: [
    "packages/core/src/domain/**/*.ts",
    "!packages/core/src/domain/**/*.test.ts",
    "!packages/core/src/domain/qualityCheckFaultMessages.ts",
  ],
  reporters: ["progress", "clear-text", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  tempDirName: ".stryker-tmp",
  timeoutMS: 30000,
  thresholds: { break: breakThresholdFromTheLedgersOwnRow() },
};
