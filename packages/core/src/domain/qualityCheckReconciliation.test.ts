/**
 * Unit tests for the Quality Check Reconciliation concept's OWN behaviour
 * (src/domain/qualityCheckReconciliation.ts) — the pure derivation
 * `reconcileEvidenceObligation`.
 *
 * Bidirectional evidence (discipline): the describe/it strings carry the @SCN-LDG-NNN id
 * matching features/ledger.feature, so a grep of the id returns both halves of the pair
 * (Evidence Manifesto §9). Asserts the concept's pure function in isolation (§11A — the
 * @integration arm in tests/steps/ledger.steps.ts drives the same behaviour through the
 * parse → reconcile → renderJson pipeline).
 */

import { describe, it, expect } from "vitest";
import {
  reconcileEvidenceObligation,
  makeQualityCheckReconciliation,
  OUTCOME_SIDE_PROFILE,
} from "./qualityCheckReconciliation.js";
import type { Outcome } from "./qualityCheckReconciliation.js";
import type { EvidenceObligation, EvidenceObservation } from "./journal.js";

describe("[SCN-LDG-026] a Quality Check Reconciliation carries the evidence obligation it reconciles (the debit side)", () => {
  it("a missing runtime reconciliation carries its evidence obligation and no observation — the pure debit case", () => {
    // The isolating case: a required @unit obligation with NO matching observation reconciles
    // `missing` (the runtime branch, `req` present and no `match`). It is the pure DEBIT — the
    // obligation exists, its matching observation is absent — so the reconciliation carries the
    // obligation it reconciles while the credit side stays absent (@SCN-LDG-027 adds the credit).
    const obligation: EvidenceObligation = { qualityCheck: "unit" };
    const reconciliation = reconcileEvidenceObligation("SCN-LDG-026", obligation, []);

    // Outcome is the pure-debit `missing` (obligation present, observation absent).
    expect(reconciliation.outcome).toBe("missing");
    // The DEBIT side: the reconciliation carries the very obligation it reconciles, on the item
    // itself — not joined from a separate scenario-level array at print time.
    expect(reconciliation.evidenceObligation).toEqual(obligation);
    // The CREDIT side is absent on a `missing` outcome — this SI adds only the debit half.
    expect(
      (reconciliation as { evidenceObservation?: unknown }).evidenceObservation
    ).toBeUndefined();
  });
});

describe("[SCN-LDG-028] a lint missing reconciliation carries its obligation and no observation — an absent guard is an absence", () => {
  it("a lint missing reconciliation carries its obligation and no observation — an absent guard's {exists:false} is not an observation", () => {
    // The lint (static-check) branch, the ISOLATING absent-guard case: a required @lint obligation
    // whose guard is read as the negative fact {exists:false, enforcedOverRealSource:false} — an
    // ABSENCE, not an observed piece of evidence. reconcileEvidenceObligation FINDS that record (so
    // it can distinguish absent from watermelon), but an absence is not an observation: it must NOT
    // be carried as the credit side. Canon (double-entry-manifesto.md line 36): missing = Obligation
    // Exists, Observation None. This is the lint analogue of the runtime pure-debit (@SCN-LDG-026),
    // which already carries none — the two producers must be symmetric.
    const obligation: EvidenceObligation = { qualityCheck: "lint", staticCheck: "lint:absent-guard" };
    const absentGuard: EvidenceObservation = {
      qualityCheck: "lint",
      staticCheck: "lint:absent-guard",
      exists: false,
      enforcedOverRealSource: false,
    };
    const reconciliation = reconcileEvidenceObligation("SCN-LDG-028", obligation, [absentGuard]);

    // Outcome is the pure-debit `missing` (obligation present, its guard genuinely absent).
    expect(reconciliation.outcome).toBe("missing");
    // The DEBIT side: the reconciliation carries the very obligation it reconciles.
    expect(reconciliation.evidenceObligation).toEqual(obligation);
    // The CREDIT side is absent: an absent guard's {exists:false} is an ABSENCE, not an observation,
    // so nothing is carried — uniform with the runtime `missing` path.
    expect(
      (reconciliation as { evidenceObservation?: unknown }).evidenceObservation
    ).toBeUndefined();
  });
});

describe("[SCN-LDG-030] a Quality Check Reconciliation's carried sides are consistent with its outcome (the invariant)", () => {
  // A REAL debit and a REAL credit — the content is immaterial to the (outcome, side-presence)
  // invariant, which turns only on PRESENCE. Reused across every outcome below.
  const sampleObligation: EvidenceObligation = { qualityCheck: "unit" };
  const sampleObservation: EvidenceObservation = {
    qualityCheck: "unit",
    scnId: "SCN-LDG-030",
    status: "passed",
  };

  // Expectations are DERIVED from the type-forced profile map (iterating its entries), never a
  // hand-copied list — a new outcome, forced to declare its row, is swept automatically.
  for (const [outcomeKey, profile] of Object.entries(OUTCOME_SIDE_PROFILE)) {
    const outcome = outcomeKey as Outcome;
    const obligationExists = profile.obligation === "Exists";
    const observationExists = profile.observation === "Exists";

    it(`${outcome}: canon-correct sides construct and their presence matches the canon row`, () => {
      const reconciliation = makeQualityCheckReconciliation({
        outcome,
        ...(obligationExists ? { evidenceObligation: sampleObligation } : {}),
        ...(observationExists ? { evidenceObservation: sampleObservation } : {}),
      });
      // Side-PRESENCE — not content — matches the canon row for this outcome.
      expect(reconciliation.evidenceObligation !== undefined).toBe(obligationExists);
      expect(reconciliation.evidenceObservation !== undefined).toBe(observationExists);
    });

    it(`${outcome}: a forbidden obligation side is unconstructible — it throws`, () => {
      // FLIP the obligation side away from canon: carry it where the row says None, omit it where
      // the row says Exists. Either divergence is a canon-inconsistent pair the brand forbids.
      expect(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? {} : { evidenceObligation: sampleObligation }),
          ...(observationExists ? { evidenceObservation: sampleObservation } : {}),
        })
      ).toThrow();
    });

    it(`${outcome}: a forbidden observation side is unconstructible — it throws`, () => {
      // FLIP the observation side away from canon (mirror of the obligation flip above).
      expect(() =>
        makeQualityCheckReconciliation({
          outcome,
          ...(obligationExists ? { evidenceObligation: sampleObligation } : {}),
          ...(observationExists ? {} : { evidenceObservation: sampleObservation }),
        })
      ).toThrow();
    });
  }
});

/**
 * The CANON-PIN on OUTCOME_SIDE_PROFILE itself (@SCN-LDG-031, 3F-2039).
 *
 * @SCN-LDG-030 (above) pins each EMITTED QualityCheckReconciliation to OUTCOME_SIDE_PROFILE — but
 * that map is the code's OWN artefact, and nothing pinned IT to the manifesto. So a profile row and
 * a producer wrong IN THE SAME DIRECTION agree, throw nothing, and pass everything (the exact fault
 * shape that shipped one level up, 3F-2016). The only backstop for the map itself is an independent
 * recording of canon — this pin. It closes the chain: constructor → profile → canon.
 *
 * The expectation below is an INDEPENDENT hand-transcription of the manifesto's Evidence Obligation
 * and Evidence Observation columns (`the maintainers' private notes` lines 35-44) — the
 * @SCN-RPT-025 idiom. It is a STANDALONE LITERAL: it is NOT OUTCOME_SIDE_PROFILE, NOT derived from
 * it, NOT parsed from the manifesto file, NOT imported. A circular read (deriving the expectation
 * from OUTCOME_SIDE_PROFILE) would reproduce the tautology this pin exists to retire — two
 * independent recordings must AGREE for the assertion to mean anything (double-entry).
 *
 * Keyed by the type-forced `Outcome` union (a `Record<Outcome, …>`): a new union member cannot
 * compile without a canon row here, so OUTCOME_SIDE_PROFILE can never grow an outcome the manifesto
 * has not vouched for.
 *
 * Teeth: the code is already canon-correct, so this pin is GREEN on landing — there is no natural
 * red→green. Its teeth are demonstrated by MUTATION (proven both directions in the PR): flip any
 * OUTCOME_SIDE_PROFILE row's obligation Exists→None, or its observation None→Exists, and the
 * matching `it.each` row reds. Without that demonstration the pin is itself a watermelon.
 *
 * Parent: (@SCN-LDG-031).
 */
describe("[SCN-LDG-031] OUTCOME_SIDE_PROFILE matches the manifesto's per-outcome side-presence columns", () => {
  // The manifesto's Evidence Obligation / Evidence Observation columns, hand-transcribed from
  // the maintainers' private notes lines 35-44 — the INDEPENDENT source of truth (never a
  // re-read of OUTCOME_SIDE_PROFILE). Type-forced over the whole Outcome union: a new member cannot
  // join without its canon row here, so the pin can never fall behind the outcomes it governs.
  const CANON_SIDE_PROFILE: Record<
    Outcome,
    { obligation: "Exists" | "None"; observation: "Exists" | "None" }
  > = {
    satisfied: { obligation: "Exists", observation: "Exists" }, // manifesto line 35
    missing: { obligation: "Exists", observation: "None" }, // manifesto line 36
    failing: { obligation: "Exists", observation: "Exists" }, // manifesto line 37
    watermelon: { obligation: "Exists", observation: "Exists" }, // manifesto line 38
    "no-scn-code": { obligation: "Exists", observation: "None" }, // manifesto line 39
    "cites-unknown-scenario": { obligation: "None", observation: "Exists" }, // manifesto line 40
    "cites-no-scenario": { obligation: "None", observation: "Exists" }, // manifesto line 41
    "no-evidence-obligation": { obligation: "None", observation: "Exists" }, // manifesto line 42
    broken: { obligation: "None", observation: "None" }, // manifesto line 43
    "both-missing": { obligation: "None", observation: "None" }, // manifesto line 44
  };

  it.each(Object.entries(CANON_SIDE_PROFILE) as [Outcome, (typeof CANON_SIDE_PROFILE)[Outcome]][])(
    'the "%s" outcome\'s side-presence equals its manifesto row',
    (outcome, canonRow) => {
      expect(OUTCOME_SIDE_PROFILE[outcome]).toEqual(canonRow);
    }
  );
});
