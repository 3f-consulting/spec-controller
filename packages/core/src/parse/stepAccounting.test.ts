/**
 * Unit tests for THE ACCOUNTING IDENTITY (@SCN-USG-018) — how many steps this run read, what
 * became of each of them, and whether the four dispositions add back up to the total.
 *
 * WHAT IS PINNED HERE IS TOTALITY, and it is the one claim on this axis that no other file can
 * hold. Every scenario beside it watches a step ARRIVE somewhere — on the books, in the runner
 * cut, in the reconciler's two lines, in the excluded list — and a removal-shaped fault arrives
 * nowhere: a filter that drops a step on a branch nobody enumerated posts no row, names no step
 * and reds no assertion, because what it did was to not happen. Only a count of the population
 * against the dispositions sees an absence like that.
 *
 * NOT THE PROVENANCE CENSUS beside it (@SCN-USG-020). That one asserts WHICH files and WHICH jobs
 * the steps came from; this one asserts that none of them went missing on the way. A reader
 * satisfies either alone — a correct sum over a scope it never names, or a named scope whose
 * numbers do not add up.
 *
 * THE SEAMS ARE THE PRODUCT'S OWN, NEVER STAND-INS. The arms below hand this reader the real
 * `reconcilerSteps` and `stepExclusions` answers rather than predicates written here, because a
 * hand-rolled seam would make these arms agree with themselves about a composition the product
 * never uses — and the composition is precisely what the identity is over.
 *
 * ITS OWN FILE for the reason `discoveryScope.test.ts` and `stepExclusions.test.ts` are:
 * `runningStaticChecks.test.ts` sits near the 400-line `max-lines` ceiling, and an exception
 * excuses debt rather than buying headroom.
 *
 * Parent: @SCN-USG-018.
 */

import { describe, it, expect } from "vitest";
import { stepAccounting } from "./stepAccounting.js";
import { reconcilerSteps } from "./reconcilerSteps.js";
import { stepExclusions } from "./stepExclusions.js";
import { runningStaticChecks } from "./runningStaticChecks.js";
import type { CiWorkflowStep, PackageJsonScripts } from "./checkScriptsRunInCI.js";

/**
 * ONE JOB HOLDING ALL FOUR DISPOSITIONS — two steps the manifest calls non-checks, one running the
 * runner it names, two candidate checks (one of them an action), and the reconciler's own pair.
 */
const CI_YML = [
  "jobs:",
  "  ci:",
  "    steps:",
  "      - uses: actions/checkout@v4",
  "      - name: Install",
  "        run: pnpm install --frozen-lockfile",
  "      - name: Unit tests",
  "        run: pnpm test",
  "      - name: Sweep check",
  "        run: pnpm lint:sweep",
  "      - uses: github/codeql-action/analyze@v3",
  "      - name: Dump this run's step record",
  "        env:",
  "          STEPS_JSON: ${{ toJSON(steps) }}",
  "        run: pnpm lint:dump",
  "      - name: Self-reconciliation balance",
  "        run: pnpm lint:reconcile",
].join("\n");

/** A second workflow, so an accounting that read only the first is visible as a shortfall. */
const NIGHTLY_YML = [
  "jobs:",
  "  sweep:",
  "    steps:",
  "      - name: Depth check",
  "        run: pnpm lint:depth",
  "      - name: Audit",
  "        run: pnpm audit --audit-level=high",
].join("\n");

/** A pipeline whose every step something takes out — the job that contributes nothing. */
const RELEASE_YML = [
  "jobs:",
  "  publish:",
  "    steps:",
  "      - name: Build",
  "        run: pnpm build",
  "      - name: Publish",
  "        run: pnpm publish --access public",
].join("\n");

const SCRIPTS: PackageJsonScripts = {
  scripts: {
    test: "vitest run",
    build: "tsc -b",
    "lint:sweep": "madge --circular",
    "lint:depth": "depcruise src",
    "lint:dump": 'printf "%s" "$STEPS_JSON" > ci-steps.json',
    "lint:reconcile": "spec-controller balance --features features --ci ci.yml",
  },
};

/** How this tool is invoked to reconcile — the application layer's fact, as the edge supplies it. */
const INVOCATION = "spec-controller balance";

const UNIT_RUNNER: Readonly<Record<string, string | null>> = { unit: "vitest" };
const NO_RUNNERS: Readonly<Record<string, string | null>> = {};

/** The product's own reconciler seam over these sources — never a predicate written here. */
const reconcilerOver = (
  sources: readonly string[],
  names: readonly string[]
): ((step: CiWorkflowStep) => boolean) =>
  reconcilerSteps(sources, names, INVOCATION, SCRIPTS).isReconciler;

/** The product's own exclusion seam over these sources, for the same reason. */
const notChecksOver = (
  sources: readonly string[],
  names: readonly string[],
  entries: readonly string[]
): ((step: CiWorkflowStep) => boolean) => stepExclusions(sources, names, entries).isExcluded;

// ---------------------------------------------------------------------------
// @SCN-USG-018 — THE FOUR DISPOSITIONS, AND THE TOTAL THEY HAVE TO COME BACK TO.
// ---------------------------------------------------------------------------
describe("[SCN-USG-018] stepAccounting — every step read, accounted for as exactly one thing", () => {
  it("counts each disposition and adds them back up to the steps it read", () => {
    expect(
      stepAccounting(
        [CI_YML],
        SCRIPTS,
        UNIT_RUNNER,
        reconcilerOver([CI_YML], ["ci.yml"]),
        notChecksOver([CI_YML], ["ci.yml"], [
          "ci.yml:ci:actions/checkout@v4",
          "ci.yml:ci:Install",
        ])
      )
    ).toEqual({
      stepsRead: 7,
      candidates: 2,
      runners: 1,
      reconciler: 2,
      excluded: 2,
      // THE SUM IS THIS READER'S, WRITTEN OUT RATHER THAN ADDED HERE. An arm that totalled the
      // four figures itself would agree with any four numbers the reader happened to produce.
      accountedFor: 7,
    });
  });

  it("reads every workflow it was given, not the first of them", () => {
    const account = stepAccounting(
      [CI_YML, NIGHTLY_YML],
      SCRIPTS,
      UNIT_RUNNER,
      reconcilerOver([CI_YML, NIGHTLY_YML], ["ci.yml", "nightly.yml"]),
      notChecksOver([CI_YML, NIGHTLY_YML], ["ci.yml", "nightly.yml"], ["ci.yml:ci:Install"])
    );
    // Nine steps across two files, and the second workflow's two are candidates like any other.
    expect(account).toEqual({
      stepsRead: 9,
      candidates: 5,
      runners: 1,
      reconciler: 2,
      excluded: 1,
      accountedFor: 9,
    });
  });

  it("counts a step that is both a runner and a named non-check once, never twice", () => {
    const account = stepAccounting(
      [CI_YML],
      SCRIPTS,
      UNIT_RUNNER,
      reconcilerOver([CI_YML], ["ci.yml"]),
      notChecksOver([CI_YML], ["ci.yml"], ["ci.yml:ci:Unit tests", "ci.yml:ci:Install"])
    );
    // THE OVERLAP IS THE POINT. The consumer named their own test step a non-check, so it is both
    // things at once; counted under each, the account would claim eight dispositions over seven
    // steps and a reader would read a surplus as though it were health.
    expect(account).toEqual({
      stepsRead: 7,
      candidates: 3,
      runners: 0,
      reconciler: 2,
      excluded: 2,
      accountedFor: 7,
    });
  });

  it("counts a step that is both the reconciler and a named non-check once, as the reconciler", () => {
    const account = stepAccounting(
      [CI_YML],
      SCRIPTS,
      UNIT_RUNNER,
      reconcilerOver([CI_YML], ["ci.yml"]),
      notChecksOver([CI_YML], ["ci.yml"], ["ci.yml:ci:Self-reconciliation balance"])
    );
    // THE SAME OVERLAP FROM THE OTHER SIDE, and the precedence is the composition's: the exclusion
    // seam asks the reconciler first, so a step that is both is the reconciler and is not also an
    // entry of the consumer's list.
    expect(account).toEqual({
      stepsRead: 7,
      candidates: 4,
      runners: 1,
      reconciler: 2,
      excluded: 0,
      accountedFor: 7,
    });
  });

  it("takes the candidate figure from the observer rather than re-deriving the rule", () => {
    const notChecks = notChecksOver([CI_YML], ["ci.yml"], ["ci.yml:ci:Install"]);
    const isReconciler = reconcilerOver([CI_YML], ["ci.yml"]);
    const account = stepAccounting([CI_YML], SCRIPTS, UNIT_RUNNER, isReconciler, notChecks);
    // WHAT THE BOOKS ACTUALLY HOLD. A reader answering "how many became candidates" out of its own
    // reading of the membership rule would go on agreeing with the report while the observer
    // beneath it posted something else — the one disagreement a reader of a total cannot see.
    expect(account.candidates).toBe(
      runningStaticChecks(
        [CI_YML],
        SCRIPTS,
        UNIT_RUNNER,
        () => null,
        (step) => isReconciler(step) || notChecks(step)
      ).length
    );
  });

  it("accounts for a job every step of which something took out", () => {
    expect(
      stepAccounting(
        [RELEASE_YML],
        SCRIPTS,
        NO_RUNNERS,
        reconcilerOver([RELEASE_YML], ["release.yml"]),
        notChecksOver([RELEASE_YML], ["release.yml"], [
          "release.yml:publish:Build",
          "release.yml:publish:Publish",
        ])
      )
    ).toEqual({
      stepsRead: 2,
      candidates: 0,
      runners: 0,
      reconciler: 0,
      excluded: 2,
      // NOTHING REACHED THE BOOKS AND THE ACCOUNT STILL BALANCES. A job contributing nothing is a
      // job the reader ranged over, and "no candidates" is not the same fact as "no steps".
      accountedFor: 2,
    });
  });

  it("accounts for every step of a pipeline whose manifest has named nothing", () => {
    expect(
      stepAccounting(
        [NIGHTLY_YML],
        SCRIPTS,
        NO_RUNNERS,
        reconcilerOver([NIGHTLY_YML], ["nightly.yml"]),
        notChecksOver([NIGHTLY_YML], ["nightly.yml"], [])
      )
    ).toEqual({
      stepsRead: 2,
      candidates: 2,
      runners: 0,
      reconciler: 0,
      excluded: 0,
      accountedFor: 2,
    });
  });

  it("accounts for nothing where the run read no CI configuration", () => {
    expect(
      stepAccounting([], SCRIPTS, UNIT_RUNNER, reconcilerOver([], []), notChecksOver([], [], []))
    ).toEqual({
      stepsRead: 0,
      candidates: 0,
      runners: 0,
      reconciler: 0,
      excluded: 0,
      accountedFor: 0,
    });
  });
});
