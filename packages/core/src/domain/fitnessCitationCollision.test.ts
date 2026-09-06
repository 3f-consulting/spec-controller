/**
 * Unit test for TWO fitness credits citing ONE @SCN — the second is never silently absorbed.
 *
 * IN ITS OWN FILE, not appended to `lintReconciliation.test.ts`: that file already sits against the
 * `max-lines` ceiling, and the ceiling is a real gate here rather than a style preference
 * (@SCN-CPX-004). Its subject is also distinct — every arm there reads ONE fitness obligation on a
 * row, and this one exists because a row may raise two.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it carry the @SCN-LNT-012 id
 * matching features/fitness-reconciliation.feature, so a grep of the id returns both halves.
 *
 * THE MIRROR OF @SCN-LNT-008. That arm is two scenarios reaching one check; this is one scenario
 * carrying two. The citation seam is not unique on either side — a bare tag names one scenario, but
 * a scenario may carry more than one bare tag — so two runs can honestly cite the same @SCN, and
 * the reconciler has to tell their credits apart by something other than the @SCN.
 *
 * WHY THE FIXTURE IS BUILT THIS WAY. Both scripts EXIST, so neither obligation can read `missing`
 * and the arm turns on the wiring alone; only `lint:complexity` is a CI run step, so the two
 * credits DISAGREE about their outcome. A reader matching on the @SCN alone finds the wired credit
 * first (registry key order drives the observer) and hands it to both obligations — turning a
 * genuine `typecheck` watermelon `satisfied` and the row `balanced`. That is a false green produced
 * by the tool whose subject is false greens, which is why it is pinned here as a standing test.
 *
 * `typecheck` IS THE DELIBERATE CHOICE for the unwired check: it is the one check whose runnable
 * handle and bare check tag are the same word, so a reconciler that compared those two strings
 * would still agree here. The arm has to be able to fail such a reading, not accommodate it.
 *
 * Parent: @SCN-LNT-012.
 */

import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import { checkRegistryOf, registeredCheckTags } from "./checkRegistry.js";
import { checkStaticEvidenceObligations } from "../parse/checkStaticEvidenceObligations.js";
import { citationOfScript, fitnessCitations } from "../parse/fitnessCitations.js";
import { parseScenarios, parseTaggedScenarios } from "../parse/scenarios.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";

/** The wired handle, and the bare tag the registry maps it to — two DIFFERENT words. */
const WIRED_SCRIPT = "lint:complexity";
const WIRED_CHECK = "complexity";

/** The unwired handle — the one check whose handle and bare tag are the SAME word. */
const COLLIDING_SCRIPT = "typecheck";

describe("[SCN-LNT-012] two fitness credits citing one @SCN each answer their own check", () => {
  it("reads the unwired check's watermelon off its OWN credit, never off the wired check's", () => {
    // TWO registered handles, in the order the observer will walk them: the wired one FIRST, so
    // the credit a @SCN-only match finds is the one that would produce the false green.
    const registry = checkRegistryOf({
      [WIRED_SCRIPT]: WIRED_CHECK,
      [COLLIDING_SCRIPT]: COLLIDING_SCRIPT,
    });
    const checkTags = registeredCheckTags(registry);

    // ONE stepless scenario carrying BOTH bare checks — a legal corpus owing two fitness
    // obligations, and the shape in which both citations resolve to the same @SCN.
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${WIRED_CHECK} @${COLLIDING_SCRIPT} @SCN-AAA-001`,
      "    Scenario: the tree stays inside both thresholds",
    ].join("\n");
    const scenarios = parseScenarios(corpus, [], checkTags);
    const citations = fitnessCitations(parseTaggedScenarios(corpus), checkTags);

    // The row owes TWO fitness obligations, each naming its own BARE tag — asserted, because the
    // whole arm rests on there being two obligations to confuse in the first place.
    expect(scenarios[0]?.evidenceObligations).toEqual([
      { qualityCheck: "lint", staticCheck: WIRED_CHECK },
      { qualityCheck: "lint", staticCheck: COLLIDING_SCRIPT },
    ]);

    // The planted tree: both scripts exist, only the wired one is a CI run step.
    const plantedCi = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Complexity",
      `        run: pnpm ${WIRED_SCRIPT}`,
    ].join("\n");
    const plantedPackageJson: PackageJsonScripts = {
      scripts: {
        [WIRED_SCRIPT]: "tsx scripts/planted-complexity.ts",
        [COLLIDING_SCRIPT]: "tsc --noEmit",
      },
    };

    const fitnessCredits = checkStaticEvidenceObligations(
      [...registry.keys()],
      [plantedCi],
      plantedPackageJson,
      (script) => citationOfScript(script, registry, citations)
    );

    // BOTH credits cite the SAME @SCN, and they disagree about enforcement. Pinned, because if
    // either fact were untrue the outcome assertions below would pass without proving anything.
    expect(fitnessCredits.map((o) => [o.staticCheck, o.scnId, o.enforcedOverRealSource])).toEqual([
      [WIRED_SCRIPT, "SCN-AAA-001", true],
      [COLLIDING_SCRIPT, "SCN-AAA-001", false],
    ]);

    const balance = reconcile(scenarios, fitnessCredits);
    const row = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-AAA-001");

    // EACH OBLIGATION ANSWERED BY ITS OWN CREDIT — the pairs asserted whole, so neither a smear
    // (both readings crediting `lint:complexity`) nor a refusal (the second obligation left with
    // no observation at all) can pass. The exact-list equality makes it exhaustive: no third
    // reading, and no obligation answered twice.
    expect(row?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: WIRED_CHECK,
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "lint", staticCheck: WIRED_CHECK },
        evidenceObservation: fitnessCredits[0],
      },
      {
        qualityCheck: "lint",
        staticCheck: COLLIDING_SCRIPT,
        outcome: "watermelon",
        evidenceObligation: { qualityCheck: "lint", staticCheck: COLLIDING_SCRIPT },
        evidenceObservation: fitnessCredits[1],
      },
    ]);

    // THE FALSE GREEN, READ AT THE ROW. A smeared credit turns the row `balanced` — the tool
    // reporting green over a check that guards nothing.
    expect(row?.verdict).toBe("out-of-balance");

    // NEVER DROPPED. Both credits post to the row they cite; the second is accounted for rather
    // than absorbed by the first.
    expect(row?.evidenceObservations).toEqual(fitnessCredits);
  });
});
