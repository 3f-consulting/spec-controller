/**
 * Unit test for the evidenceObservations reconciliation builder (src/evidenceObservations.ts, @SCN-RPT-010).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-010
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * Proves countRuntimeEvidenceObservationKinds counts every evidenceObservation by kind against the @SCN anchor in ONE pass:
 * attributed-to-declared (per-(scnId, level) counts), phantom count (an @SCN no declared
 * scenario matches), and suspense count (no @SCN), with raw per-level totals — and that
 * the identity (Σ rawByRuntimeQualityCheck = Σ attributed.count + undemandedCount + phantomCount + suspenseCount)
 * holds BY CONSTRUCTION over a spanning fixture. Asserts REAL builder output, not a
 * hand-seeded aggregate (evidence-manifesto §11A).
 *
 * Parent: (@SCN-RPT-010) — the evidenceObservations-reconciliation spine.
 */

import { describe, it, expect } from "vitest";
import {
  countRuntimeEvidenceObservationKinds,
  totalEvidenceObservations,
  attributedTotal,
  type RuntimeEvidenceObservationKindCounts,
} from "./evidenceObservations.js";
import type { Scenario, RuntimeEvidenceObservation } from "../model.js";
import { reconcile } from "../reconcile/reconcile.js";
import { parseVitestEvidenceObservations, type VitestJsonReport } from "../parse/vitest.js";
import { parseCucumberEvidenceObservations, type CucumberJsonReport } from "../parse/cucumber.js";

describe("[SCN-RPT-010] countRuntimeEvidenceObservationKinds counts the observed test evidenceObservations by kind against the @SCN anchor", () => {
  // SCN-LDG-001 and SCN-LDG-002 are declared; SCN-PHANTOM-999 is NOT (a phantomEvidenceObservation-id).
  const scenarios: Scenario[] = [
    { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
    { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheck: "integration" }] },
  ];

  // A Vitest report spanning every class at the unit qualityCheck: TWO assertions attributed
  // to the declared SCN-LDG-001 (so the per-(scnId, level) COUNT is 2, not existence),
  // one phantomEvidenceObservation (SCN-PHANTOM-999, undeclared), one carrying no @SCN (suspenseEvidenceObservation).
  const vitest: VitestJsonReport = {
    testResults: [
      {
        name: "/repo/tests/trb.test.ts",
        assertionResults: [
          { fullName: "[SCN-LDG-001] balances", status: "passed" },
          { fullName: "[SCN-LDG-001] also balances another way", status: "passed" },
          { fullName: "[SCN-PHANTOM-999] a test pointing at no declared scenario", status: "passed" },
          { fullName: "an ordinary unit test carrying no @SCN id", status: "passed" },
        ],
      },
    ],
  };

  // A Cucumber report at the integration qualityCheck: one attributed to declared SCN-LDG-002,
  // one carrying no @SCN tag (suspenseEvidenceObservation).
  const cucumber: CucumberJsonReport = [
    {
      uri: "features/widget.feature",
      elements: [
        { tags: [{ name: "@SCN-LDG-002" }], steps: [{ result: { status: "passed" } }] },
        { tags: [{ name: "@smoke" }], steps: [{ result: { status: "passed" } }] },
      ],
    },
  ];

  // The census now FOLDS over the LEDGER (@SCN-RPT-023 / 3F-1859) — parse each source at its
  // declared FALLBACK (vitest⇒unit, cucumber⇒integration), the parser deriving the level from the
  // scenario's tier tag (@SCN-LDG-011 / 3F-1434), then RECONCILE, then fold. These fixtures are
  // tier-untagged, so the fallback stands and the counts are unchanged — a mechanical signature
  // migration, not a value change.
  //
  // The ledger is BUILT BY `reconcile()` over the corpus, never hand-written (evidence-manifesto
  // §11A). A hand-built ledger feeding a fold over ledgers would test the typing, not the engine:
  // it could state a posted-entry shape no run can produce, which the fold would then read as
  // truth and report green. This file hand-builds zero rows and still does.
  const observations = [
    ...parseVitestEvidenceObservations(vitest, "unit"),
    ...parseCucumberEvidenceObservations(cucumber, "integration"),
  ];
  const evidenceObservations: RuntimeEvidenceObservationKindCounts =
    countRuntimeEvidenceObservationKinds(reconcile(scenarios, observations));

  it("counts raw evidenceObservations per level over ALL results, regardless of @SCN", () => {
    // 4 unit assertions + 2 integration scenarios; e2e/performance have no reader.
    expect(evidenceObservations.rawByRuntimeQualityCheck).toEqual({ unit: 4, integration: 2, e2e: 0, performance: 0 });
  });

  it("aggregates attributed-to-declared evidenceObservations as per-(scnId, level) COUNTS, not existence", () => {
    // SCN-LDG-001 has TWO unit evidenceObservations — a count of 2 proves it tallies, not .find().
    expect(evidenceObservations.attributed).toContainEqual({ scnId: "SCN-LDG-001", qualityCheck: "unit", count: 2 });
    expect(evidenceObservations.attributed).toContainEqual({ scnId: "SCN-LDG-002", qualityCheck: "integration", count: 1 });
    // Only the declared scenarios are attributed — the phantomEvidenceObservation is not here.
    expect(evidenceObservations.attributed).toHaveLength(2);
  });

  it("counts the phantom evidence observation-id evidenceObservation (an @SCN no declared scenario matches)", () => {
    expect(evidenceObservations.phantomCount).toBe(1);
  });

  it("counts the cites-no-scenario evidence observation evidenceObservations (no @SCN)", () => {
    // Two suspense evidence observations: the unit assertion + the integration scenario, both carrying no @SCN.
    expect(evidenceObservations.suspenseCount).toBe(2);
  });

  it("holds the evidenceObservations identity BY CONSTRUCTION: raw total = attributed + suspense", () => {
    // The thesis: one shared pass means the kind-counts can't drift. raw (6) =
    // attributed-to-declared (3) + phantom (1) + suspense (2); attributedTotal folds
    // the phantom in (every @SCN-bearing evidenceObservation), so total = attributedTotal + suspenseCount.
    expect(totalEvidenceObservations(evidenceObservations)).toBe(6);
    expect(attributedTotal(evidenceObservations)).toBe(4); // 3 attributed-to-declared + 1 phantom evidence observation
    expect(totalEvidenceObservations(evidenceObservations)).toBe(attributedTotal(evidenceObservations) + evidenceObservations.suspenseCount);
  });

  it("[SCN-RPT-010] attributes each source at its DECLARED level, not a hardcoded one", () => {
    // The SAME Vitest report, but its input now DECLARES level e2e — proving the
    // kind-counts follow the input's declaration, not a Vitest⇒unit hardcode. Every tally (raw
    // by-level, per-evidence observation kind, phantomEvidenceObservation) must read e2e. This is the
    // assertion that fails if anyone re-bakes the source→level mapping.
    const e2eObservations = parseVitestEvidenceObservations(vitest, "e2e");
    const evidenceObservationsAtE2e = countRuntimeEvidenceObservationKinds(
      reconcile(scenarios, e2eObservations)
    );
    expect(evidenceObservationsAtE2e.rawByRuntimeQualityCheck).toEqual({ unit: 0, integration: 0, e2e: 4, performance: 0 });
    // SCN-LDG-001 declares UNIT, so its two e2e credits now match no declared (scnId, e2e) pair
    // → UNDEMANDED at e2e (the mis-count fix; before, they were counted as attributed
    // purely on scenarioIds.has). The level still follows the declaration (e2e, not unit) — the
    // point — it is simply counted at the right kind now, and attributed carries nothing.
    expect(evidenceObservationsAtE2e.attributed).toEqual([]);
    // SCN-LDG-001's TWO e2e credits are undemanded (it declares unit, not e2e).
    expect(evidenceObservationsAtE2e.undemandedCount).toBe(2);
    expect(evidenceObservationsAtE2e.phantomCount).toBe(1);
  });

  it("contributes nothing for a missing report (its level stays zero)", () => {
    const unitOnly = countRuntimeEvidenceObservationKinds(
      reconcile(scenarios, parseVitestEvidenceObservations(vitest, "unit"))
    );
    expect(unitOnly.rawByRuntimeQualityCheck.integration).toBe(0);
    expect(unitOnly.rawByRuntimeQualityCheck.unit).toBe(4);
    // The identity still holds with a report absent.
    expect(totalEvidenceObservations(unitOnly)).toBe(
      attributedTotal(unitOnly) + unitOnly.suspenseCount
    );
  });

  // NB: the runtime census is now COUNT-only — it retains no per-item locators, so
  // the builder no longer takes a run root and there is nothing to relativize. The persisted
  // report's evidence-observation locators (repo-relative under @SCN-RPT-016) are produced by the
  // reconcile core rows, not by this count builder; that portability is covered in features/report.feature.
});

describe("[SCN-LDG-008] the counter gains the (scnId, quality-check)-declared-pair check — the attributed mis-count fix", () => {
  // SCN-LDG-008 is a REAL declared scenario, declaring ONLY unit. A credit at INTEGRATION cites
  // it — a real scenario, but at a quality-check it never declared. Before the fix, the counter
  // counted it as attributed purely on scenarioIds.has(scnId), silently inflating the
  // reconciliation-matched-attributed count. After the fix, the (scnId, quality-check) PAIR must
  // be declared; an undeclared-pair credit breaks OUT into the undemanded kind.
  const scenarios: Scenario[] = [
    { scnId: "SCN-LDG-008", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];

  // A Vitest report at unit: ONE credit matching the declared (SCN-LDG-008, unit) pair.
  const vitest: VitestJsonReport = {
    testResults: [
      {
        name: "/repo/tests/ldg008.unit.test.ts",
        assertionResults: [{ fullName: "[SCN-LDG-008] the declared unit evidence obligation", status: "passed" }],
      },
    ],
  };
  // A Cucumber report at integration: ONE credit citing SCN-LDG-008 at integration — a real
  // scenario, but a quality-check it NEVER declared → undemanded (not matched-attributed).
  const cucumber: CucumberJsonReport = [
    {
      uri: "features/ldg008.feature",
      elements: [{ tags: [{ name: "@SCN-LDG-008" }], steps: [{ result: { status: "passed" } }] }],
    },
  ];

  // Projection of the parsed set (@SCN-RPT-017 / 3F-1452): SCN-LDG-008's cucumber element is
  // tier-untagged, so it parses at the integration fallback — a real scenario at an undeclared
  // quality-check → undemanded, exactly as before. A mechanical signature migration.
  const observations = [
    ...parseVitestEvidenceObservations(vitest, "unit"),
    ...parseCucumberEvidenceObservations(cucumber, "integration"),
  ];
  const evidenceObservations: RuntimeEvidenceObservationKindCounts =
    countRuntimeEvidenceObservationKinds(reconcile(scenarios, observations));

  it("counts the matched-pair credit as reconciliation-matched attributed, but NOT the undeclared-pair credit", () => {
    // ONLY the (SCN-LDG-008, unit) pair is attributed — the integration credit is NOT here.
    expect(evidenceObservations.attributed).toEqual([
      { scnId: "SCN-LDG-008", qualityCheck: "unit", count: 1 },
    ]);
  });

  it("breaks the undeclared-pair credit OUT into the undemanded kind (cites a declared scenario, at an undeclared quality-check)", () => {
    // The integration credit cites a REAL scenario, so it is neither phantom (undeclared scenario)
    // nor suspense (no @SCN) — it is counted as undemanded.
    expect(evidenceObservations.undemandedCount).toBe(1);
    // It is NOT double-counted as phantom or suspense.
    expect(evidenceObservations.phantomCount).toBe(0);
    expect(evidenceObservations.suspenseCount).toBe(0);
  });

  it("keeps the FOUR-way builder identity: Σ rawByRuntimeQualityCheck = Σ attributed.count + undemanded + phantom + suspense", () => {
    // The builder now counts FOUR kinds (undemanded broke out of attributed). The raw total
    // still equals the sum of the mutually-exclusive kind-counts — the identity cannot drift.
    const raw = totalEvidenceObservations(evidenceObservations);
    const matched = evidenceObservations.attributed.reduce((n, a) => n + a.count, 0);
    expect(raw).toBe(2);
    expect(
      matched +
        evidenceObservations.undemandedCount +
        evidenceObservations.phantomCount +
        evidenceObservations.suspenseCount
    ).toBe(raw);
  });
});

describe("[SCN-RPT-017] the census PROJECTS the parsed observation set, levelling by the cited scenario's tag", () => {
  // The FULL-UNIFY view fix (3F-1452): the census tallies the ALREADY-PARSED observation set the
  // reconciler consumes (tag-derived, per @SCN-LDG-011 / 3F-1434), NOT a second raw-report walk
  // that stamps the caller-declared quality-check. SCN-TGT-101 declares @e2e; a cucumber run proves
  // it. Parsed with the JS-ecosystem integration FALLBACK, the observation's level is nevertheless
  // DERIVED from the @e2e tier tag — so it is an e2e observation. Projecting that parsed set, the
  // census must count it under e2e (not integration) and attribute (SCN-TGT-101, e2e), matching the
  // reconciler's verdict. This is the census view agreeing with the reconciler — the report no
  // longer contradicting itself.
  const scenarios: Scenario[] = [
    { scnId: "SCN-TGT-101", evidenceObligations: [{ qualityCheck: "e2e" }] },
  ];
  const cucumber: CucumberJsonReport = [
    {
      uri: "features/widget.feature",
      elements: [
        { tags: [{ name: "@e2e" }, { name: "@SCN-TGT-101" }], steps: [{ result: { status: "passed" } }] },
      ],
    },
  ];
  // Parse with the integration FALLBACK — the parser derives the level from the @e2e tag, so the
  // parsed observation is at e2e. The census merely PROJECTS this set; it re-derives nothing.
  const observations = parseCucumberEvidenceObservations(cucumber, "integration");
  const census: RuntimeEvidenceObservationKindCounts =
    countRuntimeEvidenceObservationKinds(reconcile(scenarios, observations));

  it("counts the @e2e-via-cucumber observation under e2e, not the integration fallback", () => {
    expect(census.rawByRuntimeQualityCheck.e2e).toBe(1);
    expect(census.rawByRuntimeQualityCheck.integration).toBe(0);
  });

  it("attributes the observation to (scnId, e2e) — the reconciler's tag-derived level, not a hardcode", () => {
    expect(census.attributed).toContainEqual({ scnId: "SCN-TGT-101", qualityCheck: "e2e", count: 1 });
  });

  it("holds the identity BY CONSTRUCTION over the projected set", () => {
    expect(totalEvidenceObservations(census)).toBe(1);
    expect(totalEvidenceObservations(census)).toBe(attributedTotal(census) + census.suspenseCount);
  });
});

describe("[SCN-RPT-018] the census counts an @integration @e2e-via-cucumber observation in BOTH tiers", () => {
  // The MULTI-TAG view mirror (3F-1452): the view-side mirror of the reconciler's @SCN-LDG-014.
  // SCN-TGT-102 declares BOTH @integration and @e2e; a SINGLE passing cucumber scenario proves it.
  // parseCucumber emits ONE observation per declared non-unit tier (per-tier emission, @SCN-LDG-014)
  // — so the parsed set carries an integration AND an e2e observation, both citing SCN-TGT-102. The
  // census PROJECTS that set (@SCN-RPT-017): it tallies the two observations independently, with NO
  // multi-tag-specific logic, so both tiers' raw counts are 1 and attributed carries both
  // (SCN-TGT-102, integration) and (SCN-TGT-102, e2e). This proves the second tier is NOT lost in the
  // census (a dedup-by-scnId would drop it) — the view agreeing with the reconciler that one cucumber
  // pass discharges both non-unit obligations.
  const scenarios: Scenario[] = [
    { scnId: "SCN-TGT-102", evidenceObligations: [{ qualityCheck: "integration" }, { qualityCheck: "e2e" }] },
  ];
  const cucumber: CucumberJsonReport = [
    {
      uri: "features/widget.feature",
      elements: [
        {
          tags: [{ name: "@integration" }, { name: "@e2e" }, { name: "@SCN-TGT-102" }],
          steps: [{ result: { status: "passed" } }],
        },
      ],
    },
  ];
  // Parse with the integration FALLBACK — the parser derives the levels from the scenario's tier
  // tags, so the SINGLE scenario yields TWO parsed observations (integration + e2e). The census
  // merely PROJECTS this set; it re-derives nothing and adds no multi-tag logic of its own.
  const observations = parseCucumberEvidenceObservations(cucumber, "integration");
  const census: RuntimeEvidenceObservationKindCounts =
    countRuntimeEvidenceObservationKinds(reconcile(scenarios, observations));

  it("counts the one scenario under BOTH integration and e2e (per-tier emission, projected)", () => {
    expect(census.rawByRuntimeQualityCheck.integration).toBe(1);
    expect(census.rawByRuntimeQualityCheck.e2e).toBe(1);
  });

  it("attributes the observation to BOTH (scnId, integration) and (scnId, e2e) — the second tier is not lost", () => {
    expect(census.attributed).toContainEqual({ scnId: "SCN-TGT-102", qualityCheck: "integration", count: 1 });
    expect(census.attributed).toContainEqual({ scnId: "SCN-TGT-102", qualityCheck: "e2e", count: 1 });
    // Exactly the two attributed entries — no undemanded, phantom, or suspense leakage.
    expect(census.attributed).toHaveLength(2);
    expect(census.undemandedCount).toBe(0);
    expect(census.phantomCount).toBe(0);
    expect(census.suspenseCount).toBe(0);
  });

  it("holds the identity BY CONSTRUCTION over the two-tier projected set", () => {
    // raw (2) = attributed (2) + undemanded (0) + phantom (0) + suspense (0).
    expect(totalEvidenceObservations(census)).toBe(2);
    expect(totalEvidenceObservations(census)).toBe(attributedTotal(census) + census.suspenseCount);
  });
});

describe("[SCN-RPT-023] a broken observation citing a real scenario is not attributed to it", () => {
  // THE SECOND DIVERGENCE (3F-1831), and the reason the fold is not a no-op.
  //
  // An ambiguous cucumber step (@SCN-LDG-019) produces an observation with `broken: true` AND a
  // REAL scnId: the cucumber scenario DID cite its @SCN — only its step could not run. So the
  // credit passes every "cites a real scenario at a demanded pair" test there is:
  //   - scnId is not null, so it is not suspense by the old test;
  //   - the scenario IS declared, so it is not phantom;
  //   - the (scnId, integration) pair IS demanded, so it is not undemanded.
  // The census therefore counted it ATTRIBUTED. The reconciler posts it to SUSPENSE (the
  // fail-safe takes `broken` FIRST, on the flag). Canon settles it for the reconciler: a proof
  // that never ran can neither discharge nor fail an obligation, so it attributes to NOTHING.
  //
  // The corpus is built through the REAL cucumber parser, so the broken+scnId shape is the one
  // the pipeline actually emits rather than one this test invented (evidence-manifesto §11A).
  //
  // SCN-AMB-002 is the control: a clean credit at the SAME quality-check, which MUST stay
  // attributed. Without it, "SCN-AMB-001 is not attributed" would pass on an empty tally.
  const scenarios: Scenario[] = [
    { scnId: "SCN-AMB-001", evidenceObligations: [{ qualityCheck: "integration" }] },
    { scnId: "SCN-AMB-002", evidenceObligations: [{ qualityCheck: "integration" }] },
  ];
  const cucumber: CucumberJsonReport = [
    {
      uri: "features/widget.feature",
      elements: [
        // The AMBIGUOUS step — two step definitions match, so it never ran. The parser emits
        // broken:true carrying scnId SCN-AMB-001.
        {
          tags: [{ name: "@integration" }, { name: "@SCN-AMB-001" }],
          steps: [{ keyword: "Given ", name: "the target repo's source", result: { status: "ambiguous" } }],
        },
        // The control: an ordinary passing scenario at the same quality-check.
        {
          tags: [{ name: "@integration" }, { name: "@SCN-AMB-002" }],
          steps: [{ result: { status: "passed" } }],
        },
      ],
    },
  ];
  const observations = parseCucumberEvidenceObservations(cucumber, "integration");
  // Corpus in → `reconcile()` → fold. The reconciler is what puts the broken credit on the
  // suspense row; the census simply reads the row. Both halves of the move are therefore the
  // ENGINE's, not this test's arithmetic.
  const census: RuntimeEvidenceObservationKindCounts =
    countRuntimeEvidenceObservationKinds(reconcile(scenarios, observations));

  it("emits the broken credit carrying a REAL scnId — the shape that fools every scnId-based test", () => {
    // The premise, pinned: if the parser ever stopped carrying the scnId, this scenario would be
    // testing nothing and would silently pass.
    const broken = observations.filter(
      (o): o is RuntimeEvidenceObservation => o.qualityCheck !== "lint" && o.broken === true
    );
    expect(broken).toHaveLength(1);
    expect(broken[0]!.scnId).toBe("SCN-AMB-001");
  });

  it("does NOT attribute the broken credit to the scenario it cites", () => {
    // THE MOVE: attributed −1. The census counted this `attributed`; the reconciler always posted
    // it to suspense. One classifier now, and it is the reconciler's.
    expect(census.attributed).not.toContainEqual(
      expect.objectContaining({ scnId: "SCN-AMB-001" })
    );
    // The control still attributes — the fold moved the broken credit, it did not empty the tally.
    expect(census.attributed).toEqual([
      { scnId: "SCN-AMB-002", qualityCheck: "integration", count: 1 },
    ]);
  });

  it("counts the broken credit ONCE on suspense — it moved, it did not vanish", () => {
    // THE MOVE: suspense +1. It is not undemanded (its pair IS demanded) and not phantom (its
    // scenario IS declared) — suspense is the only honest account for a proof that never ran.
    expect(census.suspenseCount).toBe(1);
    expect(census.undemandedCount).toBe(0);
    expect(census.phantomCount).toBe(0);
  });

  it("balances the identity — which is COMPLETENESS, and could never have caught this", () => {
    // Deliberately last, and deliberately glossed. raw = attributed + undemanded + phantom +
    // suspense balanced BEFORE this fix (2 = 2+0+0+0) and balances after (2 = 1+0+0+1). The
    // identity is INVARIANT under a misclassification between its own terms: it catches a credit
    // VANISHING, never a credit in the wrong bucket. The two tests above are the correctness
    // check; this one is the completeness check, and it is not evidence for them.
    const raw = totalEvidenceObservations(census);
    const attributedTally = census.attributed.reduce((n, a) => n + a.count, 0);
    expect(raw).toBe(2);
    expect(attributedTally + census.undemandedCount + census.phantomCount + census.suspenseCount).toBe(raw);
  });
});
