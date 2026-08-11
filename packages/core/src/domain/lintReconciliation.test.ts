/**
 * Unit test for the @lint static-check SATISFIED path.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it carry the
 * @SCN-LNT-001 id matching features/fitness-reconciliation.feature, so a grep of the
 * id returns both halves of the pair.
 *
 * It reconciles spec-controller's OWN lint:feature-codes static check against its REAL,
 * checked-out .github/workflows/ci.yml + package.json (NOT a fixture — acceptance
 * condition 1): the static check's command is genuinely a CI `run:` step over the real
 * tree, so the static evidenceObligation reconciles BALANCED. Asserts REAL reconcile
 * output, not a hand-seeded fixture (evidence-manifesto §11A).
 *
 * Parent: @SCN-LNT-001.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { reconcile } from "./evidenceReconciliation.js";
import { checkRegistryOf, registeredCheckTags } from "./checkRegistry.js";
import { checkStaticEvidenceObligations } from "../parse/checkStaticEvidenceObligations.js";
import { citationOfScript, fitnessCitations } from "../parse/fitnessCitations.js";
import { parseScenarios, parseTaggedScenarios } from "../parse/scenarios.js";
import { runningStaticChecks } from "../parse/runningStaticChecks.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { EvidenceObservation } from "../model.js";

/** spec-controller's own, real wired static check — the dogfood subject (package.json script). */
const REAL_GUARD = "lint:feature-codes";

/** The bare check tag the registry maps that handle to — the citation seam's middle term. */
const CHECK_TAG = "feature-codes";

describe("[SCN-LNT-001] a fitness check wired into CI over the real source posts one observation citing its scenario and reconciles satisfied", () => {
  it("posts the run's observation to exactly one row — the fitness scenario's own — and reconciles it satisfied", () => {
    // spec-controller's OWN, REAL CI config + package.json (cwd is the repo root under
    // `pnpm test`) — the check is genuinely a CI run step over the real tree, not a planted
    // fixture. What is fixture-supplied is the REGISTRY and the CORPUS: spec-controller's own
    // tree registers nothing until the corpus sweep (3F-2589), so this seam reads inert on it.
    const root = process.cwd();
    const ciSource = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    ) as PackageJsonScripts;

    const registry = checkRegistryOf({ [REAL_GUARD]: CHECK_TAG });
    const checkTags = registeredCheckTags(registry);
    // TWO rows that both reach this one run. SCN-FIT-001 is the stepless fitness scenario whose
    // bare tag raises the obligation; SCN-FIT-002 names the same runnable handle the retired way,
    // and is the row name-match would ALSO have posted the credit to. Without it "exactly one"
    // asserts nothing — a corpus of one row cannot tell a citation from a smear.
    //
    // THE RETIRED TAG FORM IS DELIBERATE (3F-2624 classified it a KEEPER, not an unswept corpus):
    // it is the negative control, planted in the exact spelling a re-grown by-name route would
    // key on. A bare tag here would make the second row a real fitness scenario — @SCN-LNT-008's
    // subject, and a different outcome.
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${CHECK_TAG} @SCN-FIT-001`,
      "    Scenario: the corpus keeps its feature codes inside the threshold",
      "",
      `    @lint=${REAL_GUARD} @SCN-FIT-002`,
      "    Scenario: a fixture scenario naming the same handle the retired way",
      "      Given a fixture step",
    ].join("\n");
    const scenarios = parseScenarios(corpus, [], checkTags);
    const citations = fitnessCitations(parseTaggedScenarios(corpus), checkTags);

    // The OBSERVER stamps the citation — every running CI check is observed, and the one the
    // registry reaches carries the @SCN of the scenario the corpus says holds it.
    const evidenceObservations = runningStaticChecks(
      [ciSource],
      packageJson,
      ["lint:"],
      [],
      (script) => citationOfScript(script, registry, citations)
    );
    const observation = evidenceObservations.find((o) => o.staticCheck === REAL_GUARD);
    expect(observation?.scnId).toBe("SCN-FIT-001");

    const balance = reconcile(scenarios, evidenceObservations);

    // EXACTLY ONE ROW. The identity of the posted credit is what is counted, across the WHOLE
    // ledger — under name-match this same object posted to every row naming the handle, so a
    // rule that kept name-routing a citing credit puts SCN-FIT-002 in this list too.
    expect(
      balance.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation!))
        .map((row) => row.scnId)
    ).toEqual(["SCN-FIT-001"]);

    const fitness = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-FIT-001");
    expect(fitness?.verdict).toBe("balanced");
    expect(fitness?.reconcilingItems).toEqual([]);
    expect(fitness?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: CHECK_TAG,
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "lint", staticCheck: CHECK_TAG },
        evidenceObservation: observation,
      },
    ]);
  });
});

/**
 * The PLANTED watermelon — a check that EXISTS (a package.json script) and is fixture-green, but
 * whose command is NOT a CI run: step over the real source, so it guards nothing. The classic
 * 609-violations-while-green failure class made detectable (the slice's headline), and the one
 * outcome the migration preserves verbatim.
 *
 * WHICH READER CARRIES IT. Not the running-check observer: that one observes what CI RUNS, so a
 * check running nowhere is exactly what it filters out and it can never produce this observation.
 * The exists-but-unwired fact comes from the OBLIGATION-side reader, and what the migration changes
 * is that the reader now stamps the citation — resolved over the same two hops the running arm uses
 * (@SCN-LNT-001), so one seam serves both readers rather than the static axis growing a second rule.
 *
 * WITHOUT THE CITATION THIS OBLIGATION IS UNREACHABLE. The fitness obligation's `staticCheck` is
 * the BARE tag the stepless scenario carries (`planted-watermelon`) while the observation knows
 * only the runnable handle (`lint:planted-watermelon`) — they can never match by name, so an
 * uncited observation leaves the obligation reconciling `missing`.
 *
 * Acceptance bar (operator, non-negotiable): the detector must CATCH the watermelon over a PLANTED
 * FIXTURE — not merely assert the outcome. So this drives the real `checkStaticEvidenceObligations`
 * DETECTOR over a planted `ci.yml` (where the command is ABSENT) + a planted package.json (where
 * the script EXISTS). The fixture is TEST-ONLY: `lint:planted-watermelon` is never a real in-repo
 * script, because spec-controller cannot keep a permanent real watermelon in-repo (LNT-001 holds
 * the real-source SATISFIED attestation; this holds the planted-watermelon CAUGHT attestation).
 */
const PLANTED_GUARD = "lint:planted-watermelon";

/** The bare check tag the registry maps that planted handle to. */
const PLANTED_CHECK = "planted-watermelon";

describe("[SCN-LNT-002] a fitness scenario naming a check that exists but is unwired reconciles as the watermelon", () => {
  it("posts the unwired check's citing observation to the fitness scenario's row and reconciles it watermelon", () => {
    // A planted CI config that wires OTHER steps but NOT the check's command — the coarse
    // watermelon (the check absent from CI entirely). A reputable structural parse (not a
    // line-scan) reads it; the command is genuinely absent.
    const plantedCi = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Type-check",
      "        run: pnpm typecheck",
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");
    // A planted package.json where the check EXISTS as a script (fixture-green) — so `exists` is
    // true but `enforcedOverRealSource` is false: the watermelon.
    const plantedPackageJson: PackageJsonScripts = {
      scripts: {
        [PLANTED_GUARD]: "tsx scripts/planted-watermelon.ts",
        test: "vitest run",
        typecheck: "tsc --noEmit",
      },
    };

    const registry = checkRegistryOf({ [PLANTED_GUARD]: PLANTED_CHECK });
    const checkTags = registeredCheckTags(registry);
    // The obligation is raised by the BARE tag on a STEPLESS scenario — read through the real
    // corpus reader, so the obligation this reconciles is the one the migration actually produces
    // rather than a hand-seeded `@lint=` one.
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${PLANTED_CHECK} @SCN-FIT-001`,
      "    Scenario: the tree stays inside this check's threshold",
    ].join("\n");
    const scenarios = parseScenarios(corpus, [], checkTags);
    expect(scenarios.map((s) => s.evidenceObligations)).toEqual([
      [{ qualityCheck: "lint", staticCheck: PLANTED_CHECK }],
    ]);
    const citations = fitnessCitations(parseTaggedScenarios(corpus), checkTags);

    // Drive the real DETECTOR over the planted fixture — assert it reads the watermelon precursor
    // (exists, NOT enforced) AND stamps the citation, not a hand-seeded evidenceObservation.
    const evidenceObservations = checkStaticEvidenceObligations(
      [...registry.keys()],
      [plantedCi],
      plantedPackageJson,
      (script) => citationOfScript(script, registry, citations)
    );
    expect(evidenceObservations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: PLANTED_GUARD,
        checkTag: PLANTED_CHECK,
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-FIT-001",
      },
    ]);

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-FIT-001");

    // The watermelon: out-of-balance, carrying exactly the exists-but-not-enforced-over-real-source
    // reconciling item. The item names the BARE check (the obligation's handle) while its
    // observation names the RUNNABLE one — the citation is the only thing joining them, so a rule
    // that dropped back to name-matching reds here with `missing`.
    expect(scenario?.verdict).toBe("out-of-balance");
    const watermelonItem = {
      qualityCheck: "lint",
      staticCheck: PLANTED_CHECK,
      outcome: "watermelon",
      evidenceObligation: { qualityCheck: "lint", staticCheck: PLANTED_CHECK },
      evidenceObservation: evidenceObservations[0],
    };
    expect(scenario?.reconcilingItems).toEqual([watermelonItem]);
    expect(scenario?.qualityCheckReconciliations).toEqual([watermelonItem]);
  });
});

/**
 * The ABSENT check — a fitness scenario names a check nothing implements: no package.json script,
 * no CI run step. A required ledger entry never recorded — `missing` — and GENUINELY DIFFERENT from
 * the watermelon above (a check that EXISTS but is unenforced). Outcome parity with the runtime
 * quality-check's missing path, preserved verbatim across the migration (acceptance clause 3).
 *
 * ONE FACT SEPARATES THIS ARM FROM THE WATERMELON'S — whether the planted package.json defines the
 * script. Everything else is deliberately identical (same registry shape, same corpus shape, same
 * reader, same planted CI), so what the pair proves is the distinction itself rather than two
 * outcomes that happen to differ somewhere.
 *
 * THE SEAM REACHES THE ROW AND FINDS NOTHING TO CREDIT IT WITH. The observation is stamped with the
 * scenario's `@SCN` exactly as the watermelon's is — the citation does not depend on the script
 * existing — and it is the `exists:false` fact, not a failure to resolve the citation, that reads
 * `missing`. So the reconciling item carries its obligation and NO observation: the absent check is
 * FOUND as a negative fact, an ABSENCE rather than an observed piece of evidence (@SCN-LDG-028,
 * double-entry-manifesto line 36 — Obligation Exists, Observation None).
 *
 * The fixture is TEST-ONLY: `lint:absent-check` is never a real in-repo script, and the registry
 * naming a handle nothing implements is the whole subject — a check registered and never written.
 */
const ABSENT_GUARD = "lint:absent-check";

/** The bare check tag the registry maps that absent handle to. */
const ABSENT_CHECK = "absent-check";

describe("[SCN-LNT-003] a fitness scenario naming a check that does not exist reconciles missing", () => {
  it("reconciles the fitness obligation missing, carrying no observation — the absent check is an absence, not a credit", () => {
    // The watermelon arm's planted CI verbatim: OTHER steps wired, the check's command nowhere.
    const plantedCi = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Type-check",
      "        run: pnpm typecheck",
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");
    // And the one difference: the planted package.json defines OTHER scripts but not the check's,
    // so the detector reads exists:false where the watermelon read exists:true.
    const plantedPackageJson: PackageJsonScripts = {
      scripts: {
        test: "vitest run",
        typecheck: "tsc --noEmit",
      },
    };

    const registry = checkRegistryOf({ [ABSENT_GUARD]: ABSENT_CHECK });
    const checkTags = registeredCheckTags(registry);
    // The obligation is raised by the BARE tag on a STEPLESS scenario, read through the real corpus
    // reader — the obligation the migration actually produces, not a hand-seeded `@lint=` one.
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${ABSENT_CHECK} @SCN-FIT-001`,
      "    Scenario: the tree stays inside this check's threshold",
    ].join("\n");
    const scenarios = parseScenarios(corpus, [], checkTags);
    expect(scenarios.map((s) => s.evidenceObligations)).toEqual([
      [{ qualityCheck: "lint", staticCheck: ABSENT_CHECK }],
    ]);
    const citations = fitnessCitations(parseTaggedScenarios(corpus), checkTags);

    // Drive the real DETECTOR over the planted fixture — assert it reads the absent check
    // (exists:false, NOT enforced) AND still stamps the citation, not a hand-seeded observation.
    const evidenceObservations = checkStaticEvidenceObligations(
      [...registry.keys()],
      [plantedCi],
      plantedPackageJson,
      (script) => citationOfScript(script, registry, citations)
    );
    expect(evidenceObservations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: ABSENT_GUARD,
        checkTag: ABSENT_CHECK,
        exists: false,
        enforcedOverRealSource: false,
        scnId: "SCN-FIT-001",
      },
    ]);

    const balance = reconcile(scenarios, evidenceObservations);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-FIT-001");

    // Required-but-missing: out-of-balance, carrying exactly the missing reconciling item, which
    // names the BARE check (the obligation's handle) while the record that found it named the
    // runnable one. Under the coarse else that folded an absent check into the watermelon the
    // outcome reads `watermelon` instead, so the pair has teeth in both directions.
    expect(scenario?.verdict).toBe("out-of-balance");
    const missingItem = {
      qualityCheck: "lint",
      staticCheck: ABSENT_CHECK,
      outcome: "missing",
      evidenceObligation: { qualityCheck: "lint", staticCheck: ABSENT_CHECK },
    };
    expect(scenario?.reconcilingItems).toEqual([missingItem]);
    // Whole-object equality, so the absent credit side is pinned by its ABSENCE: an item that
    // carried the `{exists:false}` record as its `evidenceObservation` — the wrong-shape green
    // @SCN-LDG-028 corrected — fails here.
    expect(scenario?.qualityCheckReconciliations).toEqual([missingItem]);
  });
});

/**
 * TWO FITNESS SCENARIOS, ONE CHECK — the ruling that makes the one posting rule cost something
 * (operator-endorsed 2026-08-09). Under name-match a run posted to EVERY row naming it, so a second
 * scenario claiming the same check cost nothing and the corpus fault never reached the report. One
 * run is one credit and one credit carries one `@SCN`, so it discharges ONE obligation; the
 * runner-up's obligation finds no observation and reads `missing`.
 *
 * WHICH ONE WINS IS THE CORPUS'S ANSWER, not this test's: `fitnessCitations` keeps the FIRST
 * scenario in corpus order and drops the runner-up. So the pair below is read out of the seam rather
 * than asserted beside it, and a reader that merged the two, shared the credit, or preferred the
 * last would flip one or both outcomes here.
 *
 * The subject is spec-controller's OWN real wired check over its REAL ci.yml + package.json — the
 * same dogfood subject as @SCN-LNT-001, because `satisfied` is only reachable over a genuinely wired
 * check. What is fixture-supplied is the REGISTRY and the CORPUS (the tree registers nothing until
 * the corpus sweep, 3F-2589), which is what lets the corpus fault be planted without keeping one.
 *
 * Parent: @SCN-LNT-008.
 */
describe("[SCN-LNT-008] a check named by two fitness scenarios satisfies one and leaves the other missing", () => {
  it("credits the first scenario in corpus order satisfied and leaves the second missing — one run is not evidence for both", () => {
    const root = process.cwd();
    const ciSource = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    ) as PackageJsonScripts;

    const registry = checkRegistryOf({ [REAL_GUARD]: CHECK_TAG });
    const checkTags = registeredCheckTags(registry);
    // THE CORPUS FAULT, planted: two STEPLESS fitness scenarios carrying the SAME bare check. Both
    // raise the obligation — the obligation rule reads the tag off each scenario's own shape
    // (@SCN-LNT-006) and knows nothing of the other — so the ledger holds two debits and one credit.
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${CHECK_TAG} @SCN-FIT-001`,
      "    Scenario: the corpus keeps its feature codes inside the threshold",
      "",
      `    @${CHECK_TAG} @SCN-FIT-002`,
      "    Scenario: a second scenario claiming the same check",
    ].join("\n");
    const scenarios = parseScenarios(corpus, [], checkTags);
    expect(scenarios.map((s) => [s.scnId, s.evidenceObligations])).toEqual([
      ["SCN-FIT-001", [{ qualityCheck: "lint", staticCheck: CHECK_TAG }]],
      ["SCN-FIT-002", [{ qualityCheck: "lint", staticCheck: CHECK_TAG }]],
    ]);

    const citations = fitnessCitations(parseTaggedScenarios(corpus), checkTags);
    const evidenceObservations = runningStaticChecks(
      [ciSource],
      packageJson,
      ["lint:"],
      [],
      (script) => citationOfScript(script, registry, citations)
    );
    const observation = evidenceObservations.find((o) => o.staticCheck === REAL_GUARD);
    // ONE @SCN, and it is the FIRST scenario's. A last-wins reader cites SCN-FIT-002 here.
    expect(observation?.scnId).toBe("SCN-FIT-001");

    const balance = reconcile(scenarios, evidenceObservations);

    // The credit's IDENTITY, counted across the WHOLE ledger — the shared-credit path this ruling
    // refuses puts SCN-FIT-002 in this list too.
    expect(
      balance.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation!))
        .map((row) => row.scnId)
    ).toEqual(["SCN-FIT-001"]);

    // THE PAIR. The cited scenario holds the credit and balances; the runner-up carries the SAME
    // obligation, finds nothing to discharge it, and is out-of-balance carrying `missing` with NO
    // observation — the absent credit pinned by its absence (@SCN-LDG-028), which is what
    // distinguishes "the run went elsewhere" from "the run half-counted here".
    const cited = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-FIT-001");
    expect(cited?.verdict).toBe("balanced");
    expect(cited?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: CHECK_TAG,
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "lint", staticCheck: CHECK_TAG },
        evidenceObservation: observation,
      },
    ]);

    const runnerUp = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-FIT-002");
    expect(runnerUp?.verdict).toBe("out-of-balance");
    const missingItem = {
      qualityCheck: "lint",
      staticCheck: CHECK_TAG,
      outcome: "missing",
      evidenceObligation: { qualityCheck: "lint", staticCheck: CHECK_TAG },
    };
    expect(runnerUp?.reconcilingItems).toEqual([missingItem]);
    expect(runnerUp?.qualityCheckReconciliations).toEqual([missingItem]);
  });
});

/**
 * THE PHANTOM ROW, reached from the fitness axis for the first time. While a check's run cited
 * nothing this arm was structurally unreachable here — there was no citation to be wrong, only a
 * handle to match or fail to match. Citation-routing hands the fitness axis every destination a
 * runtime credit has, through the SAME posting rule, so this is inherited rather than re-stated.
 *
 * THE TWO READS ARE MADE TO DISAGREE, because that is the fault this row exists to surface. The
 * `@SCN` is stamped onto the run when the check is OBSERVED; the row it names is looked for in the
 * corpus as the corpus reads when the ledger is built. Renumbering the fitness scenario between the
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
 * @SCN-LNT-001's is: a running credit is what posts, and only a genuinely wired check produces one.
 * The REGISTRY and the CORPUS are fixture-supplied (the tree registers nothing until the corpus
 * sweep, 3F-2589), which is what lets the disagreement be planted without keeping one.
 *
 * Parent: @SCN-LNT-009.
 */
describe("[SCN-LNT-009] a fitness credit citing an @SCN no scenario carries posts to a phantom row", () => {
  it("mints the phantom row for the cited @SCN, posts the run's one credit there naming the check, and holds it out-of-balance", () => {
    const root = process.cwd();
    const ciSource = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    ) as PackageJsonScripts;

    const registry = checkRegistryOf({ [REAL_GUARD]: CHECK_TAG });
    const checkTags = registeredCheckTags(registry);
    // The corpus AS IT READ WHEN THE RUN WAS OBSERVED — the fitness scenario carried SCN-FIT-001,
    // so that is the `@SCN` the run comes to cite.
    const corpusAtObservation = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${CHECK_TAG} @SCN-FIT-001`,
      "    Scenario: the corpus keeps its feature codes inside the threshold",
    ].join("\n");
    // And AS IT READS WHEN THE LEDGER IS BUILT — the same scenario, renumbered. Nothing carries
    // SCN-FIT-001 any more, so the credit names a row nobody wrote.
    const corpusAtReconcile = corpusAtObservation.replace("SCN-FIT-001", "SCN-FIT-002");

    const citations = fitnessCitations(parseTaggedScenarios(corpusAtObservation), checkTags);
    const evidenceObservations = runningStaticChecks(
      [ciSource],
      packageJson,
      ["lint:"],
      [],
      (script) => citationOfScript(script, registry, citations)
    );
    const observation = evidenceObservations.find((o) => o.staticCheck === REAL_GUARD);
    expect(observation?.scnId).toBe("SCN-FIT-001");

    const scenarios = parseScenarios(corpusAtReconcile, [], checkTags);
    expect(scenarios.map((s) => s.scnId)).toEqual(["SCN-FIT-002"]);

    const balance = reconcile(scenarios, evidenceObservations);

    // THE INVENTED ROW — one per unknown cited id, holding the credit that minted it, raising
    // nothing (nobody named it), and out-of-balance because nothing about it can balance.
    const phantom = balance.scenarioReconciliations.find((s) => s.kind === "phantom-scenario");
    expect(phantom?.scnId).toBe("SCN-FIT-001");
    expect(phantom?.verdict).toBe("out-of-balance");
    expect(phantom?.evidenceObligations).toEqual([]);
    expect(phantom?.evidenceObservations).toEqual([observation]);
    // WHOLE-OBJECT equality, so the item is pinned to NAME THE CHECK THAT RAN. A phantom row has no
    // obligation to point at, so the handle is the reader's only where-to-fix — the suspense arm
    // already carries it, and an item that dropped it here would leave the two unmatched-credit
    // destinations telling a reader different amounts about the same class of fault.
    expect(phantom?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint",
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
    ).toEqual(["SCN-FIT-001"]);
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
 * THE FIXTURE IS STEPLESS, and it has to be: a bare check tag on a STEPPED scenario raises no
 * obligation at all (@SCN-LNT-006), so this is the only shape a two-axis row can be READ from.
 * That is not an endorsement of mixed tagging — whether a behavioural scenario may carry a fitness
 * tag is @SCN-STG-005's question — it is what the corpus reader admits.
 *
 * The fitness arm drives the real `checkStaticEvidenceObligations` DETECTOR over a planted tree and
 * the obligations come from the real corpus reader, so what reconciles here is what the migration
 * produces rather than a hand-seeded pair (evidence-manifesto §11A). The reconciler already answers
 * each obligation independently, so this is green on first run — its TEETH are proven by mutation
 * (the commit body records the plants).
 *
 * Parent: @SCN-LNT-004.
 */
const UNWIRED_SCRIPT = "lint:unwired-check";

/** The bare tag the registry maps that handle to — a DIFFERENT word, so only the citation joins
 *  the fitness obligation to its credit. */
const UNWIRED_CHECK = "unwired-check";

describe("[SCN-LNT-004] a scenario requiring both a unit test and a fitness check reports each independently", () => {
  it("answers each obligation from a credit of its own axis — the unit credit satisfies the unit obligation, the citing fitness credit the watermelon — and never one from the other", () => {
    // The planted tree: the check EXISTS as a script but its command is absent from CI, so the
    // real detector reads exists:true, enforcedOverRealSource:false — the watermelon precursor.
    const plantedCi = [
      "name: CI",
      "on: [push, pull_request]",
      "jobs:",
      "  ci:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");
    const plantedPackageJson: PackageJsonScripts = {
      scripts: { [UNWIRED_SCRIPT]: "tsx scripts/unwired-check.ts", test: "vitest run" },
    };

    const registry = checkRegistryOf({ [UNWIRED_SCRIPT]: UNWIRED_CHECK });
    const checkTags = registeredCheckTags(registry);
    // TWO flat peer tags on ONE stepless scenario, read through the real corpus reader — so the
    // row's two obligations are the ones the tag pair actually raises.
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @unit @${UNWIRED_CHECK} @SCN-FIT-001`,
      "    Scenario: the tree stays inside this check's threshold",
    ].join("\n");
    const scenarios = parseScenarios(corpus, [], checkTags);
    expect(scenarios.map((s) => s.evidenceObligations)).toEqual([
      [{ qualityCheck: "unit" }, { qualityCheck: "lint", staticCheck: UNWIRED_CHECK }],
    ]);
    const citations = fitnessCitations(parseTaggedScenarios(corpus), checkTags);

    // The two credits, observed apart by their own readers and citing the SAME @SCN.
    const unitCredit: EvidenceObservation = {
      qualityCheck: "unit",
      scnId: "SCN-FIT-001",
      status: "passed",
    };
    const fitnessCredits = checkStaticEvidenceObligations(
      [...registry.keys()],
      [plantedCi],
      plantedPackageJson,
      (script) => citationOfScript(script, registry, citations)
    );
    expect(fitnessCredits).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: UNWIRED_SCRIPT,
        checkTag: UNWIRED_CHECK,
        exists: true,
        enforcedOverRealSource: false,
        scnId: "SCN-FIT-001",
      },
    ]);

    const balance = reconcile(scenarios, [unitCredit, ...fitnessCredits]);
    const scenario = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-FIT-001");

    // The fitness watermelon holds the row out of balance even though the behavioural axis balances.
    expect(scenario?.verdict).toBe("out-of-balance");

    // INDEPENDENCE, BOTH DIRECTIONS. Each reading names its own obligation AND the credit that
    // answered it: a green unit credit that could discharge the fitness obligation turns the
    // watermelon `satisfied`, and a fitness credit answering by row rather than by what the
    // obligation owes lands on the unit reading. The exact-list equality is what makes the pair
    // exhaustive — no third reading, and no axis answered twice.
    const watermelonItem = {
      qualityCheck: "lint",
      staticCheck: UNWIRED_CHECK,
      outcome: "watermelon",
      evidenceObligation: { qualityCheck: "lint", staticCheck: UNWIRED_CHECK },
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
