/**
 * THE EVIDENCE RECONCILIATION — canon's Layer 1, *"the whole reconciliation: all Scenario
 * Reconciliations taken together"*, and **the key concept the domain models**
 * (`double-entry-manifesto.md`). This module is its home.
 *
 * IT ARRIVED HERE FROM `reconcile/` (3F-2232). After 3F-2202/2203/2204 that module held no domain
 * rule — but it was still a named layer beside the domain doing the concept's own work, which is
 * the shape `functional-domain-modelling.md` rejects: *"orchestration is thin composition, not a
 * named layer."* Constructing a concept is the concept's business. The module's residual tell was
 * already visible — it re-exported `isBalanced` / `hasPendingItems` / `hasBrokenEvidence` FROM
 * `domain/ledger` purely to preserve importers' paths, a shell around behaviour that had already
 * gone home. Every importer now points at the module that declares the symbol.
 *
 * (3F-2233 completes the move: the concept's TYPE, its `Summary`, and the factory that fuses this
 * fold with the summary tally. Today this module holds the fold alone.)
 *
 * The pure declared-vs-observed join, keyed by one flat
 * `qualityCheck` (the two-axis `(kind, level)` grid collapsed). This module is THIN
 * COMPOSITION: the domain RULES it once held moved to the
 * concept modules that own them (3F-1994) — `reconcileEvidenceObligation` (the per-obligation
 * outcome) to `domain/qualityCheckReconciliation`, `verdictFor` / `reconcilingItemsOf` (the
 * account roll-up) to `domain/scenarioReconciliation`, `isBalanced` / `hasPendingItems` /
 * `hasBrokenEvidence` (the whole-run predicates) to `domain/ledger`. `reconcile` is the fold that
 * WALKS the inputs, CALLS those rules, and BUILDS the rows; it is the orchestration, not their home.
 *
 * POSTING-DESTINATION left too (3F-2202) — WHERE an entry lands is canon's own glossary group
 * ("### Posting") and now lives on `domain/posting`: `postingOf` (the citation-routed credits, plus
 * the undemanded-static-check arm) and `staticCheckCreditsPostingTo` (the by-name half, resolved
 * per row in that row's obligation order). The fold no longer DECIDES a destination anywhere — it
 * asks the rule once per credit and files the answer. What remains is assembly: which rows exist,
 * in what order, holding which items.
 *
 * Per the slice design: for each declared quality-check evidenceObligation (a reconciling
 * item), present+pass → satisfied; present+fail → failing; absent →
 * missing. `reconcileEvidenceObligation` branches on the `qualityCheck === "lint"`
 * watermelon discriminator (replacing the retired `kind === "static"` split): a `lint`
 * evidence obligation reconciles against a static-check evidence observation (exists+wired → satisfied;
 * exists+unwired → watermelon; absent → missing); a runtime evidence obligation
 * reconciles against a test result matched by (scnId, quality-check).
 *
 * The scenario VERDICT is binary (superseding the earlier prioritising
 * aggregate): a scenario is `balanced` IFF every required quality-check balances;
 * otherwise `out-of-balance`, carrying the LIST of EVERY non-balanced reconciling
 * item — no prioritisation, no picked winner ("missing beats failing" was a false
 * order that hid one of two genuinely different problems). The renderers list
 * every item.
 *
 * Parent: @SCN-LDG-001.
 */

import type {
  RuntimeQualityCheck,
  Scenario,
  GuardEvidenceObservation,
  EvidenceObservation,
  ScenarioReconciliation,
  PendingItem,
  RuntimeEvidenceObservation,
  Ledger,
} from "../model.js";
import {
  evidenceObligationPairsOf,
  staticCheckEvidenceObligationsOf,
  // THE PENDING PARTITION (3F-2204) — the two exact complements over a scenario's obligations.
  evidenceObligationsOf,
  pendingItemsOf,
} from "../model.js";
import {
  reconcileEvidenceObligation,
  // THE CREDIT-SIDE AND DEGENERATE OUTCOME RULES (3F-2204) — what an entry reconciles TO, as
  // opposed to where it lands. `reconcile` asks; it no longer maps outcomes itself.
  undemandedReconciliationsOf,
  citesUnknownScenarioReconciliationsOf,
  suspenseReconciliationsOf,
  noScnCodeReconciliations,
} from "./qualityCheckReconciliation.js";
import {
  ledgerTally,
  runtimeObservationTally,
  staticObservationTally,
} from "./ledger.js";
import type {
  ScenarioReconciliationTotals,
  EvidenceObligationTotals,
  MissingByQualityCheck,
  LintTally,
} from "./ledger.js";
import {
  verdictFor,
  reconcilingItemsOf,
  // THE ROW-SHAPE RULE (3F-2204) — the both-missing degeneration and its pending clause.
  qualityCheckReconciliationsOf,
} from "./scenarioReconciliation.js";
// THE POSTING RULE (3F-2202) — where an entry lands is canon's own glossary group, so it lives on
// its own concept module. `reconcile` no longer decides a destination; it ASKS.
import { postingOf, staticCheckCreditsPostingTo } from "./posting.js";

export function reconcile(
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[] = []
): Ledger {
  const scenarioReconciliations: ScenarioReconciliation[] = [];

  // THE DECLARED SIDE, prepared once — the three sets the posting rule and the outcome rules read.
  // Each is already the MODEL's own rule (never re-derived here), and each is built ONCE and
  // shared, so no two consumers can drift: `scenarioIds` is which scenarios exist,
  // `evidenceObligationPairs` is what they name at each quality-check (3F-1858), and
  // `staticCheckEvidenceObligations` is which static-check handles they name.
  const scenarioIds = new Set(scenarios.map((d) => d.scnId));
  // The NAMED pairs — the model's rule, built ONCE and shared with the census (3F-1858).
  // Pending obligations are excluded: a pending obligation names nothing.
  const evidenceObligationPairs = evidenceObligationPairsOf(scenarios);
  // The NAMED static check handles — every `@lint=<guard>` obligation across the corpus, the
  // journal's rule. It is what `postingOf` consults to tell a named static check from an
  // undemanded one (which cites nothing, so it posts to SUSPENSE). This replaces the removed
  // `uncitedStaticChecks` derive-and-diff param — the stream is now complete (the running-guard
  // observer emits every running CI static check), so the reconciler recovers the undemanded
  // remainder itself, exactly as it does for an uncited runtime credit.
  const staticCheckEvidenceObligations = staticCheckEvidenceObligationsOf(scenarios);
  // THE ONE ROUTING PASS (3F-2202). Every credit is routed ONCE, by THE posting rule
  // (`domain/posting`), into the structures the fold below reads. `reconcile` no longer DECIDES a
  // destination anywhere — it asks, and files the answer.
  //
  // This replaces two passes that re-stated the SAME four routing decisions (the citation index
  // here and the phantom-id scan further down) plus three stream filters. They agreed by
  // copy-paste, not by construction: either could have grown an arm alone and nothing would have
  // redded — the identical anaemia `evidenceObligationPairsOf` was extracted to cure.
  const byScn = new Map<string, RuntimeEvidenceObservation[]>();
  // The PHANTOM rows, in FIRST-SEEN order (@SCN-LDG-006).
  const phantomIds: string[] = [];
  // The three SUSPENSE streams, kept separate and each in observation order — the suspense row's
  // item order (broken first, then uncited, then the undemanded static checks) is row assembly,
  // owned below, not a routing decision.
  const brokenEvidence: RuntimeEvidenceObservation[] = [];
  const uncited: RuntimeEvidenceObservation[] = [];
  const undemandedGuards: GuardEvidenceObservation[] = [];
  for (const o of evidenceObservations) {
    // The union NARROW — `qualityCheck === "lint"` is the `EvidenceObservation` union's TYPE TAG,
    // not a posting decision. Which axis a credit rides is read here; where it LANDS is the rule's,
    // on both branches.
    if (o.qualityCheck === "lint") {
      const posting = postingOf(o, scenarioIds, staticCheckEvidenceObligations);
      // A static check no `@lint` names cites nothing, so it posts to SUSPENSE — the static
      // analogue of an uncited runtime credit.
      if (posting.kind === "suspense-scenario") undemandedGuards.push(o);
      // `every-naming-scenario` is resolved PER ROW, in that row's own obligation order, by
      // `staticCheckCreditsPostingTo` in the scenario loop below — a static check posts to EVERY
      // account naming it, so it has no single destination to file here.
      continue;
    }
    const posting = postingOf(o, scenarioIds, staticCheckEvidenceObligations);
    switch (posting.kind) {
      case "scenario":
      case "phantom-scenario": {
        // THE CITATION INDEX holds real AND invented ids alike — a phantom row reads its posted
        // credits from here too, so both citation-routed destinations file together.
        const list = byScn.get(posting.scnId) ?? [];
        list.push(o);
        byScn.set(posting.scnId, list);
        if (posting.kind === "phantom-scenario" && !phantomIds.includes(posting.scnId)) {
          phantomIds.push(posting.scnId);
        }
        break;
      }
      case "suspense-scenario":
        // THE SPLIT (@SCN-LDG-017) — `broken` and `cites-nothing` both land on suspense because
        // neither names a scenario, but they are different facts with different remedies (fix the
        // harness vs add the @SCN), so their streams stay apart. The rule already told them apart.
        if (posting.posted === "broken") brokenEvidence.push(o);
        else uncited.push(o);
        break;
    }
  }
  for (const d of scenarios) {
    // THE PENDING PARTITION (@SCN-PND-004) — `pendingItemsOf` and `evidenceObligationsOf`
    // are exact complements over the scenario's obligations, so nothing is dropped and nothing is
    // counted twice. Rule + rationale: `domain/journal`.
    const pendingItems: PendingItem[] = pendingItemsOf(d);

    // The DEBIT side — each NAMED obligation reconciled against the observed evidence.
    const reconciledEvidenceObligations = evidenceObligationsOf(d.evidenceObligations).map((req) =>
      reconcileEvidenceObligation(d.scnId, req, evidenceObservations)
    );

    // The CREDIT side — UNDEMANDED (@SCN-LDG-008): a credit citing THIS real scenario at a
    // quality-check it never declared. Rule + rationale: `domain/qualityCheckReconciliation`.
    const undemandedItems = undemandedReconciliationsOf(
      d.scnId,
      byScn.get(d.scnId) ?? [],
      evidenceObligationPairs
    );

    // The row's SUB-ROWS, degenerating to one `both-missing` item when the row reconciled to
    // nothing either way (@SCN-LDG-009). Rule + rationale: `domain/scenarioReconciliation`.
    const qualityCheckReconciliations = qualityCheckReconciliationsOf(
      reconciledEvidenceObligations,
      undemandedItems,
      pendingItems
    );
    // THE POSTED static-check CREDITS (@SCN-LDG-022) — a static check carries no @SCN, so `byScn`
    // cannot hold it: it is linked by HANDLE, to every row naming it. Rule + rationale:
    // `domain/posting`'s `staticCheckCreditsPostingTo` (3F-2202).
    const staticCheckEvidenceObligationCredits = staticCheckCreditsPostingTo(d, evidenceObservations);
    scenarioReconciliations.push({
      scnId: d.scnId,
      kind: "scenario",
      verdict: verdictFor(qualityCheckReconciliations),
      // THE POSTED CREDITS (@SCN-LDG-022) — every credit CITING this scenario, whatever it
      // reconciles to above. `byScn` is the citation index, so this includes the credit citing a
      // PENDING quality-check, which reconciles `undemanded` (3F-1858 — it used to reconcile to
      // NO ROW AT ALL, the false-green this posting made visible without fixing). It posts and is
      // findable WHATEVER it reconciles to; posting is not classifying, and a misclassification
      // must misfile an entry, never vaporise it. Plus the static check credits this account NAMES,
      // linked by handle (above).
      evidenceObservations: [...(byScn.get(d.scnId) ?? []), ...staticCheckEvidenceObligationCredits],
      // THE POSTED DEBITS (@SCN-LDG-023) — every obligation THIS scenario DECLARES, in document
      // order, keyed by quality-check. The debit half of the same posting: where a credit is
      // routed by its citation, a debit needs no routing at all — the account is the declaration.
      // Includes a PENDING obligation, which partitioned off above and earns NO reconciled row: it
      // posts ANYWAY. Posting is not classifying, on this side too.
      evidenceObligations: [...d.evidenceObligations],
      qualityCheckReconciliations,
      reconcilingItems: reconcilingItemsOf(qualityCheckReconciliations),
      pendingItems,
    });
  }

  // CREDIT-SIDE — PHANTOM scenarios (@SCN-LDG-006). A credit citing an @SCN id
  // that NO scenario matches posts to no real scenario — it lands on a PHANTOM
  // scenario (posting to a non-existent account). One
  // phantom Scenario Reconciliation per undeclared cited id, in first-seen order, its
  // Quality Check Reconciliation(s) carrying the outcome `cites-unknown-scenario` (and the
  // evidence observation's locator, ruling Q5), verdict ALWAYS out-of-balance. Grouped AFTER the
  // scenario rows. (Suspense / undemanded / both-missing are LDG-007/008/009.)
  //
  // `phantomIds` was ROUTED ABOVE (3F-2202) — this block only ASSEMBLES the rows. The scan that
  // stood here re-stated the citation index's four routing decisions verbatim, including the
  // fail-safe arms (a BROKEN credit mints no phantom row; an uncited credit is suspense, never
  // phantom); both now come from the one `postingOf` call.
  for (const scnId of phantomIds) {
    const citations = byScn.get(scnId) ?? [];
    // ASKED, not decided (3F-2204).
    const items = citesUnknownScenarioReconciliationsOf(citations);
    scenarioReconciliations.push({
      scnId,
      kind: "phantom-scenario",
      // ASKED, not restated (3F-2204, the close-gate read). Canon says a phantom row is ALWAYS
      // out-of-balance, and it is — BY CONSTRUCTION, because a phantom row exists only where a
      // credit minted it, so it always carries ≥1 `cites-unknown-scenario` item. Deriving the
      // verdict from the items keeps that a consequence of the rule rather than a constant asserted
      // beside it: a hardcoded verdict would go on reading `out-of-balance` even if the row ever
      // came to carry none, which is precisely the drift the verdict/items lock-step exists to stop.
      verdict: verdictFor(items),
      // The credits that CITE this invented scenario post to it — canon organises the ledger by
      // "real or INVENTED scenario", so a phantom account holds its postings like any other.
      evidenceObservations: [...citations],
      // A phantom account is MINTED BY A CREDIT — no scenario declares it, so nothing can have
      // been named of it. Its debit side is empty by construction (@SCN-LDG-023); the asymmetry
      // with the credit side is real, not an omission.
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      // A phantom scenario declares nothing, so it can carry no Pending Item.
      pendingItems: [],
    });
  }

  // THE SUSPENSE ROW (@SCN-LDG-007) — every entry that names no scenario aggregates into ONE row
  // (sentinel scnId `(no scenario)`), grouped LAST, verdict always out-of-balance.
  //
  // Its three streams were ROUTED by the posting rule (3F-2202); their OUTCOMES and their ORDER
  // are the item concept's (3F-2204, `suspenseReconciliationsOf` — rule + rationale there). What
  // is decided HERE is only whether the row exists at all: suspense is minted by a credit landing
  // on it, so no credit means no row.
  if (brokenEvidence.length > 0 || uncited.length > 0 || undemandedGuards.length > 0) {
    const items = suspenseReconciliationsOf(brokenEvidence, uncited, undemandedGuards);
    scenarioReconciliations.push({
      scnId: "(no scenario)",
      kind: "suspense-scenario",
      // ASKED, not restated — same reason as the phantom row. The `if` above is what makes this
      // out-of-balance by construction: the row exists only when a credit landed on it.
      verdict: verdictFor(items),
      // The credits citing NO scenario post here (@SCN-LDG-022) — the uncited, the broken (it
      // named no test, so it cites nothing whatever scnId it structurally carries), and the
      // undemanded static checks. Together with `byScn` above this exhausts the credit stream.
      evidenceObservations: [...brokenEvidence, ...uncited, ...undemandedGuards],
      // Suspense is MINTED BY A CREDIT too — it declares nothing, so it names nothing
      // (@SCN-LDG-023).
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      // The suspense scenario declares nothing, so it can carry no Pending Item.
      pendingItems: [],
    });
  }

  // UNDECLARABLE WORK (@SCN-LDG-021) — a scenario carrying no @SCN. It is REAL and ORDINARY
  // (`kind: "scenario"`, never phantom or suspense: it exists, and cucumber runs it); what is
  // absent is the CODE its obligation needs in order to link to an observation. It gets its own
  // out-of-balance row so the verdict can see it at all.
  //
  // The item's outcome, its scenario-scope shape and the synthesised `{}` obligation it carries
  // are the item concept's (3F-2204, `noScnCodeReconciliations` — rule + rationale there).
  for (const name of untaggedScenarios) {
    const items = noScnCodeReconciliations();
    scenarioReconciliations.push({
      // The scenario's NAME is its only handle — it has no code. (Precedent: the suspense row's
      // "(no scenario)" sentinel; `featureCodeOf` falls back to the raw id when it cannot parse.)
      scnId: name,
      kind: "scenario",
      // ASKED, not restated — `noScnCodeReconciliations` always returns the one `no-scn-code`
      // item, so the verdict follows from it rather than being asserted alongside it.
      verdict: verdictFor(items),
      // An untagged scenario carries no @SCN, so no credit can cite it — nothing can post here.
      evidenceObservations: [],
      // It reaches the ledger by NAME, carrying no parsed obligations — so it declares no debits
      // either (@SCN-LDG-023).
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      pendingItems: [],
    });
  }

  return { scenarioReconciliations };
}

// -------------------------------------------------------------------------
// THE CONCEPT AND ITS FACTORY (3F-2233) — canon's Layer 1 owns its type, its summary and its
// construction. `reconcile` above builds the Ledger; `summaryOf` tallies it; `evidenceReconciliationOf`
// is the two together, which is what the concept IS: "all Scenario Reconciliations taken together …
// its summary carries the totals and its ledger the detail" (double-entry-manifesto L22/L60).
//
// This is `why-ddd-for-spec-controller.md`'s sentence made executable — "an Evidence Reconciliation
// that computes 'how many balance' because it IS the balance" — and it is what makes summing the
// wrong rows structurally unavailable rather than asserted-against: there is no seam at which a
// caller holds a Ledger and derives its own totals.
// -------------------------------------------------------------------------

/**
 * The materialised test-volume totals (RMD-005) — the runtime evidence-observation kind-counts
 * the markdown's `### Test volume` identity line derives, carried AS DATA. The identity
 * `totalEvidenceObservations = onScenario + onPhantomScenario + onSuspenseScenario` holds by
 * construction (one shared `runtimeObservationTally` fold), so a JSON consumer reads the balance
 * rather than re-deriving it. The three terms are named for the SCENARIO-KIND the credit posted
 * to (the canon grouping): `onScenario` (a scenario's account), `onPhantomScenario` (an
 * invented phantom-scenario account) and `onSuspenseScenario` (the suspense scenario — includes
 * `broken`). This is an identity read off the fold, not a re-map of the outcome handles.
 */
export interface TestVolumeTotals {
  totalEvidenceObservations: number;
  onScenario: number;
  onPhantomScenario: number;
  onSuspenseScenario: number;
}

/**
 * The materialised static-check totals (RMD-005) — the static-check kind-counts the
 * markdown's `### Static checks` line derives, following the census shape exactly:
 * `runningStaticCheckCount` (the volume of running static checks) and `uncitedStaticCheckCount` (how many
 * of them NO `@lint` declares). The named count is IMPLICIT (`running − uncited`) and is
 * not carried (every named static check is already a reconciled `@lint` sub-row).
 */
export interface StaticCheckTotals {
  runningStaticCheckCount: number;
  uncitedStaticCheckCount: number;
}

/** The materialised summary — the totals (manifesto: "the aggregate of the trial balance"). */
export interface Summary {
  scenarioReconciliations: ScenarioReconciliationTotals;
  evidenceObligations: EvidenceObligationTotals;
  /**
   * The Pending Items tally (@SCN-PND-011) — the count of Pending Items across the
   * reconciliation (one per deferred `<quality-check>pending` obligation, evidence-manifesto §11B),
   * SEPARATE from the scenario balanced / out-of-balance counts and the evidence-obligation counts.
   * A Pending Item is deferred, NOT out-of-balance, so it is NEVER folded into
   * `OUT_OF_BALANCE_OUTCOMES` (never a leaf of its own, at any leaf count — the constraint is
   * categorical, not arithmetic) nor into `evidenceObligations` — its own tally.
   * Counts Pending ITEMS, not scenarios-carrying-pending (mirroring the out-of-balance
   * decomposition, which counts obligations, not scenarios). Always present (a pure balance derive,
   * like `lint`); reads 0 when no scenario declares a pending obligation.
   */
  pending: number;
  /** The runtime test-volume kind-counts (RMD-005) — present when the evidenceObservations read is threaded. */
  testVolume?: TestVolumeTotals;
  /**
   * The re-homed raw per-quality-check evidence-observation totals (@SCN-RMD-003, 3F-2102) — a
   * materialised headline the Ledger folds (`runtimeObservationTally`), testVolume-adjacent. It
   * RE-HOMES onto `summary` the raw totals the retired `evidenceObservations` section used to
   * carry: a legitimate aggregate headline (per the done-criterion's fold-vs-store test — three
   * derived totals, not a parallel store of the posted credits). Present exactly when `testVolume`
   * is (both gated on the observation read being threaded).
   */
  rawByRuntimeQualityCheck?: Record<RuntimeQualityCheck, number>;
  /** The static-check kind-counts (RMD-005) — present when the guard read is threaded. */
  staticChecks?: StaticCheckTotals;
  /** The static-only lint evidenceObligation tally (RMD-005) — always present (a pure balance derive). */
  lint: LintTally;
}

/**
 * THE EVIDENCE RECONCILIATION — canon's Layer 1. `summary` carries the totals, `ledger` the detail.
 *
 * NOT the report. The run's PROVENANCE (when, where, which SHA) and the presentation metadata
 * (feature titles) are the report's framing and live on the render payload, not here: canon is
 * explicit that rendering this concept into various formats PRODUCES the report, which "draws its
 * substance from it". "Ledger" is a REJECTED ALIAS for this concept — the ledger is the grid
 * WITHIN it, which is why both fields are named rather than the whole thing collapsing to one.
 */
export interface EvidenceReconciliation {
  summary: Summary;
  ledger: Ledger;
}

/**
 * Materialise the summary totals from the balance — the aggregate the markdown's trial-balance
 * table derives, carried AS DATA so a later render-from-saved-JSON rebuilds it with zero
 * computation (the MATERIALISE ruling). THIN COMPOSITION (3F-2000): the LEDGER-PURE totals
 * (`scenarioReconciliations`, `evidenceObligations`, `pending`, `lint`) come from `ledgerTally`
 * — the Ledger owns its own totals ("the summary is its totals") — and are MERGED here with the
 * census pass-throughs (`testVolume`, `staticChecks`), which are NOT Ledger-pure. The keys are
 * assembled in DOCUMENT ORDER (…, testVolume?, staticChecks?, lint) so the JSON stays
 * byte-identical.
 */
export function summaryOf(
  ledger: Ledger,
  withRuntimeObservations: boolean,
  withStaticChecks: boolean
): Summary {
  const tally = ledgerTally(ledger);
  // The runtime evidence-observation totals are a FOLD OVER THE LEDGER (@SCN-RMD-003, 3F-2102) —
  // the Ledger counts its own posted credits; the parallel census is RETIRED. `testVolume` and the
  // re-homed `rawByRuntimeQualityCheck` derive from THIS fold. The `withRuntimeObservations` flag is
  // now only the GATE (is the runtime-observation axis in play?) — the caller no longer threads a
  // census object at all (the assembler folds the Ledger it already has).
  const observations = runtimeObservationTally(ledger);
  // The static-check totals are a FOLD OVER THE LEDGER too (3F-2118) — the Ledger counts its own
  // posted static-check credits; the parallel static census is RETIRED. `staticChecks` derives from
  // THIS fold. The `withStaticChecks` flag is now only the GATE (is the static-check axis in play?) —
  // the caller no longer threads a census object at all (the assembler folds the Ledger it holds).
  const staticChecks = staticObservationTally(ledger);
  return {
    scenarioReconciliations: tally.scenarioReconciliations,
    evidenceObligations: tally.evidenceObligations,
    pending: tally.pending,
    // The runtime test-volume kind-counts (RMD-005), materialised only when the evidenceObservations
    // read is threaded. The surface reads the fold's per-scenario-kind counts DIRECTLY (an identity
    // — the fold already groups by the scenario-kind the credit posted to). `onScenario` is every
    // credit posted to a scenario's account, which INCLUDES undemanded as a subset
    // (matched-pair + undemanded) — a DIFFERENT number from the reconciliation-matched-attributed
    // (the retired section's `attributed[]` sum, which excluded undemanded). Keeping undemanded
    // inside this count preserves the 3-termed identity `totalEvidenceObservations = onScenario +
    // onPhantomScenario + onSuspenseScenario` (undemanded is a subset here, NOT a 4th identity term)
    // — the same shape the markdown's `### Test volume` line derives. `onPhantomScenario` /
    // `onSuspenseScenario` are the credits posted to the phantom / suspense accounts (suspense
    // includes `broken`).
    ...(withRuntimeObservations
      ? {
          testVolume: {
            // ASKED, not re-derived (3F-2231) — the Ledger's fold computes this total and now
            // returns it. The assembler summed the same record again for it, which is an adapter
            // owning a model number by copied arithmetic.
            totalEvidenceObservations: observations.total,
            onScenario: observations.onScenario,
            onPhantomScenario: observations.onPhantomScenario,
            onSuspenseScenario: observations.onSuspenseScenario,
          },
          // The re-homed raw per-quality-check headline (@SCN-RMD-003) — a materialised Ledger
          // fold, sibling of `testVolume` and present on the SAME gate.
          rawByRuntimeQualityCheck: observations.rawByRuntimeQualityCheck,
        }
      : {}),
    // The static-check kind-counts (RMD-005), materialised only when the static-check axis is in
    // play — now a FOLD OVER THE LEDGER (3F-2118, `staticObservationTally`), symmetric with the
    // runtime `testVolume` fold. The surface keeps the census shape exactly
    // (`{ runningStaticCheckCount, uncitedStaticCheckCount }`; named is implicit). The member detail
    // lives in the rows (named → each scenario's `@lint` sub-row; undemanded → the suspense
    // row) — there is no census section (2.4).
    ...(withStaticChecks ? { staticChecks } : {}),
    // The static-only lint tally (RMD-005), a LEDGER-PURE derive from `ledgerTally` — LAST key in
    // document order (after the census pass-throughs).
    lint: tally.lint,
  };
}

/**
 * BUILD the Evidence Reconciliation from the journal — THE FACTORY (3F-2233).
 *
 * Journal inputs in, whole concept out: the fold posts every entry into the Ledger, and the tally
 * totals it. They are ONE act, not two stages a caller sequences — which is the point. While
 * `reconcile()` and `buildSummary()` were separate, an adapter held a Ledger and derived its own
 * totals, so "the procedure can sum the wrong rows" (`why-ddd-for-spec-controller.md`) was a
 * REACHABLE state. Here there is no such seam: you cannot obtain a summary except from the concept
 * that owns the rows it counts.
 *
 * The two flags are GATES, not data — they state whether the runtime-observation and static-check
 * axes are in play for this run; the counts themselves are always folded from the Ledger.
 */
export function evidenceReconciliationOf(
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[] = [],
  withRuntimeObservations: boolean = false,
  withStaticChecks: boolean = false
): EvidenceReconciliation {
  const ledger = reconcile(scenarios, evidenceObservations, untaggedScenarios);
  return { summary: summaryOf(ledger, withRuntimeObservations, withStaticChecks), ledger };
}
