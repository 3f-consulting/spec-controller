/**
 * Unit tests for the markdown renderer — the summary views: out-of-balance by feature, the corpus
 * census, excluded occurrences, section order and test volume (@SCN-RPT-006, @SCN-RPT-007, @SCN-
 * RPT-008, @SCN-RPT-009, @SCN-RPT-010). Each describe carries its own @SCN id and its own
 * bidirectional-evidence note.
 *
 * SPLIT FROM `markdown.test.ts` AT 3F-3541, AND FOR A MECHANICAL REASON. That file measured 1341
 * code lines against the 400-line test ceiling then in force (retired portfolio-wide on
 * 2026-09-18, 3F-2320; the surviving thresholds moved into `eslint.config.mjs` at 3F-3607),
 * and the complexity gate raises a touched file's standing findings to errors. No assertion
 * moved in the split. The file-local helpers below are copies of that file's own, which is this tree's
 * convention for test fixtures: a helper shared through a module under `src/` would ship in `dist`.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { makeQualityCheckReconciliation, OUTCOME_SIDE_PROFILE } from "../model.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";
import type { EvidenceObservation, Scenario } from "../model.js";
import { summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";

/**
 * Test-local composition of the Evidence Reconciliation from a Ledger fixture (3F-2233).
 *
 * It states NO rule of its own: `summaryOf` is the concept's OWN tally — the very function its
 * factory calls — so this duplicates nothing. Only the entry path differs. `evidenceReconciliationOf`
 * builds from JOURNAL inputs (what production does); these fixtures already hold a Ledger, so they
 * compose the concept around it rather than re-reconciling.
 */
const __er = (ledger: Ledger, wo = false, wg = false): EvidenceReconciliation => ({
  summary: summaryOf(ledger, wo, wg),
  ledger,
});

// @SCN-LDG-030: fixtures must mint branded Quality Check Reconciliations via the smart constructor.
// This helper supplies canon-correct PLACEHOLDER sides (content is immaterial to the renderer, which
// reads no per-QCR side — only side PRESENCE is constrained by the invariant) so each hand-built
// fixture routes through the constructor.
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

/**
 * Unit test for the markdown by-feature grouping (@SCN-RPT-006).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-006 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the byFeatureSection in isolation: renderMarkdown groups the
 * verdict === "out-of-balance" scenarios under their feature code (the <FFF> parsed
 * from each scnId via the shared featureCodeOf parser in src/spec/featureCodes.ts —
 * reused, not re-derived) into a "## Out-of-balance by feature" section, one bullet
 * per feature in first-appearance (document) order with a per-feature count, the
 * balanced scenarios excluded. When no scenario is out of balance the section is
 * OMITTED entirely (the warningsSection / staticCheckSection precedent). Slotted
 * after staticCheckSection, before warningsSection.
 *
 * Teeth: until the emitter lands and is slotted into SECTIONS, every "## Out-of-balance
 * by feature" / grouping / placement assertion reds (the genuine red→green). Markdown-only
 * — the grouped view is NOT duplicated into JSON (project design §3).
 *
 * Parent: (@SCN-RPT-006).
 */
describe("[SCN-RPT-006] the markdown report groups out-of-balance scenarios by feature", () => {
  // A balance whose out-of-balance scenarios span THREE feature codes (LDG ×2,
  // LNT ×1) interleaved with balanced scenarios that must NOT appear. Document
  // order of the out-of-balance scenarios: SCN-LDG-003, SCN-LNT-002, SCN-LDG-007 —
  // so first-appearance feature order is LDG (first seen at SCN-LDG-003), then LNT.
  // Reconciler-built (§11A) for the LDG rows: SCN-LDG-001 balanced (unit satisfied), SCN-LDG-003
  // out-of-balance (unit missing), SCN-LDG-007 out-of-balance (integration failing). Document order
  // of the out-of-balance scenarios stays SCN-LDG-003, SCN-LNT-002, SCN-LDG-007 → first-appearance
  // feature order LDG then LNT (RPT-006 threads no census, so no row here reaches evidenceCell).
  const reconciledNamed = reconcile(
    [
      { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-LDG-003", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-LDG-007", evidenceObligations: [{ qualityCheck: "integration" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" },
      { qualityCheck: "integration", scnId: "SCN-LDG-007", status: "failed" },
    ]
  );
  const spanning: Ledger = {
    scenarioReconciliations: [
      ...reconciledNamed.scenarioReconciliations,
      // HAND-BUILT, not reconciler-true: two fitness rows sharing the `guard-lint` handle at
      // different outcomes (watermelon vs satisfied). The handle collision this once stood for is
      // gone — a credit now answers the obligation of the @SCN it cites and nothing compares the
      // handle (3F-3525) — so these rows are ordinary hand-built fixtures, left for the tree-wide
      // audit of the remaining hand-built ledgers. RPT-006 threads no census, so these never reach
      // evidenceCell.
      {
        scnId: "SCN-LNT-002",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "out-of-balance",
        qualityCheckReconciliations: [
          qcr({ qualityCheck: "fitness", staticCheck: "guard-lint", outcome: "watermelon" }),
        ],
        pendingItems: [],
        reconcilingItems: [
          qcr({ qualityCheck: "fitness", staticCheck: "guard-lint", outcome: "watermelon" }),
        ],
      },
      {
        scnId: "SCN-LNT-009",
        kind: "scenario",
        evidenceObservations: [],
        evidenceObligations: [],
        verdict: "balanced",
        qualityCheckReconciliations: [qcr({ qualityCheck: "fitness", staticCheck: "guard-lint", outcome: "satisfied" })],
        pendingItems: [],
        reconcilingItems: [],
      },
    ],
  };

  it("renders an '### Out-of-balance by feature' table grouping the out-of-balance scenarios under their feature code", () => {
    const md = renderMarkdown(__er(spanning), ctx);

    expect(md).toContain("### Out-of-balance by feature");
    // The total line: 3 of the 5 scenarios are out of balance.
    // The ruled head (3F-3297): scenario rows, not "out-of-balance scenarios" — the old wording
    // read as 5 out of balance.
    expect(md).toContain("3 of 5 scenario rows out of balance, grouped by feature.");
    // The table header (FFF prefix only — full names are added separately).
    expect(md).toContain("| Feature | Count | Out-of-balance `@SCN` ids |");
    // LDG carries two out-of-balance scenarios (SCN-LDG-003, SCN-LDG-007).
    expect(md).toContain("| LDG | 2 | SCN-LDG-003, SCN-LDG-007 |");
    // LNT carries one (SCN-LNT-002).
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });

  it("excludes the balanced scenarios (this is the discrepancy view)", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    // Bound the assertion to THIS section (heading to next section heading), so it is
    // not fooled by the ledger that now follows and lists every scenario.
    const iSection = md.indexOf("### Out-of-balance by feature");
    const rest = md.slice(iSection + 1);
    const nextHeading = rest.search(/\n##/);
    const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
    // The balanced scenarios never surface in the by-feature grouping.
    expect(section).not.toContain("SCN-LDG-001");
    expect(section).not.toContain("SCN-LNT-009");
  });

  it("lists the features in first-appearance (document) order", () => {
    const md = renderMarkdown(__er(spanning), ctx);
    const iTrb = md.indexOf("| LDG |");
    const iLnt = md.indexOf("| LNT |");
    expect(iTrb).toBeGreaterThanOrEqual(0);
    expect(iLnt).toBeGreaterThanOrEqual(0);
    // LDG is first out-of-balance (SCN-LDG-003) so its row leads LNT's.
    expect(iTrb).toBeLessThan(iLnt);
  });

  it("omits the section entirely (total line and all) when no scenario is out of balance", () => {
    const allBalanced: Ledger = reconcile(
      [{ scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" }]
    );
    const md = renderMarkdown(__er(allBalanced), ctx);
    expect(md).not.toContain("### Out-of-balance by feature");
    expect(md).not.toContain("scenario rows out of balance");
  });

  it("slots the by-feature section after the fitness section and before the ledger (no warnings section)", () => {
    // A balance carrying static-check evidenceObligations and an out-of-balance scenario — so
    // both summary-view sections render and their order can be asserted.
    const withAll: Ledger = reconcile(
      [{ scnId: "SCN-LNT-002", evidenceObligations: [{ qualityCheck: "fitness" }] }],
      [{ qualityCheck: "fitness", staticCheck: "guard-lint", exists: true, enforcedOverRealSource: false }]
    );
    const md = renderMarkdown(__er(withAll), ctx);
    const iStatic = md.indexOf("### Fitness evidence obligations");
    const iByFeature = md.indexOf("### Out-of-balance by feature");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iStatic).toBeGreaterThanOrEqual(0);
    expect(iByFeature).toBeGreaterThanOrEqual(0);
    expect(iLedger).toBeGreaterThanOrEqual(0);
    expect(iStatic).toBeLessThan(iByFeature);
    expect(iByFeature).toBeLessThan(iLedger);
    // The warnings section dissolved entirely.
    expect(md).not.toContain("## Warnings");
  });

  it("names each feature in full as '<slug> (<FFF>)' when a code→slug map is threaded", () => {
    // The feature-name map (built from discoverFeatures: featureCode → filename slug).
    const featureNames = new Map([
      ["LDG", "ledger"],
      ["LNT", "fitness-evidence"],
    ]);
    const md = renderMarkdown(__er(spanning, false, false), ctx, undefined, featureNames);
    // Each Feature cell reads "<full-name> (<FFF>)" — the count + ids columns unchanged.
    expect(md).toContain("| ledger (LDG) | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| fitness-evidence (LNT) | 1 | SCN-LNT-002 |");
  });

  it("falls back to the bare FFF for an uncoded id the map doesn't cover", () => {
    // The map covers LDG but NOT LNT — LNT stands in for an uncoded feature (an
    // @SCN-LNT-* id whose LNT no file registers). featureCodeOf yields the FFF; the map
    // misses; the cell renders the bare FFF (the earlier behaviour, preserved).
    const featureNames = new Map([["LDG", "ledger"]]);
    const md = renderMarkdown(__er(spanning, false, false), ctx, undefined, featureNames);
    expect(md).toContain("| ledger (LDG) | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });

  it("renders the bare FFF when no feature-name map is threaded (the 4-arg back-compat path)", () => {
    // The existing callers (and the JSON path) never thread featureNames; the by-feature
    // cut stays byte-identical to its earlier form.
    const md = renderMarkdown(__er(spanning), ctx);
    expect(md).toContain("| LDG | 2 | SCN-LDG-003, SCN-LDG-007 |");
    expect(md).toContain("| LNT | 1 | SCN-LNT-002 |");
  });
});

/**
 * Unit test for the by-feature total line's ungrouped rows (@SCN-RPT-030, 3F-3297).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-030 id matching
 * features/report.feature. The @integration half is the `// @SCN-RPT-030` block in
 * tests/steps/report.steps.ts, over a real reconcile of a stranded citation.
 *
 * Reconciler-built (§11A): `reconcile` mints the phantom-scenario row for a credit citing an @SCN no
 * scenario names, and the suspense-scenario row for a credit citing none — the shapes a real run
 * produces, never hand-built rows.
 */
describe("[SCN-RPT-030] the by-feature total line counts the out-of-balance rows no feature can group", () => {
  const proven = { scnId: "SCN-BFP-001", evidenceObligations: [{ qualityCheck: "unit" as const }] };
  const unproven = { scnId: "SCN-BFP-002", evidenceObligations: [{ qualityCheck: "unit" as const }] };
  const provenCredit = { qualityCheck: "unit" as const, scnId: "SCN-BFP-001", status: "passed" as const };
  const strandedCredit = { qualityCheck: "unit" as const, scnId: "SCN-GONE-001", status: "passed" as const };
  const uncitedCredit = { qualityCheck: "unit" as const, scnId: null, status: "passed" as const };
  const byFeature = (ledger: Ledger): string => {
    const md = renderMarkdown(__er(ledger), ctx);
    const at = md.indexOf("### Out-of-balance by feature");
    return at < 0 ? "" : md.slice(at, md.indexOf("\n## ", at));
  };

  it("names the out-of-balance phantom-scenario row beside the grouped scenario rows, and never groups it", () => {
    const section = byFeature(reconcile([proven, unproven], [provenCredit, strandedCredit]));
    expect(section).toContain(
      "1 of 2 scenario rows out of balance, grouped by feature; 1 phantom-scenario row(s) out of balance, " +
        "not grouped by feature (no feature file names them)."
    );
    expect(section).toContain("| BFP | 1 | SCN-BFP-002 |");
    expect(section).not.toContain("SCN-GONE-001");
  });

  it("names both ungrouped kinds when a phantom-scenario and the suspense-scenario row are out of balance", () => {
    const section = byFeature(reconcile([proven, unproven], [provenCredit, strandedCredit, uncitedCredit]));
    expect(section).toContain(
      "1 of 2 scenario rows out of balance, grouped by feature; 1 phantom-scenario row(s) and 1 " +
        "suspense-scenario row(s) out of balance, not grouped by feature (no feature file names them)."
    );
  });

  it("renders the section with no table when the ungrouped rows are the only ones out of balance", () => {
    const section = byFeature(reconcile([proven], [provenCredit, strandedCredit, uncitedCredit]));
    expect(section).toContain(
      "0 of 1 scenario rows out of balance; 1 phantom-scenario row(s) and 1 suspense-scenario row(s) " +
        "out of balance, not grouped by feature (no feature file names them)."
    );
    expect(section).not.toContain("| Feature | Count |");
  });

  it("adds no tail when every out-of-balance row is a scenario row", () => {
    const section = byFeature(reconcile([proven, unproven], [provenCredit]));
    expect(section).toContain("1 of 2 scenario rows out of balance, grouped by feature.");
    expect(section).not.toContain("not grouped by feature");
  });
});

/**
 * Unit test for the markdown corpus census (@SCN-RPT-007).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-007 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the census in isolation: EVERY scenario is a ledger row (a zero-obligation
 * scenario is a both-missing row, not a second axis), so the census is recoverable from
 * the ledger scenario-count ALONE. The dissolved census section is guarded POSITIVELY over
 * the whole top-level section set (3F-2418): one returning under ANY name reds as unexpected.
 *
 * Parent: (@SCN-RPT-007).
 */
describe("[SCN-RPT-007] the corpus census is recoverable from the ledger scenario-count", () => {
  // Reconciler-built (§11A): SCN-A balanced (unit satisfied); SCN-B out-of-balance
  // (integration missing); SCN-C a genuine zero-obligation scenario cited by no credit →
  // a both-missing row. All three are ledger rows — there is no second axis a scenario can
  // land on — so the census total IS the ledger scenario-count, with nothing to sum in.
  // The section list below is this renderer's FULL top-level emission for this fixture,
  // transcribed from the render and re-proved by mutation when it moves: plant a standalone
  // section into markdown.ts and this describe reds (3F-2418).
  const reconciliationFixture: Ledger = reconcile(
    [
      { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-B", evidenceObligations: [{ qualityCheck: "integration" }] },
      { scnId: "SCN-C", evidenceObligations: [] },
    ],
    [{ qualityCheck: "unit", scnId: "SCN-A", status: "passed" }]
  );

  it("emits exactly its known top-level sections, so a dissolved census section cannot return unnamed", () => {
    // Over a corpus it judged, as every `balance` run's is (3F-3635), so the scenario code errors
    // section is among them — here stating the codes clean.
    const md = renderMarkdown({ ...__er(reconciliationFixture), scenarioCodeErrors: [] }, ctx);
    const sections = md.split("\n").filter((line) => line.startsWith("## "));
    expect(sections).toEqual([
      "## Run provenance",
      "## Scenario code errors",
      "## Summary views",
      "## Scenario Reconciliations",
    ]);
  });

  it("recovers the census from the ledger scenario-count alone — the zero-obligation scenario is a both-missing row, not a second axis", () => {
    const md = renderMarkdown(__er(reconciliationFixture), ctx);
    // The ledger summary counts ALL three scenarios (1 balanced, 2 out-of-balance —
    // SCN-C's both-missing row is one of them), so the census total is on the page directly.
    expect(md).toContain("- 3 Scenario Reconciliation(s): 1 balanced, 2 out-of-balance.");
    // The zero-obligation scenario is a ledger row (a both-missing item), not a separate axis;
    // that there is no second axis at all is the section-list assertion's job, not a second
    // not-toContain here — the positive list forbids "## Warnings" by not listing it.
    expect(md).toContain("SCN-C");
    expect(md).toContain("⊘ Evidence Obligation and Evidence Observation are both missing — the Scenario is untagged and uncited");
  });

  it("places the ledger summary under the '## Scenario Reconciliations' heading at the end, after Summary views", () => {
    const md = renderMarkdown(__er(reconciliationFixture), ctx);
    const iSummary = md.indexOf("## Summary views");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    const iCount = md.indexOf("- 3 Scenario Reconciliation(s):");
    const iTable = md.indexOf("| Scenario | Verdict | Reconciling items |");
    expect(iSummary).toBeGreaterThanOrEqual(0);
    expect(iSummary).toBeLessThan(iLedger);
    expect(iLedger).toBeLessThan(iCount);
    expect(iCount).toBeLessThan(iTable);
  });
});

/**
 * Unit test for the markdown excluded-occurrence bullet (@SCN-RPT-008).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-008 id matching features/report.feature, so a grep of the id returns
 * both halves of the pair.
 *
 * Proves the evidenceObligationsSection extension in isolation: when a EvidenceObligations is
 * threaded as the optional third arg, renderMarkdown(__er(balance, false, false), ctx, corpus) appends
 * "- M @SCN ids seen in non-tag context, excluded" to the LEDGER SUMMARY, after the
 * scenario-count bullet (the standalone census section dissolved). When no corpus is
 * threaded the 2-arg call is byte-green (the summary renders without the excluded bullet).
 *
 * Teeth: until the emitter reads the corpus arg, the excluded bullet is absent, so
 * its assertions red (the genuine red→green). The 2-arg omission case is the
 * back-compat guard (the existing byte/JSON guards pass the corpus to nothing).
 *
 * Parent: (@SCN-RPT-008).
 */
describe("[SCN-RPT-008] the markdown report outcomes the excluded non-tag @SCN occurrences", () => {
  const simple: Ledger = {
    scenarioReconciliations: [
      { scnId: "SCN-A", kind: "scenario", evidenceObservations: [], evidenceObligations: [], verdict: "balanced", qualityCheckReconciliations: [], pendingItems: [], reconcilingItems: [] },
    ],
  };
  const evidenceObligations = { rawScnOccurrences: 10, scenarioCount: 7, excludedOccurrences: 3, untaggedScenarios: [], proseOnlyCodes: [] };

  it("appends a '- M @SCN ids seen in non-tag context, excluded' bullet to the ledger summary when a corpus is threaded", () => {
    const md = renderMarkdown(__er(simple, false, false), ctx, evidenceObligations);
    // The bullet now rides in the ledger summary (the standalone census section
    // was dissolved).
    expect(md).toContain("## Scenario Reconciliations");
    expect(md).toContain("- 3 @SCN ids seen in non-tag context, excluded");
  });

  it("places the excluded bullet within the ledger summary, after the scenario-count bullet and above the ledger table", () => {
    const md = renderMarkdown(__er(simple, false, false), ctx, evidenceObligations);
    const iCount = md.indexOf("- 1 Scenario Reconciliation(s):");
    const iExcluded = md.indexOf("@SCN ids seen in non-tag context, excluded");
    expect(iCount).toBeGreaterThanOrEqual(0);
    expect(iExcluded).toBeGreaterThan(iCount);
    expect(iExcluded).toBeLessThan(md.indexOf("| Scenario | Verdict | Reconciling items |"));
  });

  it("omits the excluded bullet when no corpus is threaded (the 2-arg call still renders the ledger summary)", () => {
    const md = renderMarkdown(__er(simple), ctx);
    // The ledger summary scenario-count still renders.
    expect(md).toContain("- 1 Scenario Reconciliation(s): 1 balanced, 0 out-of-balance.");
    // But the excluded bullet is absent, and the top-level section set is the renderer's
    // known three — the dissolved census section has not returned under any name (3F-2418).
    expect(md).not.toContain("@SCN ids seen in non-tag context, excluded");
    expect(md.split("\n").filter((line) => line.startsWith("## "))).toEqual(["## Run provenance", "## Summary views", "## Scenario Reconciliations"]);
  });
});

/**
 * Unit test for the reformatted report layout (@SCN-RPT-009).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the
 * @SCN-RPT-009 id matching features/report.feature, so a grep of the id returns both
 * halves of the pair.
 *
 * Proves the summary-first / ledger-last structure in isolation: renderMarkdown opens
 * with `# Evidence Reconciliation` (not `# Ledger`), keeps `## Run provenance`
 * first, groups the derived cuts under `## Summary views` (run verdict →
 * evidence reconciliation → test volume → static checks → fitness evidence obligations →
 * out-of-balance by feature), and moves the
 * per-scenario `## Scenario Reconciliations` ledger to the END with its summary lines on top,
 * `## Warnings` last. A pure derive over the balance; markdown-only (the JSON surface
 * is unchanged by the reorg). The RPT-004/005/006/007 scenarios are updated in the
 * same change to the new heading levels / total lines / table form / dissolution.
 */
describe("[SCN-RPT-009] the markdown report renders summary-first, ledger-last", () => {
  // Reconciler-built (§11A): a balanced scenario (unit satisfied), an out-of-balance one (unit
  // missing), and one carrying a static-check watermelon — so the full section set renders and the
  // summary-first / ledger-last ordering can be asserted.
  const reformatted: Ledger = reconcile(
    [
      { scnId: "SCN-LDG-001", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-LDG-002", evidenceObligations: [{ qualityCheck: "unit" }] },
      { scnId: "SCN-LNT-001", evidenceObligations: [{ qualityCheck: "fitness" }] },
    ],
    [
      { qualityCheck: "unit", scnId: "SCN-LDG-001", status: "passed" },
      { qualityCheck: "fitness", staticCheck: "lint:guard-lint", scnId: "SCN-LNT-001", exists: true, enforcedOverRealSource: false },
    ]
  );

  it("titles the report '# Evidence Reconciliation', not '# Ledger' or '# Spec reconciliation'", () => {
    const md = renderMarkdown(__er(reformatted), ctx);
    // The H1 opens the report — the report IS the reconciliation. "Ledger" names
    // only the INPUT in canon; the reconciled OUTPUT is never titled "Ledger".
    expect(md.startsWith("# Evidence Reconciliation")).toBe(true);
    // Neither prior H1 (the "# Ledger" original, nor the "# Spec reconciliation" interim)
    // may appear as a line; the per-scenario rows now live under the "## Scenario
    // Reconciliations" H2 (renamed from "## Ledger").
    const lines = md.split("\n");
    expect(lines).not.toContain("# Ledger");
    expect(lines).not.toContain("# Spec reconciliation");
    expect(lines).toContain("## Scenario Reconciliations");
  });

  it("renders the sections in summary-first / ledger-last order", () => {
    const md = renderMarkdown(__er(reformatted), ctx);
    const order = [
      "# Evidence Reconciliation",
      "## Run provenance",
      "## Summary views",
      "### Evidence reconciliation",
      "### Fitness evidence obligations",
      "### Out-of-balance by feature",
      "## Scenario Reconciliations",
    ].map((h) => md.indexOf(h));
    // Every section is present...
    for (const i of order) expect(i).toBeGreaterThanOrEqual(0);
    // ...and in strictly increasing document order.
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]!).toBeLessThan(order[i]!);
    }
    // The `## Warnings` section dissolved entirely — the ledger is now LAST.
    expect(md).not.toContain("## Warnings");
  });

  it("moves the per-scenario ledger to the end, with its summary lines on top of the table", () => {
    const md = renderMarkdown(__er(reformatted), ctx);
    const iLedger = md.indexOf("## Scenario Reconciliations");
    const iSummaryLine = md.indexOf("- 3 Scenario Reconciliation(s): 1 balanced, 2 out-of-balance.");
    const iTable = md.indexOf("| Scenario | Verdict | Reconciling items |");
    expect(iLedger).toBeLessThan(iSummaryLine);
    expect(iSummaryLine).toBeLessThan(iTable);
    // The ledger is the LAST major view (the warnings axis dissolved).
    expect(iTable).toBeGreaterThan(md.indexOf("### Out-of-balance by feature"));
  });

  it("labels the ledger's reconciling items by tag (unit / fitness), never by the internal kind (runtime / static)", () => {
    const md = renderMarkdown(__er(reformatted), ctx);
    // The runtime evidenceObligation renders its bare LEVEL; the static (@fitness) evidenceObligation
    // renders the tag word "fitness" — both level-less of the kind axis.
    expect(md).toContain("| SCN-LDG-002 | ✗ out-of-balance | unit ∅ Evidence Observation is missing |");
    expect(md).toContain(
      "| SCN-LNT-001 | ✗ out-of-balance | fitness 🍉 Evidence Observation is passing but fabricated |"
    );
    // The kind axis ("runtime" / "static") is never rendered in the report.
    expect(md).not.toContain("runtime/");
    expect(md).not.toContain("static 🍉");
  });
});

/**
 * Unit test for the markdown Test volume cut (@SCN-RPT-010).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the @SCN-RPT-010
 * id matching features/report.feature, so a grep of the id returns both halves.
 *
 * Proves the testVolumeSection in isolation: when a RuntimeEvidenceObservationKindCounts is threaded as
 * the 4th arg, renderMarkdown emits a "### Test volume" cut under Summary views — the
 * balancing identity line ("N evidenceObservations = a on scenarios + b on phantom scenarios + c on the suspense scenario", a derived
 * view) then a by-level evidenceObservation table with ALL four levels (e2e/performance zeros
 * shown — a fixed tally like Evidence reconciliation), levels read as lowercase tag words. When
 * no evidenceObservations is threaded the 3-arg call omits the cut (the back-compat guard).
 *
 * Parent: (@SCN-RPT-010) — the evidenceObservations-reconciliation spine.
 */
describe("[SCN-RPT-010] the markdown report renders the Test volume evidenceObservations reconciliation", () => {
  // RECONCILER-TRUE FIXTURE (evidence-manifesto §11A, 3F-1894). The balance AND the census are
  // PRODUCED by reconcile() + countRuntimeEvidenceObservationKinds() over ONE corpus, so the census
  // cannot claim an attribution / phantom / suspense the ledger does not carry — which is exactly
  // the shape this block used to embody (an all-empty SCN-A row beside a census asserting
  // attributed 4 / phantom 1 / suspense 3, with NO phantom row anywhere). The corpus folds to the
  // same kind-counts (raw 5 unit + 3 integration = 8; 4 attributed + 1 phantom + 3 suspense = 8):
  //   SCN-A: @unit with 4 passing unit credits → attributed [{SCN-A, unit, 4}]
  //   1 unit credit citing SCN-PHX-001 (no scenario carries it) → phantom 1 (raw unit 5)
  //   3 integration credits citing NO scenario → suspense 3 (raw integration 3)
  const scenarios: Scenario[] = [
    { scnId: "SCN-A", evidenceObligations: [{ qualityCheck: "unit" }] },
  ];
  const observations: EvidenceObservation[] = [
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-A", status: "passed" },
    { qualityCheck: "unit", scnId: "SCN-PHX-001", status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
    { qualityCheck: "integration", scnId: null, status: "passed" },
  ];
  const balance: Ledger = reconcile(scenarios, observations);

  it("[SCN-RPT-010] renders a '### Test volume' section with the three-way balancing identity line", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    expect(md).toContain("### Test volume");
    expect(md).toContain("8 evidence observations = 4 on scenarios + 1 on phantom scenarios + 3 on the suspense scenario.");
  });

  it("renders a by-level evidenceObservation table with all four levels, zeros shown, levels as lowercase tag words", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    expect(md).toContain("| Quality-check | Evidence observations |");
    expect(md).toContain("| unit | 5 |");
    expect(md).toContain("| integration | 3 |");
    expect(md).toContain("| e2e | 0 |");
    expect(md).toContain("| performance | 0 |");
  });

  it("slots Test volume under Summary views, after Evidence reconciliation and before the ledger", () => {
    const md = renderMarkdown(__er(balance, true, false), ctx);
    const iSummary = md.indexOf("## Summary views");
    const iHeadline = md.indexOf("### Evidence reconciliation");
    const iVolume = md.indexOf("### Test volume");
    const iLedger = md.indexOf("## Scenario Reconciliations");
    expect(iSummary).toBeLessThan(iHeadline);
    expect(iHeadline).toBeLessThan(iVolume);
    expect(iVolume).toBeLessThan(iLedger);
  });

  it("omits the cut entirely when no evidenceObservations aggregate is threaded (the 3-arg back-compat path)", () => {
    const md = renderMarkdown(__er(balance), ctx);
    expect(md).not.toContain("### Test volume");
  });
});
