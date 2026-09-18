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
 * WHAT IS NOT RESTATED HERE. The `json` reporter writes to Stryker's own default path, beside the
 * HTML report under `reports/mutation/`, which the nightly uploads whole. Nothing in this repository
 * reads it back any more: the score producer that did left at 3F-3505, because the push now reads
 * the sweep's verdict rather than its number.
 */

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
  /**
   * The break threshold, STATED HERE — Stryker's own documented shape for a mutation gate, and the
   * only bar this sweep answers to (3F-3483).
   *
   * THE BAR IS RAISED AS DELIBERATE PROCESS OPTIMISATION, IN ITS OWN COMMIT WITH ITS OWN REASON,
   * AND IS NEVER LOWERED BECAUSE A PUSH WENT RED — lowering a bar in answer to a red PR is the gate
   * certifying the regression it exists to catch.
   *
   * 95 IS NEITHER THE CONVENTION NOR THIS TREE'S OWN MAXIMUM, WHICH IS THE WHOLE OF WHY IT IS 95.
   * The sweep measures 96.53% here — 807 kills of 836 mutants, run at 3F-3334 rather than quoted
   * from the ticket — so a bar seeded there would be self-certification (3F-2286), and the
   * industry's 80 would sit 138 kills below what this suite already does: the same blindness the
   * banked 694/697 had (113 kills of head-room) arriving by a third route. 95 is the band THIS
   * REPOSITORY HAD ALREADY AUTHORED, as the `high` it carried before that sweep was taken — a
   * standard the code must clear rather than a number read off the code.
   *
   * AND IT IS THE ONLY THRESHOLD, BECAUSE THE OTHER TWO FAILED NOTHING. `high` and `low` set the
   * reporter's colour bands and trigger no action, so a gate carrying them states a standard it
   * does not enforce — window dressing beside a bar (operator ruling, 2026-09-12). The value 95
   * survives them by being promoted into the one threshold that ends a run.
   *
   * IT IS A FLOOR UNDER A SUITE THAT COLLAPSES, AND IT DETECTS NO LOST KILL. Measured: with one
   * kill deliberately removed the sweep still scored 96.4% and Stryker exited 0, so a single kill
   * going missing is invisible to this number at any value a bar could honestly take.
   *
   * NOTHING CATCHES THAT NOW, AND IT IS SAID HERE RATHER THAN LEFT TO BE FOUND (3F-3457). A
   * per-mutant comparison against the nightly's record used to, on every push; it cost 50s of every
   * CI run, and a per-push per-mutant comparison is ours rather than the community's, so it and the
   * whole `@MRG` loop were retired. This threshold is what gates mutation now — Stryker's own
   * documented shape — and the lost-kill class it cannot see is an accepted residual, not an
   * oversight.
   */
  thresholds: { break: 95 },
};
