/**
 * The reconcile core — the pure declared-vs-observed join, keyed by one flat
 * `qualityCheck` (the two-axis `(kind, level)` grid collapsed).
 *
 * Per the slice design: for each declared quality-check evidenceObligation (a reconciling
 * item), present+pass → satisfied; present+fail → failing; absent →
 * missing. The one reconcile function branches on the `qualityCheck === "lint"`
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
  EvidenceObligation,
  GuardEvidenceObservation,
  EvidenceObservation,
  ScenarioReconciliation,
  QualityCheckReconciliation,
  Outcome,
  RuntimeEvidenceObservation,
  ScenarioVerdict,
  EvidenceReconciliation,
} from "../model.js";

/**
 * Reconcile one declared evidenceObligation against the observed evidence, keyed on the
 * flat `qualityCheck`. `qualityCheck === "lint"` is the watermelon
 * discriminator: it routes to the STATIC-guard mapping;
 * every other value routes to the RUNTIME-result mapping.
 */
function reconcileEvidenceObligation(
  scnId: string,
  req: EvidenceObligation,
  evidenceObservations: EvidenceObservation[]
): QualityCheckReconciliation {
  if (req.qualityCheck === "lint") {
    // The lint (static-guard) evidence obligation — matched by guard handle among the guard
    // evidence observations. Three mappings on the guard evidence observation:
    //   - wired into CI over the real source → satisfied.
    //   - exists (a package.json script) but NOT wired → THE WATERMELON:
    //     green on the surface, red within — a guard that guards nothing.
    //   - absent (no package.json script) → missing: a required
    //     ledger entry never recorded, GENUINELY DIFFERENT from the watermelon.
    const guard = req.guard!; // present by construction for a lint evidence obligation.
    const obs = evidenceObservations.find(
      (o): o is GuardEvidenceObservation => o.qualityCheck === "lint" && o.guard === guard
    );
    let outcome: Outcome;
    if (obs && obs.enforcedOverRealSource) {
      outcome = "satisfied";
    } else if (obs?.exists) {
      outcome = "watermelon";
    } else {
      outcome = "missing";
    }
    return { qualityCheck: "lint", guard, outcome };
  }

  // A runtime evidence obligation — matched by (scnId, quality-check) among the runtime
  // evidence observations (a guard evidence observation carries qualityCheck "lint" and no scnId, so it
  // never matches here). present+pass → satisfied; present+fail → failing;
  // absent → missing (a required ledger entry never recorded).
  const match = evidenceObservations.find(
    (o): o is RuntimeEvidenceObservation =>
      o.qualityCheck !== "lint" && o.qualityCheck === req.qualityCheck && o.scnId === scnId
  );
  let outcome: Outcome;
  if (!match) {
    outcome = "missing";
  } else if (match.status === "passed") {
    outcome = "satisfied";
  } else {
    outcome = "failing";
  }
  return { qualityCheck: req.qualityCheck, outcome };
}

/**
 * Reduce a scenario's reconciling items to its binary VERDICT:
 * `balanced` IFF every evidenceObligation balances (zero non-balanced reconciling items);
 * otherwise `out-of-balance`. No prioritisation between discrepancy kinds — the
 * verdict does NOT pick a winner; the non-balanced items are carried in full by
 * `reconcilingItemsOf` and listed in full by the renderers.
 *
 * Zero-rows-on-both-sides case: a declared scenario reconciling to an EMPTY
 * evidenceObligations set (no evidence obligation AND no citing evidence observation) is handled UPSTREAM —
 * `reconcile` posts it ONE degenerate `both-missing` reconciling item, so this function
 * never sees a truly empty list. The `evidenceObligations.length > 0` guard below stays as a
 * defensive belt — a verdict over an empty set could only ever be vacuously `out-of-balance`,
 * never a false `balanced`; and the both-missing item (not `satisfied`) yields `out-of-balance`.
 */
function verdictFor(evidenceObligations: QualityCheckReconciliation[]): ScenarioVerdict {
  const allBalanced =
    evidenceObligations.length > 0 &&
    evidenceObligations.every((r) => r.outcome === "satisfied");
  return allBalanced ? "balanced" : "out-of-balance";
}

/**
 * The non-balanced reconciling items — EVERY one (no prioritisation, no picked
 * winner), in document order. Empty when the scenario is balanced.
 */
function reconcilingItemsOf(
  evidenceObligations: QualityCheckReconciliation[]
): QualityCheckReconciliation[] {
  return evidenceObligations.filter((r) => r.outcome !== "satisfied");
}

/**
 * The WHOLE-RUN verdict — is the ENTIRE reconciliation balanced? A pure domain
 * derivation over the WHOLE `EvidenceReconciliation`: balanced IFF NO reconciling
 * item exists ANYWHERE, across every Scenario Reconciliation row — declared,
 * phantom, and suspense alike. Out-of-balance iff ANY row carries a reconciling
 * item: a declared scenario's out-of-balance items (failing / missing /
 * undemanded / both-missing) AND the credit-side suspense/phantom rows (an
 * undemanded static-guard watermelon, an uncited credit, a phantom scenario).
 *
 * It is deliberately NOT a scan of DECLARED-scenario verdicts alone — that would
 * let a watermelon-only run (every declared scenario balanced, yet an undemanded
 * static guard sitting unreconciled in the suspense row) read as balanced, the
 * false pass a CI gate must never give. Every row's `reconcilingItems` is
 * consulted, so the suspense/phantom rows (verdict ALWAYS out-of-balance) count.
 *
 * The CLI edge maps this boolean to the process exit code — balanced → 0,
 * out-of-balance → EXACTLY 1 — an ENUMERATED status, never a count (a count would
 * 8-bit `& 0xFF` wrap → false pass).
 */
export function isBalanced(reconciliation: EvidenceReconciliation): boolean {
  return reconciliation.scenarioReconciliations.every(
    (row) => row.reconcilingItems.length === 0
  );
}

export function reconcile(
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[]
): EvidenceReconciliation {
  const scenarioReconciliations: ScenarioReconciliation[] = [];

  // The credit-consuming SPINE: index the runtime evidence observations
  // (credits) the reconciler now consumes, alongside the declared side. `byScn` groups
  // credits by the scnId they cite; `evidenceObligationPairs` is the set of declared
  // `(scnId, qualityCheck)` evidence obligations. The spine is GENERAL — it indexes ALL credits so
  // LDG-007/008/009 build the suspense / undemanded / both-missing rows on it — even
  // though THIS sub-issue emits only the phantom case. Guard evidence observations carry no scnId
  // (qualityCheck "lint"), so only runtime evidence observations are indexed.
  const scenarioIds = new Set(scenarios.map((d) => d.scnId));
  const evidenceObligationPairs = new Set<string>();
  for (const d of scenarios) {
    for (const o of d.evidenceObligations) evidenceObligationPairs.add(`${d.scnId} ${o.qualityCheck}`);
  }
  // The DEMANDED guard handles — every `@lint=<guard>` obligation across the corpus. A
  // `lint` evidence observation whose guard is NOT in this set is an UNDEMANDED guard: it
  // cites no scenario, so it posts to the SUSPENSE row. This replaces the
  // removed `unattributedStaticGuards` derive-and-diff param — the stream is now complete
  // (the running-guard observer emits every running CI guard), so the reconciler recovers
  // the undemanded remainder itself, exactly as it does for an uncited runtime credit.
  const demandedGuards = new Set<string>();
  for (const d of scenarios) {
    for (const o of d.evidenceObligations) {
      if (o.qualityCheck === "lint" && o.guard !== undefined) demandedGuards.add(o.guard);
    }
  }
  const byScn = new Map<string, RuntimeEvidenceObservation[]>();
  for (const o of evidenceObservations) {
    if (o.qualityCheck === "lint") continue;
    if (o.scnId === null) continue; // an uncited credit — it posts to the SUSPENSE scenario (below).
    const list = byScn.get(o.scnId) ?? [];
    list.push(o);
    byScn.set(o.scnId, list);
  }
  for (const d of scenarios) {
    // The declared side: each declared evidence obligation reconciled against the observed evidence.
    const reconciledEvidenceObligations = d.evidenceObligations.map((req) =>
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
    const rows = [...reconciledEvidenceObligations, ...undemandedItems];
    const evidenceObligations: QualityCheckReconciliation[] =
      rows.length === 0 ? [{ outcome: "both-missing" }] : rows;
    scenarioReconciliations.push({
      scnId: d.scnId,
      kind: "scenario",
      verdict: verdictFor(evidenceObligations),
      evidenceObligations,
      reconcilingItems: reconcilingItemsOf(evidenceObligations),
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
    if (o.scnId === null) continue; // an uncited credit is SUSPENSE (below), never phantom.
    if (scenarioIds.has(o.scnId)) continue;
    if (!phantomIds.includes(o.scnId)) phantomIds.push(o.scnId);
  }
  for (const scnId of phantomIds) {
    const citations = byScn.get(scnId) ?? [];
    const items: QualityCheckReconciliation[] = citations.map((o) => ({
      qualityCheck: o.qualityCheck,
      outcome: "cites-unknown-scenario",
      ...(o.locator !== undefined ? { locator: o.locator } : {}),
    }));
    scenarioReconciliations.push({
      scnId,
      kind: "phantom-scenario",
      verdict: "out-of-balance",
      evidenceObligations: items,
      reconcilingItems: items,
    });
  }

  // CREDIT-SIDE — the SUSPENSE scenario (@SCN-LDG-007). A credit citing NO
  // scenario posts to no real account — it lands on the SUSPENSE scenario
  // (a suspense account holds postings that match no
  // real account). TWO credit sources cite nothing: an uncited runtime evidence observation (scnId
  // null — the parsers emit these), and an UNDEMANDED static-guard (a `lint` evidence
  // observation whose guard no @lint obligation declares — the running-guard observer now
  // emits every running CI guard into the stream). ALL of them aggregate into ONE
  // suspense Scenario Reconciliation (sentinel scnId `(no scenario)`), each Quality Check
  // Reconciliation carrying `cites-no-scenario` (uncited runtime credits keep the
  // evidence observation locator, ruling Q5), verdict ALWAYS out-of-balance. Grouped AFTER the
  // phantom rows (the last block of the Ledger). The suspense detail arrays dissolve
  // into this row — the counts survive in the summary balance-check identities.
  const uncited = evidenceObservations.filter(
    (o): o is RuntimeEvidenceObservation => o.qualityCheck !== "lint" && o.scnId === null
  );
  // The undemanded static-guards — `lint` evidence observations no @lint obligation demands,
  // recovered from the completed stream, no longer a derive-and-diff param.
  const undemandedGuards = evidenceObservations.filter(
    (o): o is GuardEvidenceObservation =>
      o.qualityCheck === "lint" && !demandedGuards.has(o.guard)
  );
  if (uncited.length > 0 || undemandedGuards.length > 0) {
    const items: QualityCheckReconciliation[] = [
      ...uncited.map((o) => ({
        qualityCheck: o.qualityCheck,
        outcome: "cites-no-scenario" as const,
        ...(o.locator !== undefined ? { locator: o.locator } : {}),
      })),
      ...undemandedGuards.map((o) => ({
        qualityCheck: "lint" as const,
        guard: o.guard,
        outcome: "cites-no-scenario" as const,
      })),
    ];
    scenarioReconciliations.push({
      scnId: "(no scenario)",
      kind: "suspense-scenario",
      verdict: "out-of-balance",
      evidenceObligations: items,
      reconcilingItems: items,
    });
  }

  return { scenarioReconciliations };
}
