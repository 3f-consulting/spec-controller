/**
 * The reconcile core — the pure declared-vs-observed join, keyed by one flat
 * `qualityCheck` (the two-axis `(kind, level)` grid collapsed). This module is now THIN
 * COMPOSITION (index → reconcile → assemble): the domain RULES it once held moved to the
 * concept modules that own them (3F-1994) — `reconcileEvidenceObligation` (the per-obligation
 * outcome) to `domain/qualityCheckReconciliation`, `verdictFor` / `reconcilingItemsOf` (the
 * account roll-up) to `domain/scenarioReconciliation`, `isBalanced` / `hasPendingItems` /
 * `hasBrokenEvidence` (the whole-run predicates) to `domain/ledger`. `reconcile` is the fold
 * that posts the entries and calls those rules; it is the orchestration, not their home.
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
  QualityCheckReconciliation,
  PendingItem,
  RuntimeEvidenceObservation,
  Ledger,
} from "../model.js";
import { evidenceObligationPairsOf } from "../model.js";
import { reconcileEvidenceObligation } from "../domain/qualityCheckReconciliation.js";
import { verdictFor, reconcilingItemsOf } from "../domain/scenarioReconciliation.js";

// The whole-run verdict surface lives WITH the Ledger concept (`domain/ledger`, 3F-1994);
// re-exported here so the frozen v1 barrel (`index.ts`, @SCN-API-001) and every existing
// `reconcile.js` importer keep the same surface — only the predicates' home moved.
export { isBalanced, hasPendingItems, hasBrokenEvidence } from "../domain/ledger.js";

export function reconcile(
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[] = []
): Ledger {
  const scenarioReconciliations: ScenarioReconciliation[] = [];

  // The credit-consuming SPINE: index the runtime evidence observations
  // (credits) the reconciler now consumes, alongside the declared side. `byScn` groups
  // credits by the scnId they cite; `evidenceObligationPairs` is the set of DEMANDED
  // `(scnId, qualityCheck)` evidence obligations. The spine is GENERAL — it indexes ALL credits so
  // LDG-007/008/009 build the suspense / undemanded / both-missing rows on it — even
  // though THIS sub-issue emits only the phantom case. static guard evidence observations carry no scnId
  // (qualityCheck "lint"), so only runtime evidence observations are indexed.
  const scenarioIds = new Set(scenarios.map((d) => d.scnId));
  // The DEMANDED pairs — the model's rule, built ONCE and shared with the census (3F-1858).
  // Pending obligations are excluded: a pending obligation demands nothing.
  const evidenceObligationPairs = evidenceObligationPairsOf(scenarios);
  // The DEMANDED static guard handles — every `@lint=<guard>` obligation across the corpus. A
  // `lint` evidence observation whose guard is NOT in this set is an UNDEMANDED static guard: it
  // cites no scenario, so it posts to the SUSPENSE row. This replaces the
  // removed `unattributedStaticGuards` derive-and-diff param — the stream is now complete
  // (the running-guard observer emits every running CI static guard), so the reconciler recovers
  // the undemanded remainder itself, exactly as it does for an uncited runtime credit.
  const demandedGuards = new Set<string>();
  for (const d of scenarios) {
    for (const o of d.evidenceObligations) {
      if (o.qualityCheck === "lint" && o.staticGuard !== undefined) demandedGuards.add(o.staticGuard);
    }
  }
  const byScn = new Map<string, RuntimeEvidenceObservation[]>();
  for (const o of evidenceObservations) {
    if (o.qualityCheck === "lint") continue;
    // THE FAIL-SAFE, second arm (@SCN-LDG-017): a BROKEN credit is never indexed against a
    // scenario — it named no test, so it cites no scenario, and it must post to no scenario's row
    // (neither as a matched credit above nor as an `undemanded` one below). It posts EXACTLY ONCE,
    // on the SUSPENSE row.
    if (o.broken === true) continue;
    if (o.scnId === null) continue; // an uncited credit — it posts to the SUSPENSE scenario (below).
    const list = byScn.get(o.scnId) ?? [];
    list.push(o);
    byScn.set(o.scnId, list);
  }
  for (const d of scenarios) {
    // PENDING PARTITION (@SCN-PND-004) — a `<quality-check>pending` obligation (the
    // `pending: true` flag from PND-001, evidence-manifesto §11B) is deliberately DEFERRED.
    // Split it OFF here, BEFORE the observation match: it becomes ONE one-sided Pending
    // Item, never flows through `reconcileEvidenceObligation`, never becomes a
    // QualityCheckReconciliation, never a reconciling item ("one-sided: nothing is
    // reconciled"). Only the NON-pending obligations reconcile below.
    //
    // The pending pair is NOT in `evidenceObligationPairs` (3F-1858): a pending obligation
    // demands nothing, so an observation citing that pair is `undemanded` — "exactly as when
    // nothing was declared at all" (canon, Pending Item). It previously STAYED in the set, which
    // left such a credit posting NOWHERE: excluded from `undemanded` by the pair-check AND from
    // the debit side by this partition. Zero rows, balanced, exit 0 — a run canon says must fail.
    //
    // The Pending Item ITSELF stays verdict-neutral and run-neutral — it is not a reconciling
    // item and `verdictFor` / `reconcilingItemsOf` / `isBalanced` see none of it. When such a row
    // IS out of balance it is the CREDIT that did it, never the Pending Item; the two are
    // different things that can sit on the same row (@SCN-PND-005 asserts exactly that).
    const pendingItems: PendingItem[] = d.evidenceObligations
      .filter((req) => req.pending)
      .map((req) => ({ qualityCheck: req.qualityCheck }));
    const activeObligations = d.evidenceObligations.filter((req) => !req.pending);

    // The declared side: each declared (non-pending) evidence obligation reconciled against
    // the observed evidence.
    const reconciledEvidenceObligations = activeObligations.map((req) =>
      reconcileEvidenceObligation(d.scnId, req, evidenceObservations)
    );

    // CREDIT-SIDE — UNDEMANDED (@SCN-LDG-008). A credit citing THIS real scenario at a
    // quality-check it did NOT declare posts to a real account against no evidence obligation — the
    // GENERAL case (it applies whether or not the scenario carries other evidence obligations). It becomes
    // a credit-side Quality Check Reconciliation ON THIS REAL row, outcome `undemanded`, carrying
    // the evidence observation locator (ruling Q5). The pair-check (`evidenceObligationPairs`) is what distinguishes
    // undemanded from a matched credit — a credit at a DECLARED (scnId, quality-check) pair
    // reconciles as satisfied/failing above and is NOT re-listed here.
    const undemandedItems: QualityCheckReconciliation[] = (byScn.get(d.scnId) ?? [])
      .filter((o) => !evidenceObligationPairs.has(`${d.scnId} ${o.qualityCheck}`))
      .map((o) => ({
        qualityCheck: o.qualityCheck,
        outcome: "undemanded" as const,
        // The CREDIT side (@SCN-LDG-027): the citing observation this item reconciles, carried on
        // the reconciliation itself. `undemanded` is credit-only — no obligation is in scope.
        evidenceObservation: o,
        ...(o.locator !== undefined ? { locator: o.locator } : {}),
      }));

    // BOTH-MISSING (@SCN-LDG-009) — the NEITHER-side outcome. When the reconciler
    // emitted NOTHING either way (zero declared evidence obligations AND zero undemanded credits — the
    // scenario reconciles to zero rows on BOTH sides), it posts ONE degenerate Quality Check
    // Reconciliation, blank on both sides (no qualityCheck: neither a debit evidence obligation nor a
    // credit evidence observation), outcome `both-missing`, verdict out-of-balance. Detection keys on
    // rows-emitted (the concatenated set is empty), NOT on evidenceObligations.length === 0 —
    // a zero-evidence obligation scenario WHOSE @SCN IS cited by a stray credit (@SCN-LDG-010, the twin)
    // already produced an `undemanded` row above, so it falls through here, never both-missing.
    // Retires the no-evidence-declared warning (@SCN-WRN-001 Update): the zero-evidence scenario
    // is now this out-of-balance row, not a separate authoring-quality axis.
    // BOTH-MISSING GUARD (@SCN-LDG-009, fixed @SCN-PND-004) — the degenerate row fires
    // ONLY on zero reconciled rows AND zero Pending Items. A scenario whose ONLY obligation
    // is pending reconciles to zero rows on both sides but is NOT both-missing: it is
    // balanced-with-pending (the partition made "nothing is reconciled" true by
    // construction). Absent the pending-items clause, an only-pending scenario would post a
    // spurious both-missing. (Forward-compatible with slice 4: a bare-empty scenario — no
    // obligation, no pending — stays both-missing.)
    const rows = [...reconciledEvidenceObligations, ...undemandedItems];
    const qualityCheckReconciliations: QualityCheckReconciliation[] =
      rows.length === 0 && pendingItems.length === 0 ? [{ outcome: "both-missing" }] : rows;
    // THE POSTED static guard CREDITS (@SCN-LDG-022) — a static guard credit carries no @SCN, so `byScn` (the
    // citation index) cannot hold it: its link to an account is the STATIC GUARD HANDLE. This scenario's
    // `@lint` obligations name the handles it demands, so the static guard credits answering them post
    // HERE — MIRRORING `reconcileEvidenceObligation`, which follows the SAME link (by handle) to
    // put each lint outcome on this very row. The credit sits on the account its outcome already
    // lands on. The complement — a static guard NO obligation demands — belongs to no account and posts
    // to SUSPENSE (`undemandedGuards`, below). Together: every static guard credit posts to at
    // least one account, never to none — to EVERY account that demands it (a run is evidence for
    // all demanders), or to suspense if none does. NOT "exactly one" (canon,
    // double-entry-manifesto.md line 160): that is the runtime property, over-generalised.
    const demandedGuardCredits: GuardEvidenceObservation[] = [];
    for (const o of d.evidenceObligations) {
      // Every `@lint` obligation, INCLUDING a pending one: posting is not classifying, so a credit
      // posts whatever its obligation later reconciles to (or fails to).
      if (o.qualityCheck !== "lint" || o.staticGuard === undefined) continue;
      const guard = o.staticGuard;
      const obs = evidenceObservations.find(
        (c): c is GuardEvidenceObservation => c.qualityCheck === "lint" && c.staticGuard === guard
      );
      // One credit answers one handle; a handle declared twice on one account still posts once.
      if (obs !== undefined && !demandedGuardCredits.includes(obs)) demandedGuardCredits.push(obs);
    }
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
  // that NO declared scenario matches posts to no real scenario — it lands on a PHANTOM
  // scenario (posting to a non-existent account). One
  // phantom Scenario Reconciliation per undeclared cited id, in first-seen order, its
  // Quality Check Reconciliation(s) carrying the outcome `cites-unknown-scenario` (and the
  // evidence observation's locator, ruling Q5), verdict ALWAYS out-of-balance. Grouped AFTER the
  // declared rows. (Suspense / undemanded / both-missing are LDG-007/008/009.)
  const phantomIds: string[] = [];
  for (const o of evidenceObservations) {
    if (o.qualityCheck === "lint") continue;
    // THE FAIL-SAFE, third arm (@SCN-LDG-017): a BROKEN credit never mints a phantom row either —
    // an errored suite cites no scenario, real or phantom. SUSPENSE is its only account.
    if (o.broken === true) continue;
    if (o.scnId === null) continue; // an uncited credit is SUSPENSE (below), never phantom.
    if (scenarioIds.has(o.scnId)) continue;
    if (!phantomIds.includes(o.scnId)) phantomIds.push(o.scnId);
  }
  for (const scnId of phantomIds) {
    const citations = byScn.get(scnId) ?? [];
    const items: QualityCheckReconciliation[] = citations.map((o) => ({
      qualityCheck: o.qualityCheck,
      outcome: "cites-unknown-scenario",
      // The CREDIT side (@SCN-LDG-027): the citing observation this phantom item reconciles.
      // `cites-unknown-scenario` is credit-only — a phantom account demands nothing.
      evidenceObservation: o,
      ...(o.locator !== undefined ? { locator: o.locator } : {}),
    }));
    scenarioReconciliations.push({
      scnId,
      kind: "phantom-scenario",
      verdict: "out-of-balance",
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

  // CREDIT-SIDE — the SUSPENSE scenario (@SCN-LDG-007). A credit citing NO
  // scenario posts to no real account — it lands on the SUSPENSE scenario
  // (a suspense account holds postings that match no
  // real account). TWO credit sources cite nothing: an uncited runtime evidence observation (scnId
  // null — the parsers emit these), and an UNDEMANDED static-guard (a `lint` evidence
  // observation whose static guard no @lint obligation declares — the running-guard observer now
  // emits every running CI static guard into the stream). ALL of them aggregate into ONE
  // suspense Scenario Reconciliation (sentinel scnId `(no scenario)`), each Quality Check
  // Reconciliation carrying `cites-no-scenario` (uncited runtime credits keep the
  // evidence observation locator, ruling Q5), verdict ALWAYS out-of-balance. Grouped AFTER the
  // phantom rows (the last block of the Ledger). The suspense detail arrays dissolve
  // into this row — the counts survive in the summary balance-check identities.
  //
  // THE SPLIT (@SCN-LDG-017). The fold mapped EVERY uncited runtime credit to
  // `cites-no-scenario`. A BROKEN credit is its SIBLING — both land here because they name no
  // scenario — but they are distinguished by errored-vs-completed, and their remedies differ: a
  // `cites-no-scenario` test RAN and forgot its citation (add the @SCN); a `broken` suite never
  // ran at all (fix the harness). Folding the second into the first would hide the collection
  // failure behind the wrong cure — the false-`missing` in a new costume. So `broken` is taken
  // FIRST, on the flag (never on scnId/status, which it may structurally carry).
  const brokenEvidence = evidenceObservations.filter(
    (o): o is RuntimeEvidenceObservation => o.qualityCheck !== "lint" && o.broken === true
  );
  const uncited = evidenceObservations.filter(
    (o): o is RuntimeEvidenceObservation =>
      o.qualityCheck !== "lint" && o.broken !== true && o.scnId === null
  );
  // The undemanded static-guards — `lint` evidence observations no @lint obligation demands,
  // recovered from the completed stream, no longer a derive-and-diff param.
  const undemandedGuards = evidenceObservations.filter(
    (o): o is GuardEvidenceObservation =>
      o.qualityCheck === "lint" && !demandedGuards.has(o.staticGuard)
  );
  if (brokenEvidence.length > 0 || uncited.length > 0 || undemandedGuards.length > 0) {
    const items: QualityCheckReconciliation[] = [
      // ONE `broken` item per proof that never ran, carrying its WHERE-TO-FIX (the locator) and
      // its WHAT-BROKE (the runner's message) — the payload that sends the reader to the harness.
      // Listed FIRST: a broken run's other suspense items are downstream noise.
      ...brokenEvidence.map((o) => ({
        qualityCheck: o.qualityCheck,
        outcome: "broken" as const,
        ...(o.locator !== undefined ? { locator: o.locator } : {}),
        ...(o.message !== undefined ? { message: o.message } : {}),
      })),
      ...uncited.map((o) => ({
        qualityCheck: o.qualityCheck,
        outcome: "cites-no-scenario" as const,
        // The CREDIT side (@SCN-LDG-027): the uncited runtime observation this suspense item
        // reconciles. `cites-no-scenario` is credit-only — suspense demands nothing.
        evidenceObservation: o,
        ...(o.locator !== undefined ? { locator: o.locator } : {}),
      })),
      ...undemandedGuards.map((o) => ({
        qualityCheck: "lint" as const,
        staticGuard: o.staticGuard,
        outcome: "cites-no-scenario" as const,
        // The CREDIT side (@SCN-LDG-027): the undemanded static-guard observation this suspense
        // item reconciles — the lint half of the credit-only `cites-no-scenario`.
        evidenceObservation: o,
      })),
    ];
    scenarioReconciliations.push({
      scnId: "(no scenario)",
      kind: "suspense-scenario",
      verdict: "out-of-balance",
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

  // UNDECLARABLE WORK (@SCN-LDG-021). A scenario carrying no @SCN declares no obligation, so it
  // could reconcile NOTHING — not satisfied, not failing, not even `missing`: an obligation that
  // was never DECLARED cannot be ABSENT. It contributed nothing to the verdict, so the run went
  // GREEN over a scenario cucumber runs and nothing proves, while the report printed
  // "N scenario(s) carry no @SCN tag" right above it.
  //
  // The scenario is REAL and ORDINARY — `kind: "scenario"`, NOT phantom and NOT suspense: it
  // exists, and cucumber runs it. What is absent is the @SCN CODE its Evidence Obligation needs in
  // order to LINK to an Evidence Observation. So it gets its OWN out-of-balance row carrying one
  // `no-scn-code` item — the DEBIT TWIN of `cites-no-scenario` (same missing link, opposite side).
  // The suspense definition does not move; suspense stays credit-only.
  //
  // The item carries NO `qualityCheck`: without a code, no observation can link at ANY tier, so
  // the missing link is SCENARIO-scope, not tier-scope (the same shape `both-missing` uses).
  // `isBalanced` needs no change — any reconciling item anywhere already reds the run (exit 1).
  for (const name of untaggedScenarios) {
    const items: QualityCheckReconciliation[] = [{ outcome: "no-scn-code" }];
    scenarioReconciliations.push({
      // The scenario's NAME is its only handle — it has no code. (Precedent: the suspense row's
      // "(no scenario)" sentinel; `featureCodeOf` falls back to the raw id when it cannot parse.)
      scnId: name,
      kind: "scenario",
      verdict: "out-of-balance",
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
