/**
 * @unit for @SCN-LNT-020, at the COMPOSITION rather than the reconciler — a `@fitness` scenario
 * whose CI step the run's own record never recorded reconciles **missing**, and is never credited
 * as merely wired in (3F-3582).
 *
 * WHY IT IS ITS OWN FILE AND ITS OWN LAYER. `domain/missingFitnessObligation.test.ts` asserts the
 * same scenario's rule over the reconciler, where a credit either exists or does not. What decides
 * whether a credit exists AT ALL for a step the record skipped is the composition: two observation
 * streams read the same pipeline — the workflow FILE, which says a step is wired in, and the run's
 * RECORD, which says what it did — and `observationStreams` decides which of them answers a citing
 * step. Neither layer can see the other's half.
 *
 * THE FALSE GREEN IT HOLDS SHUT, MEASURED. While `specController.fitnessChecks` declared the
 * checks, the composition keyed that decision on the CONFIGURED ENTRIES, so an entry the record
 * held no step for was answered by the record (as broken evidence) and derivation could not reach
 * it. The entries are retired. Keyed on the RECORD'S OWN ENTRIES instead — the obvious
 * substitution — a cited step the record never recorded falls through to derivation, is credited
 * as wired in, and its scenario reads `balanced / satisfied` over a check that never ran. Planted
 * at 3F-3592 and measured: `balanced` / `["satisfied"]` under that spelling, `out-of-balance` /
 * `["missing"]` under the one shipped.
 */

import { describe, it, expect } from "vitest";
import { evidenceReconciliationFromSources } from "./evidenceReconciliationFromSources.js";

/** One `@fitness` scenario, and nothing else declaring it — the tag is the whole declaration. */
const CORPUS = `@FIT
Feature: a target's fitness corpus
  Rule: the tree stays inside its thresholds
    @fitness @SCN-AAA-001
    Scenario: the codebase stays under its complexity threshold
`;

/** A pipeline that WIRES the check in and states the @SCN it answers as the step's id:. */
const CI = `name: CI
jobs:
  ci:
    steps:
      - name: Lint
        id: SCN-AAA-001
        run: pnpm lint:alpha
`;

const reconcileWith = (ciStepRecord?: Record<string, { outcome?: string }>) =>
  evidenceReconciliationFromSources({
    featureSources: [CORPUS],
    untaggedScenarios: [],
    packageJson: { scripts: { "lint:alpha": "eslint" } },
    ciSources: [CI],
    ciSourceNames: ["ci.yml"],
    runtimeObservations: [],
    deferralTags: [],
    ...(ciStepRecord === undefined ? {} : { ciStepRecord }),
  }).ledger.scenarioReconciliations.find((row) => row.scnId === "SCN-AAA-001");

describe("[SCN-LNT-020] a cited step the run's own record never recorded leaves its scenario missing", () => {
  it("reads missing where the record happened and carried no step for it", () => {
    // THE RECORD HAPPENED — it carries another step — so this is not the no-record case below.
    const row = reconcileWith({ "SCN-ZZZ-999": { outcome: "success" } });
    expect(row?.qualityCheckReconciliations.map((item) => item.outcome)).toEqual(["missing"]);
    expect(row?.verdict).toBe("out-of-balance");
  });

  it("reads satisfied where the record carried its step and says it succeeded", () => {
    // The control. Without it the assertion above is satisfied by a composition that credits
    // nothing at all, which would be a different bug reading as this one's fix.
    const row = reconcileWith({ "SCN-AAA-001": { outcome: "success" } });
    expect(row?.qualityCheckReconciliations.map((item) => item.outcome)).toEqual(["satisfied"]);
    expect(row?.verdict).toBe("balanced");
  });

  it("is credited from the workflow file alone where no record was handed over at all", () => {
    // A run handed NO record is not a run handed a record carrying nothing. With no record, the
    // derivation stream answers the citing step and the scenario is credited as wired in — which
    // is the `annotated` consumer's own report, and the fact the case above is distinguished from.
    const row = reconcileWith();
    expect(row?.qualityCheckReconciliations.map((item) => item.outcome)).toEqual(["satisfied"]);
  });
});
