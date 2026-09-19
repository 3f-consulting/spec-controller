/**
 * Unit tests for two static-check reconciliation shapes: the phantom row (@SCN-LNT-009) and the
 * two-axis row (@SCN-LNT-004).
 *
 * Bidirectional evidence (Evidence Manifesto §9): each describe carries its own `@SCN` id matching
 * features/fitness-reconciliation.feature, so a grep of an id returns both halves of its pair.
 *
 * THE CITATION IS INJECTED, NOT DERIVED THROUGH A REGISTRY (3F-3161, @SCN-LNT-017 — the last
 * registry-`scn` scenario). What these two arms are about is what the RECONCILER does with a
 * citation once the seam has resolved it — the phantom-row posting rule, and the two-axis
 * independence rule — not the seam's own resolution, which is `citationOfCitedRow`'s subject
 * (@SCN-LNT-031) and belongs to its own unit. Composing a manifest and a corpus to re-derive an
 * answer this file does not examine would be a second reading of a seam pinned elsewhere. Both
 * arms still drive the PRODUCTION observer (`runningStaticChecks`) and the real `reconcile()` over
 * real scenario input (evidence-manifesto §11A); only the citation the observer is handed is
 * hand-supplied, exactly as `staticObservationTally.test.ts` already does for the same reason.
 *
 * ONE OBSERVER, NOT TWO, SINCE 3F-3410. The obligation-side reader the two-axis arm used to drive
 * has been deleted. Its credit is still DERIVED rather than seeded: the watermelon precursor is
 * reachable through the observer that survives, by wiring the check to a step the job survives
 * instead of leaving it out of CI (`severedWiringFor`). §11A is preserved, not traded away.
 */

import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import type { ScriptCitation } from "../parse/fitnessCitations.js";
import { parseScenarios } from "../parse/scenarios.js";
import { fitnessChecksOf } from "./fitnessChecks.js";
import { runningStaticChecks } from "../parse/runningStaticChecks.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { EvidenceObservation } from "../model.js";

// A target that has named no behavioural runners — the membership argument the observed prefix
// set used to occupy (@SCN-USG-004, 3F-3343). These fixtures' pipelines run no suite, so there is
// nothing for a runner block to take out and naming one would be configuration about a step that
// is not there.
const NO_RUNNERS: Readonly<Record<string, string | null>> = {};


/** The handle the fixtures below plant. It WAS spec-controller's own wired static check; since
 *  3F-3313 no script in this repository carries the name, which changes nothing here — the header
 *  above already records that this file plants its workflow and manifest rather than reading the
 *  tree, so the string is fixture data and its realness was never what the arms rest on. */
const REAL_GUARD = "lint:feature-codes";

/**
 * A workflow and a manifest that WIRE one static check — the fixture these three arms used to read
 * off spec-controller's own tree.
 *
 * THE REAL TREE STOPPED BEING AN INSTANCE, WHICH IS THE MIGRATION WORKING (3F-3165, under 3F-3139).
 * A converted fitness check is not a CI `run:` step at all: its command lives on a
 * `specController.fitnessChecks` row and its own CI step invokes it, so this repository's
 * workflow now names no discovered static check for these arms to observe. 3F-3153 measured that
 * coming — "under the full migration no characteristic retains two wired handles at all… the
 * durable answer is a planted tree rather than the real one" — and left the move to 3F-3139. This
 * is that move.
 *
 * WHAT IS LOST AND WHAT IS NOT. What the real read bought was that the OBSERVER sees a genuine
 * workflow; what these arms are about is what the RECONCILER does with a citation once resolved —
 * decided by the seam, which was always a fixture here. The observer's own reading of a real
 * workflow is still held, by the arms that own it (`checkScriptsRunInCI`, `runningStaticChecks`),
 * over the workflows THEY plant.
 */
function wiringFor(script: string): { ciSource: string; packageJson: PackageJsonScripts } {
  return {
    ciSource: ["name: CI", "jobs:", "  ci:", "    steps:", `      - run: pnpm ${script}`].join("\n"),
    packageJson: { scripts: { [script]: `tsx ${script}.ts` } },
  };
}

/**
 * The same wiring, SEVERED — the step runs the check and `continue-on-error` means its red is not
 * its job's verdict. This is the second of the watermelon's two routes (@SCN-LNT-032): a check can
 * fail to be enforced either by being absent from CI or by being wired to a step the job survives,
 * and `runningStaticChecks` reads `abortsJob` off the step, so it observes THIS one for real.
 */
function severedWiringFor(script: string): { ciSource: string; packageJson: PackageJsonScripts } {
  return {
    ciSource: [
      "name: CI",
      "jobs:",
      "  ci:",
      "    steps:",
      `      - run: pnpm ${script}`,
      "        continue-on-error: true",
    ].join("\n"),
    packageJson: { scripts: { [script]: `tsx ${script}.ts` } },
  };
}

/**
 * THE PHANTOM ROW, reached from the fitness axis for the first time. While a check's run cited
 * nothing this arm was structurally unreachable here — there was no citation to be wrong, only a
 * handle to match or fail to match. Citation-routing hands the fitness axis every destination a
 * runtime credit has, through the SAME posting rule, so this is inherited rather than re-stated.
 *
 * THE TWO READS ARE MADE TO DISAGREE, because that is the fault this row exists to surface. The
 * `@SCN` the run cites (injected below, standing in for what the seam resolved when the check was
 * OBSERVED) names a scenario the corpus carried at THAT time; the row it names is looked for in the
 * corpus as the corpus reads when the LEDGER is built. Renumbering the fitness scenario between the
 * two is the smallest honest way to produce that disagreement — retiring it, or reconciling a
 * feature file the cited scenario does not live in, produce the same fact.
 *
 * WHAT THE ASSERTIONS ARE FOR. That the credit is not DROPPED (the one outcome the double entry
 * forbids) is the identity count across the whole ledger; that it is not SMEARED is the same count
 * reading exactly one row; that the row is ACTIONABLE is the item naming the check that ran, which
 * is the only thing on a phantom row that can point a reader anywhere — no obligation was ever
 * raised of it.
 *
 * The subject is spec-controller's OWN real wired check over its REAL ci.yml + package.json, as
 * @SCN-LNT-001's was: a running credit is what posts, and only a genuinely wired check produces one.
 *
 * Parent: @SCN-LNT-009.
 */
describe("[SCN-LNT-009] a fitness credit citing an @SCN no scenario carries posts to a phantom row", () => {
  it("mints the phantom row for the cited @SCN, posts the run's one credit there naming the check, and holds it out-of-balance", () => {
    const { ciSource, packageJson } = wiringFor(REAL_GUARD);

    // THE SEAM'S ANSWER, injected — what citationOfCitedRow resolved when the check was OBSERVED,
    // over the corpus as it read at that time (the fitness scenario carried SCN-AAA-001).
    const citedScn = (script: string): ScriptCitation | null =>
      script === REAL_GUARD ? { scnId: "SCN-AAA-001" } : null;

    // The corpus AS IT READS WHEN THE LEDGER IS BUILT — renumbered. Nothing carries SCN-AAA-001
    // any more, so the credit names a row nobody wrote.
    const corpusAtReconcile = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @fitness @SCN-AAA-002",
      "    Scenario: the corpus keeps its feature codes inside the threshold",
    ].join("\n");

    const evidenceObservations = runningStaticChecks(
      [ciSource],
      packageJson,
      NO_RUNNERS,
      citedScn
    );
    const observation = evidenceObservations.find((o) => o.staticCheck === REAL_GUARD);
    expect(observation?.scnId).toBe("SCN-AAA-001");

    const scenarios = parseScenarios(
      corpusAtReconcile, [], fitnessChecksOf([{ scn: "SCN-AAA-002" }])
    );
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-AAA-002"]);

    const balance = reconcile(scenarios, evidenceObservations);

    // THE INVENTED ROW — one per unknown cited id, holding the credit that minted it, raising
    // nothing (nobody named it), and out-of-balance because nothing about it can balance.
    const phantom = balance.scenarioReconciliations.find((s) => s.kind === "phantom-scenario");
    expect(phantom?.scnId).toBe("SCN-AAA-001");
    expect(phantom?.verdict).toBe("out-of-balance");
    expect(phantom?.evidenceObligations).toEqual([]);
    expect(phantom?.evidenceObservations).toEqual([observation]);
    // WHOLE-OBJECT equality, so the item is pinned to NAME THE CHECK THAT RAN. A phantom row has no
    // obligation to point at, so the handle is the reader's only where-to-fix — the suspense arm
    // already carries it, and an item that dropped it here would leave the two unmatched-credit
    // destinations telling a reader different amounts about the same class of fault.
    expect(phantom?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: REAL_GUARD,
        outcome: "cites-unknown-scenario",
        evidenceObservation: observation,
      },
    ]);
    expect(phantom?.reconcilingItems).toEqual(phantom?.qualityCheckReconciliations);

    // NEVER DROPPED, NEVER SMEARED — the credit's identity counted across the WHOLE ledger. A rule
    // that let an unresolvable citation fall back to the handle puts the renumbered row in this
    // list; one that dropped the credit empties it.
    expect(
      balance.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation!))
        .map((row) => row.scnId)
    ).toEqual(["SCN-AAA-001"]);
  });
});

/**
 * THE TWO-AXIS ROW. One scenario owes evidence on the BEHAVIOURAL axis (@unit) and on the FITNESS
 * axis (a bare check tag) at once, and each obligation is discharged only by a credit of its own
 * quality-check. With the unit test green and the check unwired, the behavioural axis balances and
 * is omitted from the reconciling items while the fitness axis is the watermelon — so the row is
 * out of balance carrying only the fitness item, one verdict built from two readings rather than
 * one reading standing in for the other. The outcome is the one acceptance clause 3 preserves.
 *
 * WHAT THE MIGRATION CHANGES IS WHY IT IS LOAD-BEARING. Under name-match the two credits arrived by
 * different routes — the unit credit cited its @SCN, the fitness credit was matched by handle — so
 * they were kept apart by the routes rather than by a rule. Now BOTH cite the SAME @SCN and post to
 * the SAME row, which is precisely the arrangement in which a reconciler answering an obligation by
 * the row it sits on, rather than by what it owes, would collapse them.
 *
 * THE FIXTURE IS STEPLESS, and that is how it is written rather than what the reader requires: the
 * `@fitness` tag and its configured row raise the obligation, steps or none (@SCN-LNT-018).
 * That is not an endorsement of mixed tagging — whether a behavioural scenario may carry a fitness
 * tag is @SCN-STG-005's question — it is what the corpus reader admits.
 *
 * The fitness arm drives the real `runningStaticChecks` OBSERVER over a planted severed tree and
 * the obligations come from the real corpus reader, so what reconciles here is what the migration
 * produces rather than a hand-seeded pair (evidence-manifesto §11A). The reconciler already answers
 * each obligation independently, so this is green on first run — its TEETH are proven by mutation
 * (the commit body records the plants).
 *
 * Parent: @SCN-LNT-004.
 */
const SEVERED_SCRIPT = "lint:severed-check";

describe("[SCN-LNT-004] a scenario requiring both a unit test and a fitness check reports each independently", () => {
  it("answers each obligation from a credit of its own axis — the unit credit satisfies the unit obligation, the citing fitness credit the watermelon — and never one from the other", () => {
    // The planted tree: the check RUNS, and `continue-on-error` means its red is not its job's
    // verdict — so the real observer reads exists:true, enforcedOverRealSource:false, which is the
    // watermelon precursor. Severance rather than absence, because absence is observable only by
    // an obligation-side reader and there is no longer one (3F-3410).
    const { ciSource: plantedCi, packageJson: plantedPackageJson } =
      severedWiringFor(SEVERED_SCRIPT);

    // TWO flat peer tags on ONE stepless scenario, read through the real corpus reader — so the
    // row's two obligations are the ones the tag pair actually raises.
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @unit @fitness @SCN-AAA-001",
      "    Scenario: the tree stays inside this check's threshold",
    ].join("\n");
    const scenarios = parseScenarios(
      corpus, [], fitnessChecksOf([{ scn: "SCN-AAA-001" }])
    );
    expect(scenarios.map((s) => s.evidenceObligations)).toEqual([
      [{ qualityCheck: "unit" }, { qualityCheck: "fitness" }],
    ]);

    // THE SEAM'S ANSWER, injected — see the file header.
    const citedScn = (script: string): ScriptCitation | null =>
      script === SEVERED_SCRIPT ? { scnId: "SCN-AAA-001" } : null;

    // The two credits, observed apart by their own readers and citing the SAME @SCN.
    const unitCredit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-AAA-001",
      status: "passed",
    };
    const fitnessCredits = runningStaticChecks(
      [plantedCi],
      plantedPackageJson,
      NO_RUNNERS,
      citedScn
    ).filter((o) => o.staticCheck === SEVERED_SCRIPT);
    expect(fitnessCredits).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: SEVERED_SCRIPT,
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-AAA-001",
      },
    ]);

    const balance = reconcile(scenarios, [unitCredit, ...fitnessCredits]);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-AAA-001");

    // The fitness watermelon holds the row out of balance even though the behavioural axis balances.
    expect(scenario?.verdict).toBe("out-of-balance");

    // INDEPENDENCE, BOTH DIRECTIONS. Each reading names its own obligation AND the credit that
    // answered it: a green unit credit that could discharge the fitness obligation turns the
    // watermelon `satisfied`, and a fitness credit answering by row rather than by what the
    // obligation owes lands on the unit reading. The exact-list equality is what makes the pair
    // exhaustive — no third reading, and no axis answered twice.
    const watermelonItem = {
      qualityCheck: "fitness",
      outcome: "watermelon",
      evidenceObligation: { qualityCheck: "fitness" },
      evidenceObservation: fitnessCredits[0],
    };
    expect(scenario?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "unit",
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "unit" },
        evidenceObservation: unitCredit,
      },
      watermelonItem,
    ]);

    // The balanced behavioural obligation is OMITTED from the reconciling items; only the fitness
    // watermelon remains — the independence a reader meets on the report.
    expect(scenario?.reconcilingItems).toEqual([watermelonItem]);
  });
});
