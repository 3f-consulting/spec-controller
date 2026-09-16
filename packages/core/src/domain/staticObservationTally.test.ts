/**
 * Unit test for the static-observation tally (@SCN-USG-001, 3F-2118) — the Ledger fold that OWNS
 * the static-check counting (the retired static census's home, relocated here from
 * `census/staticEvidenceObservations.test.ts`).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-USG-001, matching
 * features/uncited-static-check.feature, so a grep of the id returns both halves.
 *
 * `staticObservationTally` walks the POSTED static-check CREDITS on the Ledger rows (@SCN-LDG-022)
 * and reads each off the row it posted to — the reconciler's own ruling, never re-classified. ONE
 * care-move the runtime fold does not need survives 3F-2590 (the identity-dedupe went with the
 * by-name route it existed to correct):
 *   - FILTER TO RUNNING (`exists && enforcedOverRealSource`) — a watermelon (exists, unwired) or
 *     missing (absent) check STILL posts (posting is not classifying), but does not RUN, so it is
 *     excluded, matching the retired census's running-only `continue`.
 * The Ledger is BUILT BY `reconcile()` over a spanning corpus, never hand-written
 * (evidence-manifesto §11A): the fixture can only state posted-entry shapes the pipeline emits.
 *
 * Parent: (@SCN-USG-001) — the static-observation tally is the Ledger's own fold.
 */

import { describe, it, expect } from "vitest";

import { staticObservationTally } from "./ledger.js";
import { reconcile } from "./evidenceReconciliation.js";
import { runningStaticChecks } from "../parse/runningStaticChecks.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";
import type { ScriptCitation } from "../parse/fitnessCitations.js";
import type {
  EvidenceObservation,
  Ledger,
  MeasuredEvidenceObservation,
  Scenario,
  ScenarioReconciliation,
} from "../model.js";

// THE MEMBERSHIP ARGUMENT — the target's declared behavioural runners, which is what the observed
// prefix set used to be (@SCN-USG-004, 3F-3343). This fixture's pipeline runs both suites, so it
// has to name their runners or the two suite steps are candidates and the uncited count is three
// rather than one — a `new-client` report, not the case this scenario is about.
const SUITE_RUNNERS: Readonly<Record<string, string | null>> = {
  unit: "vitest",
  integration: "cucumber-js",
};


describe("[SCN-USG-001] staticObservationTally folds the posted static-check credits, running-filtered", () => {
  // A SPANNING corpus reconciling to every static-check credit shape, all four CITATION-ROUTED
  // (3F-2590 removed the by-name route, and the identity-dedupe with it):
  //   foo   — RUNNING and cited by SCN-A: counted.
  //   water — a WATERMELON (exists, unwired) cited by SCN-C: posts to its row but does NOT run →
  //           the running filter excludes it. The one care-move this fold still needs.
  //   absent— a MISSING check (absent) cited by SCN-D: posts but does NOT run → excluded.
  //   bar   — RUNNING and cited by nobody: the reconciler folds it to the SUSPENSE row → the 1
  //           uncited static check.
  // The obligation names the BARE check and the run names the RUNNABLE handle, so only the
  // citation can join them. Built through reconcile(), so every row is a shape the pipeline emits.
  const scenarios: Scenario[] = [
    { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "foo" }] },
    { scnId: "SCN-C", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "water" }] },
    { scnId: "SCN-D", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "absent" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "lint", staticCheck: "lint:foo", checkTag: "foo", scnId: "SCN-A", exists: true, enforcedOverRealSource: true },
    { qualityCheck: "lint", staticCheck: "lint:water", checkTag: "water", scnId: "SCN-C", exists: true, enforcedOverRealSource: false },
    { qualityCheck: "lint", staticCheck: "lint:absent", checkTag: "absent", scnId: "SCN-D", exists: false, enforcedOverRealSource: false },
    { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
  ];
  const ledger: Ledger = reconcile(scenarios, observations);
  const tally = staticObservationTally(ledger);

  it("counts the RUNNING checks and no others", () => {
    // lint:foo (cited, running) and lint:bar (uncited, running) → 2. lint:water (watermelon) and
    // lint:absent (missing) post but do NOT run, so the running filter excludes them.
    expect(tally.runningStaticCheckCount).toBe(2);
  });

  it("counts the lint credits on the SUSPENSE row as the uncited static checks", () => {
    // lint:bar cites no scenario — the reconciler folded it to the suspense row (@SCN-LDG-007). It is
    // the only uncited static check; every cited check sits on the row its run names.
    expect(tally.uncitedStaticCheckCount).toBe(1);
  });

  it("keeps named implicit — runningStaticCheckCount − uncitedStaticCheckCount (the running named count)", () => {
    // named is not on the surface; it is the implied remainder — here lint:foo.
    expect(tally.runningStaticCheckCount - tally.uncitedStaticCheckCount).toBe(1);
  });

  it("returns EXACTLY the two-field surface (named is never materialised)", () => {
    expect(tally).toEqual({ runningStaticCheckCount: 2, uncitedStaticCheckCount: 1 });
  });
});

/**
 * @SCN-USG-001 UNDER THE ONE POSTING RULE (3F-2576) — what makes a check uncited is the CITATION,
 * not a lookup against a handle spelling.
 *
 * WHY THIS ARM EXISTS ALONGSIDE THE ONE ABOVE. That fixture INJECTS the seam's answer as a stamped
 * `scnId`, which is the right isolation for a fold: what the TALLY does with a routed credit is its
 * subject. This arm derives the same two credits from the REAL observers over a real CI source, so
 * it is also the proof that the answer the fold folds is one the pipeline actually produces.
 *
 * THE TWO SIDES NAME DIFFERENT WORDS, which is what makes the citation load-bearing rather than
 * decorative. The fitness obligation names the BARE check tag its stepless scenario carries (`foo`)
 * while the run names the RUNNABLE handle (`lint:foo`) — so a reader falling back to matching by
 * name joins nothing, leaves the obligation missing, and sends BOTH credits to suspense.
 *
 * BOTH CREDITS ARE DERIVED BY THE REAL OBSERVERS (evidence-manifesto §11A) over one CI source and
 * one scripts manifest, in exactly the two-reader split the CLI edge assembles: the obligation-side
 * reader answers for the check the corpus obliges and carries the citation; the running-check
 * observer adds the rest of what CI runs, and those cite nothing. The Ledger is then built by
 * `reconcile`, so every row is a shape the pipeline emits.
 *
 * TEETH. Dropping the `scnId` stamp from the cited credit reds this arm in three places at once —
 * the obligation reads missing, the suspense row gains a second credit, and the uncited count reads
 * 2. Dropping the uncited credit instead (the failure the never-dropped clause refuses) reds the
 * count and the row assertion while leaving the satisfied one green, which is why both are asserted.
 *
 * Parent: @SCN-USG-001.
 */
describe("[SCN-USG-001] a static check no fitness scenario cites is banked on the suspense row and counted uncited", () => {
  const rowFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  const pkg: PackageJsonScripts = {
    scripts: {
      "lint:foo": "echo foo-check",
      "lint:bar": "echo bar-check",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const ci = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm lint:foo",
    "      - run: pnpm lint:bar",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  // ONE stepless fitness scenario, raising its obligation against the BARE tag.
  const fitness: Scenario[] = [
    { scnId: "SCN-TGT-001", evidenceObligations: [{ qualityCheck: "lint", staticCheck: "foo" }] },
  ];

  // The seam's answer, injected: `lint:foo` resolves to the scenario carrying its check, `lint:bar`
  // to nothing. Composing the registry and the corpus to reach that answer is `citationOfScript`'s
  // own subject (@SCN-LNT-001); what is under test here is what the posting rule and the tally do
  // with the answer once it is null.
  const citedScn = (script: string): ScriptCitation | null =>
    script === "lint:foo" ? { checkTag: "foo", scnId: "SCN-TGT-001" } : null;

  // ONE observer, split by handle (3F-3458). The obligation-side reader that used to build the
  // citing half has been deleted, and it did not need replacing with a literal: the running-check
  // observer emits the same `GuardEvidenceObservation` shape, and this fixture's CI RUNS
  // `pnpm lint:foo`, so the credit is still derived rather than seeded. Passing `citedScn` to the
  // one call is what stamps the citation on `lint:foo` and leaves every other handle uncited,
  // because the seam answers `null` for all of them.
  const runningCredits = runningStaticChecks([ci], pkg, SUITE_RUNNERS, citedScn);
  const citedCredits = runningCredits.filter((o) => o.staticCheck === "lint:foo");
  const uncitedCredits = runningCredits.filter((o) => o.staticCheck !== "lint:foo");
  const ledger: Ledger = reconcile(fitness, [...citedCredits, ...uncitedCredits]);

  it("derives one citing credit and one uncited credit from the CI source (the corpus is real, not seeded)", () => {
    // Anti-vacuity: were either observer to drop its handle, the assertions below would run over a
    // stream that never carried the thing they are about. Whole-list equality, so an observer that
    // emitted the handle TWICE fails here rather than inflating a count downstream.
    expect(citedCredits).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "lint:foo",
        checkTag: "foo",
        exists: true,
        enforcedOverRealSource: true,
        scnId: "SCN-TGT-001",
      },
    ]);
    expect(uncitedCredits).toEqual([
      { qualityCheck: "lint", staticCheck: "lint:bar", exists: true, enforcedOverRealSource: true },
    ]);
  });

  it("posts the citing credit to the fitness scenario's row, satisfying its bare-tag obligation", () => {
    // The control. Without it "1 uncited" is satisfied by a reader that attributes nothing and
    // banks everything — and the bare tag / runnable handle asymmetry means only the citation can
    // have joined these two.
    expect(rowFor(ledger, "SCN-TGT-001")?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "foo",
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "lint", staticCheck: "foo" },
        evidenceObservation: citedCredits[0],
      },
    ]);
  });

  it("banks the uncited credit on the suspense row as cites-no-scenario, naming the handle that ran", () => {
    // NEVER DROPPED. Every Evidence Observation posts somewhere, so a check the seam cannot place
    // is visible rather than absent — carrying the handle, which is a phantom-free row's only
    // where-to-fix.
    expect(rowFor(ledger, "(no scenario)")?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "lint:bar",
        outcome: "cites-no-scenario",
        evidenceObservation: uncitedCredits[0],
      },
    ]);
  });

  it("posts each credit to exactly one row — never dropped, never smeared", () => {
    // A fallback from an unresolved citation to the handle would put the uncited credit on the
    // fitness row too; the smear the one posting rule exists to end.
    const rowsHolding = (credit: unknown): (string | undefined)[] =>
      ledger.scenarioReconciliations
        .filter((r) => r.evidenceObservations.includes(credit as never))
        .map((r) => r.scnId);
    expect(rowsHolding(citedCredits[0])).toEqual(["SCN-TGT-001"]);
    expect(rowsHolding(uncitedCredits[0])).toEqual(["(no scenario)"]);
  });

  it("tallies both as running and exactly the uncited one as uncited", () => {
    expect(staticObservationTally(ledger)).toEqual({
      runningStaticCheckCount: 2,
      uncitedStaticCheckCount: 1,
    });
  });
});

/**
 * @SCN-USG-005 (3F-2580; re-pointed 3F-3362) — a static check whose script name matches no
 * convention of ours that CI runs AND a fitness scenario CITES is ATTRIBUTED to that scenario's
 * row, never counted as an uncited static check.
 *
 * THE SEAM THIS OWNS, and why @SCN-USG-004 does not already cover it. Its twin pins the UNCITED
 * half; nothing pinned that the two sides MEET — that a handle under no convention of ours CI runs
 * and a corpus cites reconciles `satisfied` on that scenario's row, rather than vanishing or
 * landing on suspense.
 *
 * WHAT THE SPELLING BUYS IS NOTHING, AND THE HANDLE NOW CARRIES NO PREFIX AT ALL. The framing this
 * replaces argued that from the handle and the bare tag being DIFFERENT words
 * (`guard:domain-purity` against `domain-purity`), so that a reader matching by name joined
 * nothing. Prefix-free they are the same word and that argument is gone — deliberately, because
 * the pair 3F-3362 leaves behind is a stronger statement of the same thing: the twin fixture runs
 * the same script under the same registry entry from a byte-identical manifest, so any reader
 * answering from the spelling answers the same way for both, and the two verdicts differ. The
 * name-joins-nothing tooth still has its own witnesses, where a handle and its bare tag are
 * genuinely different words: @SCN-USG-002 (`lint:foo` → `foo`) and @SCN-USG-006 (`lint:nightly` →
 * `nightly`). It is not orphaned here; it is no longer THIS scenario's.
 *
 * THIS ARM IS NOT DISCOVERY'S READER. A handle whose registered tag a scenario carries reaches the
 * axis through the OBLIGATION-side reader, which has never consulted the discovery rule, and is
 * filtered out of the running-check stream so one run is not observed twice. Narrowing discovery
 * reds @SCN-USG-004 and leaves this green — measured against the prefix set at 3F-2579, and
 * measured again at 3F-3362 against the thing that replaced it, a `notChecks` entry naming the
 * step.
 *
 * SO WHAT REDS THIS ARM IS THE CITATION AND ONLY THE CITATION, which is the pair's own claim.
 * Withdraw it (`citedScn` reaching no `@SCN`) and the credit carries no row: the derivation arm
 * reds on the missing terms, the attribution arm finds no reconciliation, the suspense arm finds
 * the row it says is absent, and the tally reads 1 run, 1 uncited. Measured, 3F-3362 — all four.
 *
 * THE CREDIT IS DRIVEN FOR REAL (evidence-manifesto §11A): DERIVED by the obligation-side observer
 * from a CI source and a scripts manifest, never hand-written, and the Ledger is built by
 * `reconcile`, so every row is a shape the pipeline emits. The import of `../parse/` from a domain
 * TEST is the established idiom here (`evidenceReconciliation.test.ts` reads the same layer) and is
 * outside `lint:boundaries`'s `domain-imports-adapter` rule by construction: the rule's `from`
 * clause carries `pathNot: "\.test\.ts$"`. It was outside the domain-purity check's population for
 * the same reason until 3F-3438 — that collector walked PRODUCTION files only.
 *
 * `domain-purity` is a script NAME — a value, not vocabulary — so the handle is deliberately
 * untouched by the static-check rename (3F-1929; 3F-1852 owns script names).
 *
 * Parent: @SCN-USG-005; sibling of @SCN-USG-004 (the uncited half).
 */
describe("[SCN-USG-005] a cited static check under no convention of ours is attributed to its scenario, never an uncited static check", () => {
  const accountFor = (ledger: Ledger, scnId: string): ScenarioReconciliation | undefined =>
    ledger.scenarioReconciliations.find((r) => r.scnId === scnId);

  const guardPkg: PackageJsonScripts = {
    scripts: {
      "domain-purity": "echo domain-purity",
      test: "vitest run",
      cucumber: "cucumber-js",
    },
  };
  const guardCi = [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - run: pnpm install --frozen-lockfile",
    "      - run: pnpm domain-purity",
    "      - run: pnpm test",
    "      - run: pnpm cucumber",
  ].join("\n");

  // THE SEAM'S ANSWER, injected. Composing a registry and a corpus to reach it is
  // `citationOfScript`'s own subject (@SCN-LNT-001); what is under test here is what the posting
  // rule does with an opaque handle under no convention of ours once the answer is an `@SCN`.
  const citedScn = (script: string): ScriptCitation | null =>
    script === "domain-purity" ? { checkTag: "domain-purity", scnId: "SCN-GRD-001" } : null;

  // THE CREDIT — derived by the RUNNING-CHECK observer, carrying the citation the seam resolved
  // (3F-3459). The obligation-side reader that used to build it has been deleted; this fixture's CI
  // RUNS `pnpm domain-purity`, so the credit is still derived from the CI source rather than seeded.
  // Filtered to the one handle because the observer reports every candidate step this pipeline runs,
  // and what this arm is about is the attribution of THIS one.
  const credits = runningStaticChecks([guardCi], guardPkg, SUITE_RUNNERS, citedScn).filter(
    (o) => o.staticCheck === "domain-purity"
  );
  // THE CORPUS — one stepless fitness scenario, raising its obligation against the BARE tag.
  const fitness: Scenario[] = [
    {
      scnId: "SCN-GRD-001",
      evidenceObligations: [{ qualityCheck: "lint", staticCheck: "domain-purity" }],
    },
  ];
  const ledger: Ledger = reconcile(fitness, credits);

  const observation = {
    qualityCheck: "lint",
    staticCheck: "domain-purity",
    checkTag: "domain-purity",
    exists: true,
    enforcedOverRealSource: true,
    scnId: "SCN-GRD-001",
  };

  it("derives the citing credit from the CI source and the scripts manifest (the corpus is real, not seeded)", () => {
    // Anti-vacuity: were the reader to drop the handle or the citation, the stream below would be
    // empty or uncited and the attribution assertions would pass over nothing. Whole-list
    // equality, so an emission of the handle TWICE fails here rather than inflating a count.
    expect(credits).toEqual([observation]);
  });

  it("posts it to the citing scenario's row, satisfying its bare-tag obligation — the ATTRIBUTED half", () => {
    // The scenario's actual claim: attributed, and attributed HERE, on the row the citation
    // names. The report's `### Static checks` section carries counts only, so no rendered surface
    // can tell this from the credit landing on some OTHER row — which is exactly why this belongs
    // at the unit layer.
    expect(accountFor(ledger, "SCN-GRD-001")?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "lint",
        staticCheck: "domain-purity",
        outcome: "satisfied",
        evidenceObligation: { qualityCheck: "lint", staticCheck: "domain-purity" },
        evidenceObservation: observation,
      },
    ]);
    expect(accountFor(ledger, "SCN-GRD-001")?.verdict).toBe("balanced");
  });

  it("mints NO suspense row — a cited static check is never uncited, whatever it is called", () => {
    // The negative half. A reader that reached no `@SCN` for the handle would have nowhere to
    // place the credit, and this row is where the unplaceable credit then appears.
    expect(accountFor(ledger, "(no scenario)")).toBeUndefined();
  });

  it("tallies the run as 1 running static check and 0 uncited", () => {
    expect(staticObservationTally(ledger)).toEqual({
      runningStaticCheckCount: 1,
      uncitedStaticCheckCount: 0,
    });
  });
});

/**
 * @SCN-CIP-003 IN THE STATIC-CHECK FOLD — a MEASUREMENT rides the same quality-check as a static
 * check and is not one, so it is counted in NEITHER tally.
 *
 * Bidirectional evidence: the describe carries @SCN-CIP-003, matching features/ci-run-time.feature.
 *
 * WHY THE FIXTURE LOOKS LIKE THIS. `MeasuredEvidenceObservation` names no `exists` and no
 * `enforcedOverRealSource` — a measurement observed neither — and a measurement always cites, so
 * `postingOf` can never route one to the suspense row. Between them those two facts mean no
 * measurement this package can build reaches either `++` below the skip, and the skip's promise
 * would be unfalsifiable from the inside. It is not unfalsifiable from OUTSIDE: `reconcile` and the
 * `EvidenceObservation` union are on the frozen v1 barrel, TypeScript's width subtyping admits a
 * richer object through a variable binding with no cast, and a JavaScript consumer is bound by
 * nothing at all — so a measurement arriving with a static check's two fields on it is a shape the
 * published surface genuinely accepts. The skip is what keeps it out of a population it is not
 * part of, which is exactly the fold's own comment. Stated with an intersection annotation rather
 * than a cast, so the fixture stays inside the type system it is describing (the @SCN-LNT-001
 * precedent, 3F-2879).
 *
 * Parent: @SCN-USG-001 — the tally is the Ledger's own fold; this is the shape it must not count.
 */
describe("[SCN-CIP-003] a measurement posted to a row is neither a running static check nor an uncited one", () => {
  const SCN = "SCN-MSD-001";
  const CHECK = "ci-run-time";

  // THE PUBLISHED-SURFACE SHAPE — a measurement carrying the two facts a static check would carry.
  // Both `true`, because a `false` pair would pass the running filter for the ordinary reason and
  // prove nothing about the skip.
  const measurement: MeasuredEvidenceObservation & {
    exists: boolean;
    enforcedOverRealSource: boolean;
  } = {
    qualityCheck: "lint",
    scnId: SCN,
    checkTag: CHECK,
    measured: 42.1,
    exists: true,
    enforcedOverRealSource: true,
  };

  // The corpus: one stepless scenario owing the measured check the measurement answers, so the
  // credit posts to a REAL row rather than an invented one. Built through `reconcile()`, so the
  // row is a shape the pipeline emits (evidence-manifesto §11A).
  const scenarios: Scenario[] = [
    {
      scnId: SCN,
      evidenceObligations: [
        { qualityCheck: "lint", staticCheck: CHECK, measured: true, threshold: 75 },
      ],
    },
  ];
  const ledger: Ledger = reconcile(scenarios, [measurement]);
  const tally = staticObservationTally(ledger);

  it("posts the measurement to the row it cites — so the fold has something to skip", () => {
    // Anti-vacuity. Were the credit to land anywhere but a row's `evidenceObservations`, the tally
    // below would read zero for the uninteresting reason and the skip would go unexercised.
    const row = ledger.scenarioReconciliations.find((r) => r.scnId === SCN);
    expect(row?.evidenceObservations).toEqual([measurement]);
  });

  it("counts it in NEITHER tally, though it carries a running check's two facts", () => {
    // Nothing read a manifest or a workflow for a measurement, so it belongs to no static-analysis
    // population. Whole-object equality: a count that moved either way fails here.
    expect(tally).toEqual({ runningStaticCheckCount: 0, uncitedStaticCheckCount: 0 });
  });
});
