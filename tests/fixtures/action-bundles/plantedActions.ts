/**
 * PLANTED ACTIONS — the trees @SCN-ACT-002 and @SCN-ACT-003 hold the check against.
 *
 * THE CHECK IS HELD AGAINST EXAMPLES AND THE REPOSITORY IS HELD AGAINST THE CHECK, which is the
 * split the feature's three Rules are drawn along. Nothing here is any of this repository's own
 * actions: a check proved only over the tree it ships beside is a check that has never been shown
 * to red, and the day it stops redding nothing notices. So the offending shapes are written out.
 *
 * EVERY ONE OF THEM CARRIES SHELL COMMENTS, AND THAT IS DELIBERATE. A composite action's `run:` is
 * a script, and this repository's own three argue at length inside theirs about the very route the
 * rule forbids — one of them spends a paragraph on why `npx --no` was reached for and what the `--`
 * after it does. A rule reading the block's raw text would red every one of those paragraphs, which
 * makes it a spell-checker rather than a check. The clean action below says the forbidden words in
 * prose and does the right thing in its command, and it is the fixture that tells the two apart.
 */

/** One action's file, as this fixture writes it. */
export interface PlantedAction {
  /** The directory name it is planted under, inside `.github/actions/`. */
  readonly action: string;
  /** The `action.yml`'s own bytes. */
  readonly yaml: string;
}

/**
 * The bin names a planted tree's package ships — the ones the rule holds against a step's commands.
 *
 * STATED BY THE FIXTURE RATHER THAN READ OFF THIS REPOSITORY'S OWN MANIFEST. Which names are a
 * project's bins is a fact about that project, and a rule reading them from wherever it happens to
 * be installed would hold a consumer's actions against spec-controller's names.
 */
export const PLANTED_BINS: readonly string[] = [
  "widget-persist-measurements",
  "widget-restore-measurements",
];

/**
 * The offender: its step reaches for a bin, which resolves out of the CALLER's `node_modules` — and
 * on a cross-repository `uses:` the caller's tree has neither the package nor the `dist/` its bin
 * points into.
 */
export const REACHES_FOR_A_BIN: PlantedAction = {
  action: "reaches-for-a-bin",
  yaml: `name: Reaches for a bin
description: The shape the defect came in by.
runs:
  using: composite
  steps:
    - name: Do the work
      shell: bash
      run: |
        set -euo pipefail
        # The bin resolves from the workspace, which is the caller's and not ours.
        npx --no -- widget-persist-measurements \\
          --to "\${RUNNER_TEMP}/measurements.json"
`,
};

/**
 * The second offender: no bin name anywhere, and still not self-contained — its step runs a file by
 * a sibling-repository path, which is neither committed nor present in a caller's checkout.
 *
 * THE SHAPE THAT LOOKS LIKE THE FIX. Swapping `npx` for `node` reads as having addressed the
 * problem, and a rule that only knew bin names would agree.
 */
export const RUNS_A_FILE_FROM_ELSEWHERE: PlantedAction = {
  action: "runs-a-file-from-elsewhere",
  yaml: `name: Runs a file from elsewhere
description: The near-miss.
runs:
  using: composite
  steps:
    - name: Do the work
      shell: bash
      run: |
        set -euo pipefail
        node packages/widget/dist/measurements/persistCli.js --to "\${RUNNER_TEMP}/measurements.json"
`,
};

/**
 * The clean action: it runs the file committed beside it, reached through the one directory a
 * composite action can rely on having.
 *
 * AND IT SAYS THE FORBIDDEN WORDS OUT LOUD IN ITS COMMENTS, which is the whole reason it is here.
 * This repository's own actions reason about `npx --no` and about the bins inside their `run:`
 * blocks, and they must go on being able to.
 */
export const RUNS_WHAT_TRAVELS_WITH_IT: PlantedAction = {
  action: "runs-what-travels-with-it",
  yaml: `name: Runs what travels with it
description: The shape a caller can actually use.
runs:
  using: composite
  steps:
    - name: Do the work
      shell: bash
      run: |
        set -euo pipefail
        # This used to be \`npx --no -- widget-persist-measurements\`, which resolved the bin out of
        # the caller's node_modules — a tree a cross-repository \`uses:\` does not have. The \`--\`
        # after \`npx\` was load-bearing and is one more thing that is now gone.
        node "\${{ github.action_path }}/dist/runs-what-travels-with-it.mjs" \\
          --to "\${RUNNER_TEMP}/measurements.json"
    - name: Hand it on
      uses: actions/upload-artifact@v7
      with:
        name: measurements
        path: "\${RUNNER_TEMP}/measurements.json"
`,
};

/** The offending pair and the clean one, in the order a reading of them makes sense. */
export const PLANTED_ACTIONS: readonly PlantedAction[] = [
  REACHES_FOR_A_BIN,
  RUNS_A_FILE_FROM_ELSEWHERE,
  RUNS_WHAT_TRAVELS_WITH_IT,
];
