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
 * reconciliation body (the ledger) is unchanged. The retired `warnings` key
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
import { makeQualityCheckReconciliation, OUTCOME_SIDE_PROFILE } from "../model.js";
import type { Ledger } from "../model.js";

// @SCN-LDG-030: fixtures must mint branded Quality Check Reconciliations via the smart constructor.
// This helper supplies canon-correct PLACEHOLDER sides (content is immaterial to these tests — only
// side PRESENCE is constrained by the invariant) so each fixture routes through the constructor.
function qcr(
  fields: Parameters<typeof makeQualityCheckReconciliation>[0],
): ReturnType<typeof makeQualityCheckReconciliation> {
  const profile = OUTCOME_SIDE_PROFILE[fields.outcome];
  return makeQualityCheckReconciliation({
    ...fields,
    ...(profile.obligation === "Exists" && fields.evidenceObligation === undefined
      ? { evidenceObligation: { qualityCheck: "unit" } }
      : {}),
    ...(profile.observation === "Exists" && fields.evidenceObservation === undefined
      ? { evidenceObservation: { qualityCheck: "unit", scnId: "SCN-FIXTURE-001", status: "passed" } }
      : {}),
  });
}
import type { RunContext } from "../provenance/provenance.js";
import type { RuntimeEvidenceObservationKindCounts } from "../census/evidenceObservations.js";
import { countRuntimeEvidenceObservationKinds } from "../census/evidenceObservations.js";
import { reconcile } from "../reconcile/reconcile.js";
import type { EvidenceObservation, Scenario } from "../model.js";

/** A minimal balanced balance — enough for the renderer to serialise a report. */
const balance: Ledger = {
  scenarioReconciliations: [
    { scnId: "SCN-RPT-002", kind: "scenario", evidenceObservations: [], evidenceObligations: [], verdict: "balanced", qualityCheckReconciliations: [], pendingItems: [], reconcilingItems: [] },
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
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

describe("[SCN-RPT-002] the JSON report carries a provenance object", () => {
  it("carries a top-level provenance with target, source SHA, UTC timestamp, and the inputs used", () => {
    const parsed = JSON.parse(renderJson(balance, ctx));

    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.runProvenance.target).toBe("an-adopters-repository");
    expect(parsed.runProvenance.sourceSha).toBe("905a987c0ffeeba110000000000000000deadbeef");
    // The TOOL's identity, distinct from the target's sourceSha (3F-1916): which
    // spec-controller produced this run.
    expect(parsed.runProvenance.toolSha).toBe("13ee47f271ace511efdb2511276284b4cb50c247");
    expect(parsed.runProvenance.toolVersion).toBe("0.1.0");
    // Second-precision UTC, the same projection the markdown header renders.
    expect(parsed.runProvenance.runTimestamp).toBe("2026-06-27T08:17:53Z");
    // The input paths/flags actually used, keyed by their canonical name.
    expect(parsed.runProvenance.inputs.features).toBe("../an-adopters-repository/features");
    expect(parsed.runProvenance.inputs.vitest).toBe("../an-adopters-repository/vitest-report.json");
  });

  it("keeps the reconciliation body (the ledger) intact alongside provenance, with no retired warnings key", () => {
    const parsed = JSON.parse(renderJson(balance, ctx));

    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
    expect(parsed.ledger.scenarioReconciliations[0].scnId).toBe("SCN-RPT-002");
    expect(parsed.ledger.scenarioReconciliations[0].verdict).toBe("balanced");
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

  it("preserves a null tool SHA as JSON null (the tool is not a git checkout)", () => {
    const parsed = JSON.parse(renderJson(balance, { ...ctx, toolSha: null }));
    expect(parsed.runProvenance.toolSha).toBeNull();
    // The version is always present even when the SHA cannot be read.
    expect(parsed.runProvenance.toolVersion).toBe("0.1.0");
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
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
    expect(parsed).not.toHaveProperty("warnings");
  });

  it("omits evidenceObligations when no corpus is threaded (the RPT-002 guard stays green)", () => {
    const parsed = JSON.parse(renderJson(balance, ctx));
    expect(parsed).not.toHaveProperty("evidenceObligations");
    // Provenance + body survive intact.
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
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
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A) — the balance AND the census fold from ONE
  // corpus, so the census cannot claim an attribution / phantom / suspense the ledger does not
  // carry (the whole point of the runtime-observation tally re-homing onto the Ledger, 3F-2102):
  //   SCN-A: @unit with 4 passing unit credits → attributed [{SCN-A, unit, 4}] (raw unit 4)
  //   1 unit credit citing SCN-PHX-999 (no scenario declares it) → phantom 1 (raw unit 5)
  //   1 integration credit citing NO scenario → suspense 1 (raw integration 1)
  const rpt010Scenarios: Scenario[] = [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] }];
  const rpt010Observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-999", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
  ];
  const rpt010Balance: Ledger = reconcile(rpt010Scenarios, rpt010Observations);
  const evidenceObservations: RuntimeEvidenceObservationKindCounts =
    countRuntimeEvidenceObservationKinds(rpt010Balance);

  it("carries only the atoms (rawByRuntimeQualityCheck, attributed) when threaded; phantom + suspense detail dissolved into rows", () => {
    const parsed = JSON.parse(renderJson(rpt010Balance, ctx, undefined, evidenceObservations));
    expect(parsed.evidenceObservations).toBeDefined();
    expect(parsed.evidenceObservations.rawByRuntimeQualityCheck).toEqual({ unit: 5, integration: 1, e2e: 0, performance: 0 });
    expect(parsed.evidenceObservations.attributed).toContainEqual({ scnId: "SCN-A", qualityCheck: "unit", count: 4 });
    // The PHANTOM detail array dissolved into the phantom-scenario rows; the
    // SUSPENSE detail array dissolved into the suspense-scenario row — the
    // section carries neither standalone array (no double-report).
    expect(parsed.evidenceObservations).not.toHaveProperty("phantomCount");
    expect(parsed.evidenceObservations).not.toHaveProperty("suspenseCount");
    // The suspense COUNT survives in summary.testVolume (folded from the Ledger, 3F-2102) — the
    // balance-check identity is kept.
    expect(parsed.summary.testVolume.citesNoScenario).toBe(1);
  });

  it("does NOT serialise the derived identity (markdown-only) — only the atoms", () => {
    const parsed = JSON.parse(renderJson(rpt010Balance, ctx, undefined, evidenceObservations));
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
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
  });

  it("omits evidenceObservations when none is threaded (the RPT-002 / RPT-008 guards stay green)", () => {
    const parsed = JSON.parse(renderJson(balance, ctx));
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed).not.toHaveProperty("evidenceObservations");
    expect(parsed.runProvenance).toBeDefined();
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
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
    expect(parsed.ledger.scenarioReconciliations).toHaveLength(1);
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

/**
 * Unit test for the JSON report carrying a scenario's Pending Items (@SCN-PND-010).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-PND-010 id matching features/pending-items.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * The markdown side is the genuine red→green of @SCN-PND-010 (the human renderer must
 * learn to emit the ⏳ pending label). This JSON side is the glue-free CONSISTENCY pin:
 * `renderJson` is `JSON.stringify(assembleReport(...))`, and `assembleReport` passes the
 * scenario reconciliations through verbatim under `ledger`, so a scenario's
 * `pendingItems` reach the machine surface WITHOUT any renderer glue. This test pins that
 * the two renderings stay consistent — the machine surface carries the same Pending Items
 * the human surface labels. Green-first (the glue-free path already carries the field); its
 * teeth are the deep-equality on the exact Pending Item, so a dropped/renamed field reds.
 *
 * Parent: (@SCN-PND-010).
 */
describe("[SCN-PND-010] the JSON report carries a scenario's Pending Items", () => {
  const pendingBalance: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-PDX-001",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [],
        reconcilingItems: [],
        pendingItems: [{ qualityCheck: "integration" }],
      },
    ],
  };

  it("serialises a scenario's pendingItems on its ledger account row (glue-free consistency with markdown)", () => {
    const parsed = JSON.parse(renderJson(pendingBalance, ctx));
    const row = parsed.ledger.scenarioReconciliations.find((s: { scnId: string }) => s.scnId === "SCN-PDX-001");
    expect(row).toBeDefined();
    // The machine surface carries the same Pending Item the markdown labels — one IOU at
    // the deferred integration check, one-sided (no outcome, not a reconciling item).
    expect(row.pendingItems).toEqual([{ qualityCheck: "integration" }]);
    // A Pending Item is NOT a reconciling item: it stays out of reconcilingItems entirely.
    expect(row.reconcilingItems).toEqual([]);
  });
});

/**
 * Unit test for the JSON summary carrying the Pending Items tally (@SCN-PND-011).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-PND-011 id
 * matching features/pending-items.feature, so a grep of the id returns both halves.
 *
 * The markdown side is the genuine red→green of @SCN-PND-011 (the human renderer must learn to
 * emit the Pending Items tally line). This JSON side is the glue-free CONSISTENCY pin: `renderJson`
 * is `JSON.stringify(assembleReport(...))`, and the materialised `summary.pending` tally reaches
 * the machine surface WITHOUT any renderer glue, so the two renderings stay consistent — the
 * machine surface carries the same count the human surface renders. Its teeth are the exact count
 * on the exact key, so a dropped/renamed field reds.
 *
 * Parent: (@SCN-PND-011).
 */
describe("[SCN-PND-011] the JSON summary carries the Pending Items tally", () => {
  const pendingBalance: Ledger = {
    scenarioReconciliations: [
      {
        scnId: "SCN-PDX-001",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [],
        reconcilingItems: [],
        pendingItems: [{ qualityCheck: "unit" }, { qualityCheck: "integration" }],
      },
      {
        scnId: "SCN-PDX-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [qcr({ qualityCheck: "unit", outcome: "missing" })],
        reconcilingItems: [qcr({ qualityCheck: "unit", outcome: "missing" })],
        pendingItems: [{ qualityCheck: "integration" }],
      },
    ],
  };

  it("serialises summary.pending counting the Pending Items (glue-free consistency with markdown)", () => {
    const parsed = JSON.parse(renderJson(pendingBalance, ctx));
    // 2 (SCN-PDX-001) + 1 (SCN-PDX-002) = 3 Pending Items — the same tally the markdown renders.
    expect(parsed.summary.pending).toBe(3);
    // The tally is SEPARATE from the verdict counts and never an evidence-obligation outcome.
    expect(parsed.summary.scenarioReconciliations.balanced).toBe(1);
    expect(parsed.summary.scenarioReconciliations.outOfBalance).toBe(1);
    expect(parsed.summary.evidenceObligations.byOutcome).not.toHaveProperty("pending");
  });
});
