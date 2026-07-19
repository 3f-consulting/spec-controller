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
  PendingItem,
  RuntimeEvidenceObservation,
  ScenarioVerdict,
  Ledger,
} from "../model.js";
import { evidenceObligationPairsOf } from "../model.js";

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
    const guard = req.staticGuard!; // present by construction for a lint evidence obligation.
    const obs = evidenceObservations.find(
      (o): o is GuardEvidenceObservation => o.qualityCheck === "lint" && o.staticGuard === guard
    );
    let outcome: Outcome;
    if (obs && obs.enforcedOverRealSource) {
      outcome = "satisfied";
    } else if (obs?.exists) {
      outcome = "watermelon";
    } else {
      outcome = "missing";
    }
    return { qualityCheck: "lint", staticGuard: guard, outcome };
  }

  // A runtime evidence obligation — matched by (scnId, quality-check) among the runtime
  // evidence observations (a guard evidence observation carries qualityCheck "lint" and no scnId, so it
  // never matches here). present+pass → satisfied; present+fail → failing;
  // absent → missing (a required ledger entry never recorded).
  //
  // THE FAIL-SAFE (@SCN-LDG-017, operator-mandated): `broken` is checked BEFORE `status`. A
  // broken observation — one whose PROOF NEVER RAN — is excluded from the match entirely, so it
  // can NEVER reconcile as `satisfied` or `failing`: a proof that never ran can neither discharge
  // an obligation nor fail it. The obligation then finds no match and reconciles `missing` —
  // honest at its own resolution (no evidence citing it arrived); the broken evidence itself
  // posts to the SUSPENSE row below, where the reader is sent to fix the harness. The exclusion
  // is structural rather than incidental: `broken` rides an OPTIONAL
  // FLAG on RuntimeEvidenceObservation, so a broken credit CAN carry an scnId and a status — the
  // guard is what makes the fail-safe hold whatever it carries.
  const match = evidenceObservations.find(
    (o): o is RuntimeEvidenceObservation =>
      o.qualityCheck !== "lint" &&
      o.broken !== true &&
      o.qualityCheck === req.qualityCheck &&
      o.scnId === scnId
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
 * `balanced` IFF the scenario has NO reconciling item; otherwise `out-of-balance`,
 * carrying the FULL list of non-balanced items (no prioritisation, no picked
 * winner — `reconcilingItemsOf` carries them all, the renderers list them all).
 * The verdict is DERIVED from reconciling-item emptiness, so the two stay in lock
 * step by construction (an out-of-balance verdict always has ≥1 item; a balanced
 * one always has zero).
 *
 * Empty-list case (@SCN-PND-007): a scenario reconciling to an EMPTY
 * evidenceObligations set has no reconciling item, so it is `balanced` — verdict-neutral.
 * This is the ONLY-PENDING scenario: its sole obligation partitioned off to a
 * one-sided Pending Item upstream, leaving zero reconciled rows. A Pending Item
 * never contributes a reconciling item, so it never tips the verdict. (Deriving
 * from emptiness — not `every satisfied` over a non-empty list — is what makes the
 * empty list read `balanced` rather than the earlier vacuous `out-of-balance`.)
 *
 * Both-missing is NOT this case: the degenerate zero-rows-on-both-sides scenario
 * (no obligation, no pending, no citing observation) is posted ONE `both-missing`
 * reconciling item UPSTREAM by `reconcile`, so its list is NON-empty and it stays
 * `out-of-balance` — untouched by the emptiness derivation.
 */
function verdictFor(evidenceObligations: QualityCheckReconciliation[]): ScenarioVerdict {
  return reconcilingItemsOf(evidenceObligations).length === 0 ? "balanced" : "out-of-balance";
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
 * derivation over the WHOLE `Ledger`: balanced IFF NO reconciling
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
export function isBalanced(reconciliation: Ledger): boolean {
  return reconciliation.scenarioReconciliations.every(
    (row) => row.reconcilingItems.length === 0
  );
}

/**
 * Does the WHOLE reconciliation carry any Pending Item? A pure domain predicate over the
 * WHOLE `Ledger`, SYMMETRIC with `isBalanced` — together they are the
 * whole-run verdict surface. True iff ANY Scenario Reconciliation row carries a Pending
 * Item (a deferred `<quality-check>pending` obligation partitioned off before reconciliation,
 * @SCN-PND-004). Pending Items are run-neutral by default (@SCN-PND-008); the CLI edge
 * consults this ALONGSIDE `isBalanced` to escalate an otherwise-balanced run to the distinct
 * exit code 3 under `--strict` (@SCN-CLI-011) — an OPT-IN gate on deferred obligations,
 * checked only when `isBalanced` is true (out-of-balance dominates, exit 1).
 */
export function hasPendingItems(reconciliation: Ledger): boolean {
  return reconciliation.scenarioReconciliations.some((row) => row.pendingItems.length > 0);
}

/**
 * Does the WHOLE reconciliation carry BROKEN evidence — i.e. is the run UNSOUND? The THIRD
 * whole-run predicate (@SCN-LDG-018), beside `isBalanced` and `hasPendingItems`, and the
 * EXISTENTIAL TWIN of the latter: the same `some(row => some(item => item.outcome === X))` scan.
 *
 * Soundness is a property of the RUN, not of a scenario. If any PROOF NEVER RAN — a vitest suite
 * that failed to collect (@SCN-LDG-017), or a cucumber step matched by two or more definitions
 * (@SCN-LDG-019) — the evidence never fully materialised, so every `missing` in that run is
 * SUSPECT: it may be a broken proof rather than an absent one, and the remedies differ (fix the
 * harness vs write a test). The scenario's own row stays honest at its own resolution (`missing`);
 * the RUN is what is stamped unsound.
 *
 * DERIVED, NEVER STORED — no soundness flag is written onto `Ledger`, the same
 * no-drift reason `isBalanced` and `hasPendingItems` derive. Machine consumers read soundness off
 * `summary.byOutcome.broken > 0` (type-forced into the JSON the moment `broken` joined the
 * `Outcome` union); the markdown renderer prints the HEADLINE word — "unsound" is the render word,
 * never the predicate's name, exactly as "out-of-balance" is for `isBalanced`.
 *
 * Keyed on the `broken` OUTCOME specifically, never on `!isBalanced`: an ordinary out-of-balance
 * run (an honest `missing`, no broken evidence) is perfectly SOUND. The three whole-run
 * predicates are INDEPENDENT — a run may carry Pending Items and be sound; a run may carry broken
 * evidence and no Pending Items. (A broken run is ALWAYS out-of-balance, since the `broken` item
 * sits on the suspense row — which is why the CLI edge must consult THIS predicate BEFORE the
 * balance verdict, @SCN-CLI-012, or its exit code would be unreachable.)
 */
export function hasBrokenEvidence(reconciliation: Ledger): boolean {
  return reconciliation.scenarioReconciliations.some((row) =>
    row.reconcilingItems.some((item) => item.outcome === "broken")
  );
}

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
  // though THIS sub-issue emits only the phantom case. Guard evidence observations carry no scnId
  // (qualityCheck "lint"), so only runtime evidence observations are indexed.
  const scenarioIds = new Set(scenarios.map((d) => d.scnId));
  // The DEMANDED pairs — the model's rule, built ONCE and shared with the census (3F-1858).
  // Pending obligations are excluded: a pending obligation demands nothing.
  const evidenceObligationPairs = evidenceObligationPairsOf(scenarios);
  // The DEMANDED guard handles — every `@lint=<guard>` obligation across the corpus. A
  // `lint` evidence observation whose guard is NOT in this set is an UNDEMANDED guard: it
  // cites no scenario, so it posts to the SUSPENSE row. This replaces the
  // removed `unattributedStaticGuards` derive-and-diff param — the stream is now complete
  // (the running-guard observer emits every running CI guard), so the reconciler recovers
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
    // THE POSTED GUARD CREDITS (@SCN-LDG-022) — a guard credit carries no @SCN, so `byScn` (the
    // citation index) cannot hold it: its link to an account is the GUARD HANDLE. This scenario's
    // `@lint` obligations name the handles it demands, so the guard credits answering them post
    // HERE — MIRRORING `reconcileEvidenceObligation`, which follows the SAME link (by handle) to
    // put each lint outcome on this very row. The credit sits on the account its outcome already
    // lands on. The complement — a guard NO obligation demands — belongs to no account and posts
    // to SUSPENSE (`undemandedGuards`, below). Together: every guard credit, exactly one account.
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
      // must misfile an entry, never vaporise it. Plus the guard credits this account DEMANDS,
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
  // observation whose guard no @lint obligation declares — the running-guard observer now
  // emits every running CI guard into the stream). ALL of them aggregate into ONE
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
        ...(o.locator !== undefined ? { locator: o.locator } : {}),
      })),
      ...undemandedGuards.map((o) => ({
        qualityCheck: "lint" as const,
        staticGuard: o.staticGuard,
        outcome: "cites-no-scenario" as const,
      })),
    ];
    scenarioReconciliations.push({
      scnId: "(no scenario)",
      kind: "suspense-scenario",
      verdict: "out-of-balance",
      // The credits citing NO scenario post here (@SCN-LDG-022) — the uncited, the broken (it
      // named no test, so it cites nothing whatever scnId it structurally carries), and the
      // undemanded guards. Together with `byScn` above this exhausts the credit stream.
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
