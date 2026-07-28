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
 * the undemanded-static-guard arm) and `staticGuardCreditsPostingTo` (the by-name half, resolved
 * per row in that row's obligation order). The fold no longer DECIDES a destination anywhere — it
 * asks the rule once per credit and files the answer. What remains is assembly: which rows exist,
 * in what order, holding which items.
 *
 * Per the slice design: for each declared quality-check evidenceObligation (a reconciling
 * item), present+pass → satisfied; present+fail → failing; absent →
 * missing. `reconcileEvidenceObligation` branches on the `qualityCheck === "lint"`
 * watermelon discriminator (replacing the retired `kind === "static"` split): a `lint`
 * evidence obligation reconciles against a static-guard evidence observation (exists+wired → satisfied;
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
  demandedStaticGuardsOf,
  // THE PENDING PARTITION (3F-2204) — the two exact complements over a scenario's obligations.
  demandedEvidenceObligationsOf,
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
  verdictFor,
  reconcilingItemsOf,
  // THE ROW-SHAPE RULE (3F-2204) — the both-missing degeneration and its pending clause.
  qualityCheckReconciliationsOf,
} from "./scenarioReconciliation.js";
// THE POSTING RULE (3F-2202) — where an entry lands is canon's own glossary group, so it lives on
// its own concept module. `reconcile` no longer decides a destination; it ASKS.
import { postingOf, staticGuardCreditsPostingTo } from "./posting.js";

export function reconcile(
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[] = []
): Ledger {
  const scenarioReconciliations: ScenarioReconciliation[] = [];

  // THE DECLARED SIDE, prepared once — the three sets the posting rule and the outcome rules read.
  // Each is already the MODEL's own rule (never re-derived here), and each is built ONCE and
  // shared, so no two consumers can drift: `scenarioIds` is which scenarios exist,
  // `evidenceObligationPairs` is what they demand at each quality-check (3F-1858), and
  // `demandedGuards` is which static-guard handles they demand.
  const scenarioIds = new Set(scenarios.map((d) => d.scnId));
  // The DEMANDED pairs — the model's rule, built ONCE and shared with the census (3F-1858).
  // Pending obligations are excluded: a pending obligation demands nothing.
  const evidenceObligationPairs = evidenceObligationPairsOf(scenarios);
  // The DEMANDED static guard handles — every `@lint=<guard>` obligation across the corpus, the
  // journal's rule. It is what `postingOf` consults to tell a demanded static guard from an
  // undemanded one (which cites nothing, so it posts to SUSPENSE). This replaces the removed
  // `uncitedStaticGuards` derive-and-diff param — the stream is now complete (the running-guard
  // observer emits every running CI static guard), so the reconciler recovers the undemanded
  // remainder itself, exactly as it does for an uncited runtime credit.
  const demandedGuards = demandedStaticGuardsOf(scenarios);
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
  // item order (broken first, then uncited, then the undemanded static guards) is row assembly,
  // owned below, not a routing decision.
  const brokenEvidence: RuntimeEvidenceObservation[] = [];
  const uncited: RuntimeEvidenceObservation[] = [];
  const undemandedGuards: GuardEvidenceObservation[] = [];
  for (const o of evidenceObservations) {
    // The union NARROW — `qualityCheck === "lint"` is the `EvidenceObservation` union's TYPE TAG,
    // not a posting decision. Which axis a credit rides is read here; where it LANDS is the rule's,
    // on both branches.
    if (o.qualityCheck === "lint") {
      const posting = postingOf(o, scenarioIds, demandedGuards);
      // A static guard no `@lint` demands cites nothing, so it posts to SUSPENSE — the static
      // analogue of an uncited runtime credit.
      if (posting.kind === "suspense-scenario") undemandedGuards.push(o);
      // `every-demanding-scenario` is resolved PER ROW, in that row's own obligation order, by
      // `staticGuardCreditsPostingTo` in the scenario loop below — a static guard posts to EVERY
      // account demanding it, so it has no single destination to file here.
      continue;
    }
    const posting = postingOf(o, scenarioIds, demandedGuards);
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
    // THE PENDING PARTITION (@SCN-PND-004) — `pendingItemsOf` and `demandedEvidenceObligationsOf`
    // are exact complements over the scenario's obligations, so nothing is dropped and nothing is
    // counted twice. Rule + rationale: `domain/journal`.
    const pendingItems: PendingItem[] = pendingItemsOf(d);

    // The DEBIT side — each DEMANDED obligation reconciled against the observed evidence.
    const reconciledEvidenceObligations = demandedEvidenceObligationsOf(d.evidenceObligations).map((req) =>
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
    // THE POSTED static-guard CREDITS (@SCN-LDG-022) — a static guard carries no @SCN, so `byScn`
    // cannot hold it: it is linked by HANDLE, to every row demanding it. Rule + rationale:
    // `domain/posting`'s `staticGuardCreditsPostingTo` (3F-2202).
    const demandedGuardCredits = staticGuardCreditsPostingTo(d, evidenceObservations);
    scenarioReconciliations.push({
      scnId: d.scnId,
      kind: "scenario",
      verdict: verdictFor(qualityCheckReconciliations),
      // THE POSTED CREDITS (@SCN-LDG-022) — every credit CITING this scenario, whatever it
      // reconciles to above. `byScn` is the citation index, so this includes the credit citing a
      // PENDING quality-check, which reconciles `undemanded` (3F-1858 — it used to reconcile to
      // NO ROW AT ALL, the false-green this posting made visible without fixing). It posts and is
      // findable WHATEVER it reconciles to; posting is not classifying, and a misclassification
      // must misfile an entry, never vaporise it. Plus the static guard credits this account DEMANDS,
      // linked by handle (above).
      evidenceObservations: [...(byScn.get(d.scnId) ?? []), ...demandedGuardCredits],
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
      // been demanded of it. Its debit side is empty by construction (@SCN-LDG-023); the asymmetry
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
      // undemanded static guards. Together with `byScn` above this exhausts the credit stream.
      evidenceObservations: [...brokenEvidence, ...uncited, ...undemandedGuards],
      // Suspense is MINTED BY A CREDIT too — it declares nothing, so it demands nothing
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
