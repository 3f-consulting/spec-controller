/**
 * Unit test for the JSON report's provenance object (@SCN-RPT-002).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-002 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the provenance projection on the machine surface in isolation:
 * renderJson(balance, ctx) parses to an object that grows a top-level `provenance`
 * carrying the same non-derivable run facts as the markdown header — target, source
 * SHA, the UTC run timestamp, and the input paths/flags actually used — while the
 * reconciliation body (evidenceReconciliation) is unchanged. The retired `warnings` key
 * is absent — a zero-evidence scenario is a `both-missing` row, not a separate axis.
 *
 * Teeth: until renderJson projects the ctx, `provenance` is absent, so every
 * provenance assertion reds (the genuine red→green). The body-intact assertion is
 * the regression guard — the reconciliation surface survives the new wrapper.
 *
 * Parent: (@SCN-RPT-002).
 */

import { describe, it, expect } from "vitest";
import { renderJson } from "./json.js";
import type { EvidenceReconciliation } from "../model.js";
import type { RunContext } from "../provenance/provenance.js";
import type { RuntimeEvidenceObservationKindCounts } from "../census/evidenceObservations.js";

/** A minimal balanced balance — enough for the renderer to serialise a report. */
const balance: EvidenceReconciliation = {
  scenarioReconciliations: [
    { scnId: "SCN-RPT-002", verdict: "balanced", evidenceObligations: [], reconcilingItems: [] },
  ],
};

const ctx: RunContext = {
  target: "an-adopters-repository",
  inputs: {
    features: "../an-adopters-repository/features",
    vitest: "../an-adopters-repository/vitest-report.json",
  },
  runStart: new Date("2026-06-27T08:17:53.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
};

describe("[SCN-RPT-002] the JSON report carries a provenance object", () => {
  it("carries a top-level provenance with target, source SHA, UTC timestamp, and the inputs used", () => {
    const parsed = JSON.parse(renderJson(balance, ctx));

    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.runProvenance.target).toBe("an-adopters-repository");
    expect(parsed.runProvenance.sourceSha).toBe("905a987c0ffeeba110000000000000000deadbeef");
    // Second-precision UTC, the same projection the markdown header renders.
    expect(parsed.runProvenance.runTimestamp).toBe("2026-06-27T08:17:53Z");
    // The input paths/flags actually used, keyed by their canonical name.
    expect(parsed.runProvenance.inputs.features).toBe("../an-adopters-repository/features");
    expect(parsed.runProvenance.inputs.vitest).toBe("../an-adopters-repository/vitest-report.json");
  });

  it("keeps the reconciliation body (evidenceReconciliation) intact alongside provenance, with no retired warnings key", () => {
    const parsed = JSON.parse(renderJson(balance, ctx));

    expect(parsed.evidenceReconciliation).toHaveLength(1);
    expect(parsed.evidenceReconciliation[0].scnId).toBe("SCN-RPT-002");
    expect(parsed.evidenceReconciliation[0].verdict).toBe("balanced");
    // The `warnings` top-level key was RETIRED entirely.
    expect(parsed).not.toHaveProperty("warnings");
  });

  it("includes only the inputs actually used (an absent flag is omitted, not null)", () => {
    const parsed = JSON.parse(renderJson(balance, { ...ctx, inputs: { features: "f" } }));

    expect(parsed.runProvenance.inputs.features).toBe("f");
    expect(parsed.runProvenance.inputs).not.toHaveProperty("vitest");
    expect(parsed.runProvenance.inputs).not.toHaveProperty("ci");
  });

  it("preserves a null source SHA as JSON null (unknown, non-git target)", () => {
    const parsed = JSON.parse(renderJson(balance, { ...ctx, sourceSha: null }));
    expect(parsed.runProvenance.sourceSha).toBeNull();
  });
});

/**
 * Unit test for the JSON evidenceObligations field (@SCN-RPT-008).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-008 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the renderJson corpus projection in isolation: when a EvidenceObligations is
 * threaded as the optional third arg, renderJson emits
 * { provenance, evidenceObligations: { excludedOccurrences }, ...balance } — only the LONE
 * non-derivable corpus fact (scenarioCount is derivable from the balance;
 * rawScnOccurrences is derivable as scenarioCount + excludedOccurrences). The
 * evidenceObligations object is kept DISTINCT from provenance (run metadata) and the
 * reconciliation body. When no corpus is threaded the existing { provenance, ...balance }
 * shape is preserved (the RPT-002 guard stays green).
 *
 * Teeth: until renderJson projects the corpus, evidenceObligations is absent, so its
 * assertions red (the genuine red→green). The omission case is the RPT-002 guard.
 *
 * Parent: (@SCN-RPT-008).
 */
describe("[SCN-RPT-008] the JSON report carries a evidenceObligations object with the excluded count", () => {
  const evidenceObligations = { rawScnOccurrences: 10, scenarioCount: 7, excludedOccurrences: 3, untaggedScenarios: [], proseOnlyCodes: [] };

  it("carries evidenceObligations.excludedOccurrences when a corpus is threaded", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, evidenceObligations));
    expect(parsed.evidenceObligations).toBeDefined();
    expect(parsed.evidenceObligations.excludedOccurrences).toBe(3);
  });

  it("persists ONLY excludedOccurrences (scenarioCount + rawScnOccurrences are derivable)", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, evidenceObligations));
    expect(parsed.evidenceObligations).not.toHaveProperty("scenarioCount");
    expect(parsed.evidenceObligations).not.toHaveProperty("rawScnOccurrences");
  });

  it("keeps evidenceObligations distinct from provenance and the reconciliation body", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, evidenceObligations));
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.runProvenance).not.toHaveProperty("excludedOccurrences");
    expect(parsed.evidenceReconciliation).toHaveLength(1);
    expect(parsed).not.toHaveProperty("warnings");
  });

  it("omits evidenceObligations when no corpus is threaded (the RPT-002 guard stays green)", () => {
    const parsed = JSON.parse(renderJson(balance, ctx));
    expect(parsed).not.toHaveProperty("evidenceObligations");
    // Provenance + body survive intact.
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.evidenceReconciliation).toHaveLength(1);
  });
});

/**
 * Unit test for the JSON evidenceObservations object (@SCN-RPT-010).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-010
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * Proves the renderJson evidenceObservations projection in isolation: when a RuntimeEvidenceObservationKindCounts is
 * threaded as the 4th arg, renderJson emits a `evidenceObservations` object carrying ONLY the
 * non-derivable atoms — rawByRuntimeQualityCheck, the per-(scnId, level) attributed counts, and the
 * phantomEvidenceObservation / suspenseEvidenceObservation remainder with locators (project design §3). The summary identity
 * is a DERIVED markdown-only view, so it is NOT serialised. The evidenceObservations object is kept
 * distinct from provenance / evidenceObligations / the reconciliation body; when no evidenceObservations is
 * threaded the existing shape is preserved (the RPT-002 / RPT-008 guards stay green).
 *
 * Parent: (@SCN-RPT-010) — the evidenceObservations-reconciliation spine.
 */
describe("[SCN-RPT-010] the JSON report carries an evidenceObservations object with the non-derivable atoms", () => {
  const evidenceObservations: RuntimeEvidenceObservationKindCounts = {
    rawByRuntimeQualityCheck: { unit: 5, integration: 3, e2e: 0, performance: 0 },
    attributed: [{ scnId: "SCN-A", qualityCheck: "unit", count: 4 }],
    undemandedCount: 0,
    phantomCount: 1,
    suspenseCount: 1,
  };

  it("carries only the atoms (rawByRuntimeQualityCheck, attributed) when threaded; phantom + suspense detail dissolved into rows", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, undefined, evidenceObservations));
    expect(parsed.evidenceObservations).toBeDefined();
    expect(parsed.evidenceObservations.rawByRuntimeQualityCheck).toEqual({ unit: 5, integration: 3, e2e: 0, performance: 0 });
    expect(parsed.evidenceObservations.attributed).toContainEqual({ scnId: "SCN-A", qualityCheck: "unit", count: 4 });
    // The PHANTOM detail array dissolved into the phantom-scenario rows; the
    // SUSPENSE detail array dissolved into the suspense-scenario row — the
    // section carries neither standalone array (no double-report).
    expect(parsed.evidenceObservations).not.toHaveProperty("phantomCount");
    expect(parsed.evidenceObservations).not.toHaveProperty("suspenseCount");
    // The suspense COUNT survives in summary.testVolume — the balance-check identity is kept.
    expect(parsed.summary.testVolume.citesNoScenario).toBe(1);
  });

  it("does NOT serialise the derived identity (markdown-only) — only the atoms", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, undefined, evidenceObservations));
    // The "N evidenceObservations = M + K" line is a derived view; the JSON carries atoms only.
    expect(parsed.evidenceObservations).not.toHaveProperty("identity");
    expect(parsed.evidenceObservations).not.toHaveProperty("evidenceObservations");
  });

  it("keeps evidenceObservations distinct from provenance / evidenceObligations / the reconciliation body", () => {
    const evidenceObligations = { rawScnOccurrences: 10, scenarioCount: 7, excludedOccurrences: 3, untaggedScenarios: [], proseOnlyCodes: [] };
    const parsed = JSON.parse(renderJson(balance, ctx, evidenceObligations, evidenceObservations));
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.evidenceObligations.excludedOccurrences).toBe(3);
    expect(parsed.evidenceObservations).toBeDefined();
    expect(parsed.runProvenance).not.toHaveProperty("evidenceObservations");
    expect(parsed.evidenceReconciliation).toHaveLength(1);
  });

  it("omits evidenceObservations when none is threaded (the RPT-002 / RPT-008 guards stay green)", () => {
    const parsed = JSON.parse(renderJson(balance, ctx));
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.evidenceReconciliation).toHaveLength(1);
  });
});

/**
 * Unit test for the JSON evidenceObligations.untaggedScenarios (@SCN-RPT-014).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-014
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * Proves the renderJson untagged-scenarios projection: `untaggedScenarios` is a NEW
 * non-derivable declared-side datum, so (per §3, like `excludedOccurrences`) it persists
 * on the `evidenceObligations` object beside `excludedOccurrences`. The full {feature,
 * scenario} locators round-trip for machine consumers.
 *
 * Parent: (@SCN-RPT-014) — anchor audit: untagged scenarios.
 */
describe("[SCN-RPT-014] the JSON evidenceObligations carries the untagged scenarios", () => {
  const evidenceObligations = {
    rawScnOccurrences: 10,
    scenarioCount: 7,
    excludedOccurrences: 3,
    untaggedScenarios: [
      { feature: "alpha.feature", scenario: "a scenario with no anchor" },
      { feature: "beta.feature", scenario: "another untagged scenario" },
    ],
    proseOnlyCodes: [],
  };

  it("carries evidenceObligations.untaggedScenarios with the feature : scenario locators", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, evidenceObligations));
    expect(parsed.evidenceObligations.untaggedScenarios).toEqual([
      { feature: "alpha.feature", scenario: "a scenario with no anchor" },
      { feature: "beta.feature", scenario: "another untagged scenario" },
    ]);
  });

  it("keeps untaggedScenarios beside excludedOccurrences on the evidenceObligations object", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, evidenceObligations));
    expect(parsed.evidenceObligations.excludedOccurrences).toBe(3);
    expect(parsed.evidenceObligations).toHaveProperty("untaggedScenarios");
    // Still distinct from provenance and the reconciliation body.
    expect(parsed.runProvenance).not.toHaveProperty("untaggedScenarios");
    expect(parsed.evidenceReconciliation).toHaveLength(1);
  });

  it("emits an empty untaggedScenarios array when there are none", () => {
    const parsed = JSON.parse(
      renderJson(balance, ctx, { ...evidenceObligations, untaggedScenarios: [] })
    );
    expect(parsed.evidenceObligations.untaggedScenarios).toEqual([]);
  });
});

/**
 * Unit test for the JSON evidenceObligations.proseOnlyCodes (@SCN-RPT-015).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-015
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * Proves the renderJson prose-only-codes projection: a NEW non-derivable declared-side
 * datum, so (per §3, like excludedOccurrences / untaggedScenarios) it persists on the
 * evidenceObligations object. The codes round-trip for machine consumers.
 *
 * Parent: (@SCN-RPT-015) — anchor audit: prose-only codes.
 */
describe("[SCN-RPT-015] the JSON evidenceObligations carries the prose-only codes", () => {
  const evidenceObligations = {
    rawScnOccurrences: 10,
    scenarioCount: 7,
    excludedOccurrences: 3,
    untaggedScenarios: [],
    proseOnlyCodes: ["SCN-BAR-013", "SCN-FOO-001"],
  };

  it("carries evidenceObligations.proseOnlyCodes with the dangling codes", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, evidenceObligations));
    expect(parsed.evidenceObligations.proseOnlyCodes).toEqual(["SCN-BAR-013", "SCN-FOO-001"]);
  });

  it("keeps proseOnlyCodes beside excludedOccurrences / untaggedScenarios on the evidenceObligations object", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, evidenceObligations));
    expect(parsed.evidenceObligations.excludedOccurrences).toBe(3);
    expect(parsed.evidenceObligations).toHaveProperty("untaggedScenarios");
    expect(parsed.evidenceObligations).toHaveProperty("proseOnlyCodes");
    expect(parsed.runProvenance).not.toHaveProperty("proseOnlyCodes");
  });

  it("emits an empty proseOnlyCodes array when there are none", () => {
    const parsed = JSON.parse(renderJson(balance, ctx, { ...evidenceObligations, proseOnlyCodes: [] }));
    expect(parsed.evidenceObligations.proseOnlyCodes).toEqual([]);
  });
});
