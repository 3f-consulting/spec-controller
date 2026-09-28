/**
 * THE EVIDENCE RECONCILIATION — canon's Layer 1, *"the whole reconciliation: all Scenario
 * Reconciliations taken together"*, and **the key concept the domain models**
 * (`double-entry-manifesto.md`). This module is its home.
 *
 * IT ARRIVED HERE FROM `reconcile/`. Once its rules had moved out, that module held no domain
 * rule — but it was still a named layer beside the domain doing the concept's own work, which is
 * the shape `functional-domain-modelling.md` rejects: *"orchestration is thin composition, not a
 * named layer."* Constructing a concept is the concept's business. The module's residual tell was
 * already visible — it re-exported `isBalanced` / `hasPendingItems` / `hasBrokenEvidence` FROM
 * `domain/ledger` purely to preserve importers' paths, a shell around behaviour that had already
 * gone home. Every importer now points at the module that OWNS the symbol.
 *
 * (The move is complete: the concept's TYPE, its `Summary`, and the factory that fuses this
 * fold with the summary tally. Today this module holds the fold alone.)
 *
 * The pure obligation-vs-observation join, keyed by one flat
 * `qualityCheck` (the two-axis `(kind, level)` grid collapsed). This module is THIN
 * COMPOSITION: the domain RULES it once held moved to the
 * concept modules that own them — `reconcileEvidenceObligation` (the per-obligation
 * outcome) to `domain/qualityCheckReconciliation`, `verdictFor` / `reconcilingItemsOf` (the
 * account roll-up) to `domain/scenarioReconciliation`, `isBalanced` / `hasPendingItems` /
 * `hasBrokenEvidence` (the whole-run predicates) to `domain/ledger`. `reconcile` is the fold that
 * WALKS the inputs, CALLS those rules, and BUILDS the rows; it is the orchestration, not their home.
 *
 * POSTING-DESTINATION left too — WHERE an entry lands is canon's own glossary group
 * ("### Posting") and now lives on `domain/posting`: `postingOf`, the one citation route over both
 * axes (plus the no-evidence-obligation-static-check arm). The by-name half is gone.
 * The fold no longer DECIDES a destination anywhere — it
 * asks the rule once per credit and files the answer. What remains is assembly: which rows exist,
 * in what order, holding which items.
 *
 * Per the slice design: for each evidence obligation a scenario raises (a reconciling
 * item), present+pass → satisfied; present+fail → failing; absent →
 * missing. `reconcileEvidenceObligation` branches on the `qualityCheck === "fitness"`
 * watermelon discriminator (replacing the retired `kind === "static"` split): a `fitness`
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
 */

import type {
  RuntimeQualityCheck,
  Scenario,
  FitnessEvidenceObservation,
  EvidenceObservation,
  ScenarioReconciliation,
  PendingItem,
  RuntimeEvidenceObservation,
  Ledger,
} from "../model.js";
import {
  evidenceObligationPairsOf,
  // THE PENDING PARTITION — the two exact complements over a scenario's obligations.
  evidenceObligationsOf,
  pendingItemsOf,
} from "../model.js";
import {
  reconcileEvidenceObligation,
  // THE CREDIT-SIDE AND DEGENERATE OUTCOME RULES — what an entry reconciles TO, as
  // opposed to where it lands. `reconcile` asks; it no longer maps outcomes itself.
  noEvidenceObligationReconciliationsOf,
  citesUnknownScenarioReconciliationsOf,
  suspenseReconciliationsOf,
  noScnCodeReconciliations,
  duplicateScnCodeReconciliationsOf,
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
  FitnessTally,
} from "./ledger.js";
import {
  verdictFor,
  reconcilingItemsOf,
  // THE ROW-SHAPE RULE — the both-missing degeneration and its pending clause.
  qualityCheckReconciliationsOf,
} from "./scenarioReconciliation.js";
// THE POSTING RULE — where an entry lands is canon's own glossary group, so it lives on
// its own concept module. `reconcile` no longer decides a destination; it ASKS.
import type { ScenarioCodeError, ScenarioCodePopulation } from "./scenarioCodeError.js";
import { postingOf, type RuntimePosting, type StaticCheckPosting } from "./posting.js";
import { inEvidenceOrder } from "./evidenceOrder.js";
// The `fitness` quality-check's own predicate, asked here to NARROW what the posting rule has already
// routed — see the fitness arm below.
import { isFitnessObservation } from "../model.js";

/** A destination that names ONE row — the two citation-routed `Posting` kinds. */
type CitedPosting = { kind: "scenario" | "phantom-scenario"; scnId: string };

/**
 * THE CITATION INDEX — the credits routed BY CITATION, held by the row each one names, plus the
 * phantom ids those credits MINTED, in first-seen order.
 *
 * It became a thing of its own when the static axis started citing. Before that
 * only test results filed here, and the filing could sit inline in the fold; now both axes file
 * the same way, and two blocks doing it would agree by copy — either could grow the
 * phantom-minting clause alone, which is the drift `evidenceObligationPairsOf` was extracted to
 * cure. Real and invented ids are held together deliberately: a phantom row reads its posted
 * credits from here too, so both citation-routed destinations file once.
 */
interface CitationIndex {
  /** File one citation-routed credit, minting the phantom id if the row is an invented one. */
  file(posting: CitedPosting, observation: EvidenceObservation): void;
  /** The credits citing this row — real or invented; empty when none did. */
  creditsFor(scnId: string): EvidenceObservation[];
  /** The invented ids credits minted, in first-seen order. */
  readonly phantomIds: readonly string[];
}

function citationIndex(): CitationIndex {
  const byScn = new Map<string, EvidenceObservation[]>();
  const phantomIds: string[] = [];
  return {
    file(posting, observation) {
      const list = byScn.get(posting.scnId) ?? [];
      list.push(observation);
      byScn.set(posting.scnId, list);
      if (posting.kind === "phantom-scenario" && !phantomIds.includes(posting.scnId)) {
        phantomIds.push(posting.scnId);
      }
    },
    creditsFor: (scnId) => byScn.get(scnId) ?? [],
    phantomIds,
  };
}

/**
 * THE ROUTED CREDIT STREAMS — every observation filed where the posting rule says it lands, in
 * observation order, with nothing yet decided about what any of them RECONCILES to.
 */
interface RoutedCredits {
  /** The credits routed BY CITATION, plus the phantom ids they minted. */
  readonly citations: CitationIndex;
  /** Proofs that never ran, from EITHER axis. */
  readonly brokenEvidence: readonly (RuntimeEvidenceObservation | FitnessEvidenceObservation)[];
  /** Runtime credits that RAN and carried no `@SCN`. */
  readonly uncited: readonly RuntimeEvidenceObservation[];
  /** Static checks that ran with no Evidence Obligation naming them. */
  readonly noEvidenceObligationStaticChecks: readonly FitnessEvidenceObservation[];
}

/**
 * THE ONE ROUTING PASS. Every credit is routed ONCE, by THE posting rule
 * (`domain/posting`), into the structures the fold reads. `reconcile` no longer DECIDES a
 * destination anywhere — it asks, and files the answer.
 *
 * This replaces two passes that re-stated the SAME four routing decisions (the citation index and
 * the phantom-id scan) plus three stream filters. They agreed by copy-paste, not by construction:
 * either could have grown an arm alone and nothing would have redded — the identical anaemia
 * `evidenceObligationPairsOf` was extracted to cure.
 *
 * ITS OWN FUNCTION, extracted when the static axis gained its second suspense
 * reason and took `reconcile` past the `complexity` and `max-lines-per-function` ceilings. Routing
 * is one idea with a name and the fold below is another; nothing about what it decides moved, and
 * the exception list is untouched — an exception buys no headroom.
 */
/**
 * THE THREE SUSPENSE STREAMS a routing pass accumulates into, each in observation order.
 *
 * NAMED SO THE TWO PER-AXIS ROUTERS BELOW CAN BE HANDED THEM TOGETHER, rather than three
 * parameters apiece. The suspense row's ITEM ORDER — broken first, then uncited, then the
 * no-evidence-obligation static checks — is row assembly and stays the fold's, not this type's:
 * what this names is only which stream a credit joins.
 */
interface SuspenseStreams {
  readonly brokenEvidence: (RuntimeEvidenceObservation | FitnessEvidenceObservation)[];
  readonly uncited: RuntimeEvidenceObservation[];
  readonly noEvidenceObligationStaticChecks: FitnessEvidenceObservation[];
}

/**
 * ONE FITNESS CREDIT'S DESTINATION, filed.
 *
 * THE SPLIT ON THIS AXIS, the twin of the runtime router's below. Both suspense
 * reasons post to suspense because neither names a row, and they stay in separate streams because
 * they are different facts with different remedies: a check nobody named RAN and wants an
 * obligation written for it; a broken one never ran and wants its harness fixed.
 *
 * THE SECOND CLAUSE IS THE NARROW, NOT A SECOND DECISION. `postingOf` reaches `broken` on this
 * axis only through `isFitnessObservation`, so asking the same predicate here cannot disagree with
 * it — it re-states what the rule already settled in the one form the compiler accepts. Nothing
 * falls between the two arms: an observation that somehow took neither still lands in the second,
 * misfiled rather than vaporised.
 *
 * A CITING run files into the citation index like any other credit — exactly one
 * row, real or invented. There is no third destination left.
 */
function routeFitnessCredit(
  observation: FitnessEvidenceObservation,
  posting: StaticCheckPosting,
  citations: CitationIndex,
  streams: SuspenseStreams
): void {
  if (posting.kind !== "suspense-scenario") {
    citations.file(posting, observation);
    return;
  }
  if (posting.posted === "broken" && isFitnessObservation(observation)) {
    streams.brokenEvidence.push(observation);
  } else streams.noEvidenceObligationStaticChecks.push(observation);
}

/**
 * ONE RUNTIME CREDIT'S DESTINATION, filed.
 *
 * THE CITATION INDEX holds real AND invented ids alike — a phantom row reads its posted credits
 * from here too, so both citation-routed destinations file together.
 *
 * THE SPLIT — `broken` and `cites-nothing` both land on suspense because neither
 * names a scenario, but they are different facts with different remedies (fix the harness vs add
 * the `@SCN`), so their streams stay apart. The rule already told them apart.
 */
function routeRuntimeCredit(
  observation: RuntimeEvidenceObservation,
  posting: RuntimePosting,
  citations: CitationIndex,
  streams: SuspenseStreams
): void {
  switch (posting.kind) {
    case "scenario":
    case "phantom-scenario": {
      citations.file(posting, observation);
      break;
    }
    case "suspense-scenario":
      if (posting.posted === "broken") streams.brokenEvidence.push(observation);
      else streams.uncited.push(observation);
      break;
  }
}

function routeCredits(
  evidenceObservations: readonly EvidenceObservation[],
  scenarioIds: ReadonlySet<string>
): RoutedCredits {
  // THE CITATION INDEX holds BOTH axes now: a fitness check's run cites the
  // scenario that raises its obligation, so it files here exactly as a test result does.
  const citations = citationIndex();
  // The three SUSPENSE streams, kept separate and each in observation order — the suspense row's
  // item order (broken first, then uncited, then the no-evidence-obligation static checks) is row
  // assembly, owned by the fold in `reconcile`, not a routing decision.
  // BROKEN EVIDENCE FROM EITHER AXIS. It was a runtime-only stream while `broken`
  // was a runtime-only fact; a converted static check that did not run is the same fact about the
  // same kind of absence, so it lands in the same stream and renders through the same section.
  const streams: SuspenseStreams = {
    brokenEvidence: [],
    uncited: [],
    noEvidenceObligationStaticChecks: [],
  };
  const { brokenEvidence, uncited, noEvidenceObligationStaticChecks } = streams;
  for (const o of evidenceObservations) {
    // The union NARROW — `qualityCheck === "fitness"` is the `EvidenceObservation` union's TYPE TAG,
    // not a posting decision. Which axis a credit rides is read here; where it LANDS is the rule's,
    // on both branches — each axis's router above.
    if (o.qualityCheck === "fitness") {
      routeFitnessCredit(o, postingOf(o, scenarioIds), citations, streams);
      continue;
    }
    routeRuntimeCredit(o, postingOf(o, scenarioIds), citations, streams);
  }
  return { citations, brokenEvidence, uncited, noEvidenceObligationStaticChecks };
}

/**
 * ONE REAL SCENARIO'S ROW — the debit side reconciled against the observed evidence, the credit
 * side's no-evidence-obligation items beside it, and the row assembled from both.
 *
 * ITS OWN FUNCTION, extracted when the fourth population took `reconcile`
 * past the `max-lines-per-function` ceiling — `routeCredits`' own precedent, and the same seam.
 * Routing is one idea with a name, what each population RECONCILES to is another, and `reconcile`
 * is the ORDER they are filed in. Nothing any of them decides moved.
 */
function scenarioRow(
  d: Scenario,
  evidenceObservations: EvidenceObservation[],
  citations: CitationIndex,
  evidenceObligationPairs: ReadonlySet<string>
): ScenarioReconciliation {
  // THE PENDING PARTITION — `pendingItemsOf` and `evidenceObligationsOf`
  // are exact complements over the scenario's obligations, so nothing is dropped and nothing is
  // counted twice. Rule + rationale: `domain/journal`.
  const pendingItems: PendingItem[] = pendingItemsOf(d);

  // The DEBIT side — each NAMED obligation reconciled against the observed evidence.
  const reconciledEvidenceObligations = evidenceObligationsOf(d.evidenceObligations).map((req) =>
    reconcileEvidenceObligation(d.scnId, req, evidenceObservations)
  );

  // The CREDIT side — NO-EVIDENCE-OBLIGATION: a credit citing THIS real scenario at a
  // quality-check it never named. Rule + rationale: `domain/qualityCheckReconciliation`.
  const noEvidenceObligationItems = noEvidenceObligationReconciliationsOf(
    d.scnId,
    citations.creditsFor(d.scnId),
    evidenceObligationPairs
  );

  // The row's SUB-ROWS, degenerating to one `both-missing` item when the row reconciled to
  // nothing either way. Rule + rationale: `domain/scenarioReconciliation`.
  const qualityCheckReconciliations = qualityCheckReconciliationsOf(
    reconciledEvidenceObligations,
    noEvidenceObligationItems,
    pendingItems
  );
  return {
    scnId: d.scnId,
    kind: "scenario",
    verdict: verdictFor(qualityCheckReconciliations),
    // THE POSTED CREDITS — every credit CITING this scenario, whatever it
    // reconciles to above. The citation index holds every citing credit, so this includes one citing a
    // PENDING quality-check, which reconciles `no-evidence-obligation` (it used to reconcile to
    // NO ROW AT ALL, the false-green this posting made visible without fixing). It posts and is
    // findable WHATEVER it reconciles to; posting is not classifying, and a misclassification
    // must misfile an entry, never vaporise it. A fitness check's run is in here too and by the
    // SAME route: it cites this scenario, so the citation index holds it like any other.
    evidenceObservations: citations.creditsFor(d.scnId),
    // THE POSTED DEBITS — every obligation THIS scenario RAISES, in document
    // order, keyed by quality-check. The debit half of the same posting: where a credit is
    // routed by its citation, a debit needs no routing at all — the account IS the scenario.
    // Includes a PENDING obligation, which partitioned off above and earns NO reconciled row: it
    // posts ANYWAY. Posting is not classifying, on this side too.
    evidenceObligations: [...d.evidenceObligations],
    qualityCheckReconciliations,
    reconcilingItems: reconcilingItemsOf(qualityCheckReconciliations),
    pendingItems,
  };
}

/**
 * The tagged scenarios grouped by the code they carry, in first-seen order — the ACCOUNTS.
 * The ledger is keyed by the `@SCN`, so a code two scenarios carry is one
 * account, not two rows that would each take every citing credit. A code carried once is a group of
 * one, and builds exactly the row it always did.
 */
function accountsByCode(scenarios: readonly Scenario[]): Scenario[][] {
  const byCode = new Map<string, Scenario[]>();
  for (const scenario of scenarios) {
    const sharers = byCode.get(scenario.scnId) ?? [];
    sharers.push(scenario);
    byCode.set(scenario.scnId, sharers);
  }
  return [...byCode.values()];
}

/**
 * ONE ACCOUNT WHOSE CODE MORE THAN ONE SCENARIO CARRIES — a real account,
 * every quality check reading `duplicate-scn-code` (rule + rationale:
 * `duplicateScnCodeReconciliationsOf`).
 *
 * Posting is not classifying, so both sides still post: every credit citing the code (held once,
 * because routing files a credit by its citation and the code is one account), and every obligation
 * any sharer raises. None of them reconciles, and no deferral becomes a Pending Item — neither can
 * be attributed to one sharer.
 */
function duplicateScnCodeRow(
  sharers: readonly Scenario[],
  citations: CitationIndex
): ScenarioReconciliation {
  const scnId = sharers[0]!.scnId;
  const evidenceObligations = sharers.flatMap((s) => s.evidenceObligations);
  const items = duplicateScnCodeReconciliationsOf(evidenceObligations);
  return {
    scnId,
    kind: "scenario",
    verdict: verdictFor(items),
    evidenceObservations: citations.creditsFor(scnId),
    evidenceObligations,
    qualityCheckReconciliations: items,
    reconcilingItems: reconcilingItemsOf(items),
    pendingItems: [],
  };
}

/**
 * THE PHANTOM ROWS, assembled. Extracted beside its siblings; the
 * routing that produced `citations.phantomIds` is `routeCredits`', and unchanged.
 */
function phantomScenarioRows(citations: CitationIndex): ScenarioReconciliation[] {
  const rows: ScenarioReconciliation[] = [];
  // CREDIT-SIDE — PHANTOM scenarios. One phantom Scenario Reconciliation per
  // UNKNOWN cited id, in first-seen order, its Quality Check Reconciliation(s) carrying the
  // outcome `cites-unknown-scenario` (and the evidence observation's locator, ruling Q5), verdict
  // ALWAYS out-of-balance. Grouped AFTER the scenario rows.
  //
  // `phantomIds` was ROUTED ABOVE — this block only ASSEMBLES the rows. The scan that
  // stood here re-stated the citation index's four routing decisions verbatim, including the
  // fail-safe arms (a BROKEN credit mints no phantom row; an uncited credit is suspense, never
  // phantom); both now come from the one `postingOf` call.
  for (const scnId of citations.phantomIds) {
    const credits = citations.creditsFor(scnId);
    // ASKED, not decided.
    const items = citesUnknownScenarioReconciliationsOf(credits);
    rows.push({
      scnId,
      kind: "phantom-scenario",
      // ASKED, not restated. Canon says a phantom row is ALWAYS
      // out-of-balance, and it is — BY CONSTRUCTION, because a phantom row exists only where a
      // credit minted it, so it always carries ≥1 `cites-unknown-scenario` item. Deriving the
      // verdict from the items keeps that a consequence of the rule rather than a constant asserted
      // beside it: a hardcoded verdict would go on reading `out-of-balance` even if the row ever
      // came to carry none, which is precisely the drift the verdict/items lock-step exists to stop.
      verdict: verdictFor(items),
      // The credits that CITE this invented scenario post to it — canon organises the ledger by
      // "real or INVENTED scenario", so a phantom account holds its postings like any other.
      evidenceObservations: [...credits],
      // A phantom account is MINTED BY A CREDIT — no scenario raises it, so nothing can have
      // been named of it. Its debit side is empty by construction; the asymmetry
      // with the credit side is real, not an omission.
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      pendingItems: [],
    });
  }
  return rows;
}

/**
 * THE SUSPENSE ROW, assembled — nil rows or one. Extracted beside its siblings; what lands on it is `routeCredits`' decision, and unchanged.
 */
function suspenseScenarioRows(
  brokenEvidence: readonly (RuntimeEvidenceObservation | FitnessEvidenceObservation)[],
  uncited: readonly RuntimeEvidenceObservation[],
  noEvidenceObligationStaticChecks: readonly FitnessEvidenceObservation[]
): ScenarioReconciliation[] {
  const rows: ScenarioReconciliation[] = [];
  // THE SUSPENSE ROW — every entry that names no scenario aggregates into ONE row
  // (sentinel scnId `(no scenario)`), grouped LAST, verdict always out-of-balance.
  //
  // Its three streams were ROUTED by the posting rule; their OUTCOMES and their ORDER
  // are the item concept's (`suspenseReconciliationsOf` — rule + rationale there). What
  // is decided HERE is only whether the row exists at all: suspense is minted by a credit landing
  // on it, so no credit means no row.
  if (brokenEvidence.length > 0 || uncited.length > 0 || noEvidenceObligationStaticChecks.length > 0) {
    const items = suspenseReconciliationsOf(brokenEvidence, uncited, noEvidenceObligationStaticChecks);
    rows.push({
      scnId: "(no scenario)",
      kind: "suspense-scenario",
      // ASKED, not restated — same reason as the phantom row. The `if` above is what makes this
      // out-of-balance by construction: the row exists only when a credit landed on it.
      verdict: verdictFor(items),
      // The credits citing NO scenario post here — the uncited, the broken (it
      // named no test, so it cites nothing whatever scnId it structurally carries), and the
      // no-evidence-obligation static checks. With the citation index this exhausts the credit stream.
      evidenceObservations: [...brokenEvidence, ...uncited, ...noEvidenceObligationStaticChecks],
      // Suspense is MINTED BY A CREDIT too — it raises nothing, so it names nothing.
      // It can therefore carry no Pending Item either.
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      pendingItems: [],
    });
  }
  return rows;
}

/**
 * THE UNCODED-WORK ROWS, assembled. Extracted beside its siblings.
 */
function untaggedScenarioRows(untaggedScenarios: readonly string[]): ScenarioReconciliation[] {
  const rows: ScenarioReconciliation[] = [];
  // UNCODED WORK — a scenario carrying no @SCN. It is REAL and ORDINARY
  // (`kind: "scenario"`, never phantom or suspense: it exists, and cucumber runs it); what is
  // absent is the CODE its obligation needs in order to link to an observation. It gets its own
  // out-of-balance row so the verdict can see it at all.
  //
  // The item's outcome, its scenario-scope shape and the synthesised `{}` obligation it carries
  // are the item concept's (`noScnCodeReconciliations` — rule + rationale there).
  for (const name of untaggedScenarios) {
    const items = noScnCodeReconciliations();
    rows.push({
      // The scenario's NAME is its only handle — it has no code. (Precedent: the suspense row's
      // "(no scenario)" sentinel; `featureCodeOf` falls back to the raw id when it cannot parse.)
      scnId: name,
      kind: "scenario",
      // ASKED, not restated — `noScnCodeReconciliations` always returns the one `no-scn-code`
      // item, so the verdict follows from it rather than being asserted alongside it.
      verdict: verdictFor(items),
      // An untagged scenario carries no @SCN, so no credit can cite it — nothing can post here.
      evidenceObservations: [],
      // It reaches the ledger by NAME, carrying no parsed obligations — so it posts no debits
      // either.
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      pendingItems: [],
    });
  }
  return rows;
}


export function reconcile(
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[] = []
): Ledger {
  // THE OBLIGATION SIDE, prepared once — the three sets the posting rule and the outcome rules read.
  // Each is already the MODEL's own rule (never re-derived here), and each is built ONCE and
  // shared, so no two consumers can drift: `scenarioIds` is which scenarios exist,
  // and `evidenceObligationPairs` is what they name at each quality-check.
  const scenarioIds = new Set(scenarios.map((d) => d.scnId));
  // The NAMED pairs — the model's rule, built ONCE and shared with the census.
  // Pending obligations are excluded: a pending obligation names nothing.
  const evidenceObligationPairs = evidenceObligationPairsOf(scenarios);
  // ONE ORDER, WHATEVER THE RUNNERS REPORTED — everything below reads
  // the evidence in the order `inEvidenceOrder` fixes, never the order it arrived in.
  const observations = inEvidenceOrder(evidenceObservations);
  // THE ONE ROUTING PASS — asked of the posting rule, in one place, and read back as
  // four streams. What each of them then RECONCILES to is the fold's, below.
  const { citations, brokenEvidence, uncited, noEvidenceObligationStaticChecks } = routeCredits(
    observations,
    scenarioIds
  );
  // THE ORDER THE POPULATIONS ARE FILED IN IS THE LEDGER'S GROUPING, and it is the whole of what
  // this function decides now: the real scenario rows, then the phantom rows a credit invented,
  // then the one suspense row, then uncoded work, then the configured rows no scenario specifies.
  return {
    scenarioReconciliations: [
      ...accountsByCode(scenarios).map((sharers) =>
        sharers.length === 1
          ? scenarioRow(sharers[0]!, observations, citations, evidenceObligationPairs)
          : duplicateScnCodeRow(sharers, citations)
      ),
      ...phantomScenarioRows(citations),
      ...suspenseScenarioRows(brokenEvidence, uncited, noEvidenceObligationStaticChecks),
      ...untaggedScenarioRows(untaggedScenarios),
    ],
  };
}

// -------------------------------------------------------------------------
// THE CONCEPT AND ITS FACTORY — canon's Layer 1 owns its type, its summary and its
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
 * The materialised test-volume totals — the runtime evidence-observation kind-counts
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
 * The materialised static-check totals — the static-check kind-counts the
 * markdown's `### Static checks` line derives, following the census shape exactly:
 * `runningStaticCheckCount` (the volume of running static checks) and `uncitedStaticCheckCount` (how many
 * of THOSE no `@fitness` cites — a subset of the first). The named count is IMPLICIT
 * (`running − uncited`) and is not carried (every named static check is already a reconciled
 * fitness sub-row); drawn from one population under one membership rule, it cannot go below nil.
 */
export interface StaticCheckTotals {
  runningStaticCheckCount: number;
  uncitedStaticCheckCount: number;
}

/**
 * ONE STEP THAT IS THE RECONCILER — the step, as the report names one, and which
 * half of the reconciler it is.
 *
 * TWO ROLES RATHER THAN A BARE LIST, because the two are different facts about a pipeline and a
 * consumer reading the report is owed both: one step RUNS the reconciliation these books are, and
 * one WRITES the step record that run reads. Collapsing them would say only that two steps were
 * set aside, which is the shape of a claim nobody can check.
 *
 * BESIDE `BehaviouralRunner` FOR THE REASON THAT ONE IS HERE: it is carried on the summary and the
 * renderer reads it off there. Neither is a tally — the question a reader has is which step was
 * accounted for as what, and a count answers none of it.
 */
export interface ReconcilerStep {
  /** The step, named as every section of the report names one (`parse/stepNames`). */
  readonly step: string;
  /** Which half of the reconciler it is — the run itself, or the record that run reads. */
  readonly role: "reconciles" | "records";
}

/**
 * ONE STEP RECOGNISED AS THE RUNNER OF ONE TIER — the tier the target named it
 * for, the runner it named, and the step GitHub itself displays it as.
 *
 * BESIDE `StaticCheckTotals` RATHER THAN IN THE PARSE THAT PRODUCES IT, for the reason that one
 * is here: it is carried on the summary, and the renderer reads it off there. It is not a tally —
 * a recognition names a step, and a count of them would answer none of the questions a reader has
 * about which step was recognised as what.
 */
export interface BehaviouralRunner {
  /** The tier key the target named this runner under — `unit`, `integration`, `e2e`, `performance`. */
  readonly tier: string;
  /** The runner's name, as the target wrote it. */
  readonly runner: string;
  /** The step's identity — its `name:`, else the action it `uses:`, else the first line of its `run:`. */
  readonly step: string;
}

/** A specController entry whose value is a kind its reader does not take. */
export interface WrongKindEntry {
  /** Where it sits in the manifest — `specController.notChecks[1]`. */
  readonly entry: string;
  /** The kind written — `a string`, `null`. */
  readonly is: string;
  /** The kind its reader takes there. */
  readonly reads: string;
}

/**
 * ONE JOB OF ONE WORKFLOW THIS RUN READ — where the steps came from, and how many
 * of them there were.
 *
 * BOTH FIGURES, because either alone is satisfiable by a reader that is wrong about the other.
 * `steps` says what was in front of the tool and nothing about what it did with them; `candidates`
 * is the figure already on the report, re-cut. It is the PAIR, per job, that lets a consumer see a
 * whole job pass through discovery contributing nothing and ask why.
 *
 * BESIDE `ReconcilerStep` AND `BehaviouralRunner` FOR THE REASON THOSE ARE HERE: it is carried on
 * the summary and the renderer reads it off there. It is not a tally of the ledger — no row exists
 * for a job, and the question a reader has is which files and which jobs the numbers came from.
 *
 * THE SOURCE IS OPTIONAL BECAUSE THE CORE HOLDS NO FILESYSTEM. Workflow names arrive as data from
 * the CLI edge (`parse/stepNames`), so a run given none for a source can name no file for its jobs
 * — and dropping those jobs would be the silence this axis exists to end, so the row survives
 * without the half of its name nobody supplied.
 */
export interface JobDiscoveryScope {
  /** The workflow file the job was read from, absent where the run was given no name for it. */
  readonly source?: string;
  /** The key the job is written under in that workflow's `jobs:` mapping. */
  readonly job: string;
  /** How many steps this run read from it. */
  readonly steps: number;
  /** How many of those steps are candidate fitness checks. */
  readonly candidates: number;
}

/**
 * WHAT BECAME OF EVERY STEP THIS RUN READ — the population, the four dispositions,
 * and the total those four come to.
 *
 * BOTH TOTALS, AND `accountedFor` IS THE ONE THAT HAS TO BE CARRIED. A consumer of this structure
 * could add the four dispositions up for themselves, and a consumer that did would be measuring
 * their own arithmetic: they would agree with any four figures a reader happened to produce,
 * including four produced by a reader that had lost a step on the way. The sum is the READER's
 * answer to "how many did you account for", stated beside "how many did you read" so the two can
 * be compared rather than reconstructed. The identity `accountedFor === stepsRead` is the axis's
 * first non-negotiable — nothing seen is dropped — made checkable.
 *
 * IT IS A CARDINALITY INSTRUMENT, WHICH IS WHY NO OTHER MEMBER HERE CAN STAND IN FOR IT. Every
 * account beside it names steps that BECAME something — a runner, the reconciler, an exclusion, a
 * row on the books. A step dropped on a branch nobody enumerated becomes nothing, names nothing
 * and posts nothing, so there is no list it is missing from: only a count of the population
 * against the dispositions can see it at all.
 *
 * BESIDE `JobDiscoveryScope` FOR THE REASON THAT ONE IS HERE: it is carried on the summary and the
 * renderer reads it off there. It is not a fold of the ledger — three of its four dispositions
 * post no row by definition, so there is nothing for it to be derived from.
 */
export interface StepAccounting {
  /** How many steps of the target's pipeline this run read. */
  readonly stepsRead: number;
  /** How many of them are candidate fitness checks. */
  readonly candidates: number;
  /** How many of them run a runner the target named. */
  readonly runners: number;
  /** How many of them are the reconciliation or the step record it reads. */
  readonly reconciler: number;
  /** How many of them the target names non-checks. */
  readonly excluded: number;
  /** The four above, added up by the reader that counted them. */
  readonly accountedFor: number;
}

/** The materialised summary — the totals (manifesto: "the aggregate of the trial balance"). */
export interface Summary {
  scenarioReconciliations: ScenarioReconciliationTotals;
  evidenceObligations: EvidenceObligationTotals;
  /**
   * The Pending Items tally — the count of Pending Items across the
   * reconciliation (one per deferred `<quality-check>pending` obligation, evidence-manifesto §11B),
   * SEPARATE from the scenario balanced / out-of-balance counts and the evidence-obligation counts.
   * A Pending Item is deferred, NOT out-of-balance, so it is NEVER folded into
   * `OUT_OF_BALANCE_OUTCOMES` (never a leaf of its own, at any leaf count — the constraint is
   * categorical, not arithmetic) nor into `evidenceObligations` — its own tally.
   * Counts Pending ITEMS, not scenarios-carrying-pending (mirroring the out-of-balance
   * decomposition, which counts obligations, not scenarios). Always present (a pure balance derive,
   * like `fitness`); reads 0 when no scenario raises a pending obligation.
   */
  pending: number;
  /** The runtime test-volume kind-counts — present when the evidenceObservations read is threaded. */
  testVolume?: TestVolumeTotals;
  /**
   * The re-homed raw per-quality-check evidence-observation totals — a
   * materialised headline the Ledger folds (`runtimeObservationTally`), testVolume-adjacent. It
   * RE-HOMES onto `summary` the raw totals the retired `evidenceObservations` section used to
   * carry: a legitimate aggregate headline (per the done-criterion's fold-vs-store test — three
   * derived totals, not a parallel store of the posted credits). Present exactly when `testVolume`
   * is (both gated on the observation read being threaded).
   */
  rawByRuntimeQualityCheck?: Record<RuntimeQualityCheck, number>;
  /** The static-check kind-counts — present when the guard read is threaded. */
  staticChecks?: StaticCheckTotals;
  /** The fitness-only evidence obligation tally — always present (a pure balance derive). */
  fitness: FitnessTally;
  /**
   * THE STEPS RECOGNISED AS BEHAVIOURAL RUNNERS, in the order the pipeline runs
   * them — what the target named, found where its pipeline invokes it.
   *
   * NOT A LEDGER FOLD, and it rides here because it is
   * a fact about what the reader SAW, not about anything the books hold. A runner raises no
   * obligation and posts no credit — it is the disposition a step gets INSTEAD of reaching the
   * ledger — so there is no row for it to be derived from and it has to be carried.
   *
   * PRESENT ONLY WHEN NON-EMPTY, so a target that has named no runners renders and serialises
   * exactly as it did before.
   */
  behaviouralRunners?: readonly BehaviouralRunner[];
  /**
   * WHAT THE TARGET SAID ABOUT EACH TIER — `specController.runners` as written: the
   * runner's name where it named one, and `null` for a tier it says it has none. A tier the block
   * OMITS is absent from this record, and that third state is the whole reason the field exists.
   *
   * NOT `behaviouralRunners`, which is the other half of the same subject and is easy to mistake
   * for it. That one is what a run RECOGNISED — tier, runner and the step it was found at, a fact
   * about the pipeline. This one is what the target SAID, a fact about the manifest, and the two
   * disagree whenever a named runner runs at no step this reader could see.
   *
   * PRESENT ONLY WHEN NON-EMPTY, so a target that has named no runners renders and serialises
   * byte-identically to before.
   */
  runnerTiers?: Readonly<Record<string, string | null>>;
  /**
   * THE RUNNER BLOCK'S KEYS THAT ARE NOT ONE OF THE FOUR CANON TIERS — what the
   * target wrote that this tool does not recognise, in the order the manifest wrote it.
   *
   * IT CARRIES A NON-EVENT, WHICH IS WHY IT HAS TO BE CARRIED AT ALL. An unrecognised key
   * recognises no step, excludes no step and posts no row, so nothing anywhere else in this
   * structure differs between a manifest that wrote it and one that did not. Without this field
   * the consumer's entry is simply gone — and a consumer who wrote something and believes it took
   * effect is the same fault as a step dropped in silence, reached from the configuration side.
   *
   * NOT `runnerTiers`, which is the block's other half: that one is what the target said about a
   * tier that EXISTS, and every entry in it can be run against a pipeline. Nothing in here can be.
   *
   * PRESENT ONLY WHEN NON-EMPTY, so a target whose block is keyed correctly — every target today —
   * renders and serialises byte-identically to before.
   */
  unrecognisedRunnerKeys?: readonly string[];
  /**
   * The specController entries whose value is a kind their reader does not take. Each was read as
   * absent, which changes nothing else in this structure, so without this member the entry is
   * simply gone. Present only when non-empty.
   */
  wrongKindConfiguration?: readonly WrongKindEntry[];
  /** The specController block's keys that no reader reads, in the order the manifest wrote them. Present only when non-empty. */
  unknownConfigurationKeys?: readonly string[];
  /**
   * THE STEPS THE TARGET NAMES NON-CHECKS — `specController.notChecks`' entries
   * that named a step of the pipeline this run read, each as the consumer wrote it.
   *
   * IT CARRIES A DISPOSITION, WHICH IS WHY IT IS CARRIED AT ALL. An excluded step reaches no
   * observer and posts no row, so nothing else in this structure differs between a run that
   * excluded it and a run that never saw it — and those are the two things a reader most needs
   * told apart. A step that simply vanished on the consumer's own instruction is the silence this
   * axis exists to end, arriving with their signature on it; naming it is what makes the exclusion
   * a disposition rather than a drop, and correctable in one line of their own configuration.
   *
   * PRESENT ONLY WHEN NON-EMPTY, so a target that names no non-checks — every target today —
   * renders and serialises byte-identically to before.
   */
  excludedSteps?: readonly string[];
  /**
   * THE STEPS THAT ARE THE RECONCILER — the step running this reconciliation and
   * the step writing the record it reads, in the order the pipeline runs them.
   *
   * NOT `excludedSteps`, AND THE DIFFERENCE IS THE WHOLE REASON THIS IS A SEPARATE MEMBER. That
   * one is a list the consumer wrote about their own pipeline; this one is nobody's list. A
   * `notChecks` pair naming these two steps produces the same books, and a report folding them
   * together would credit a consumer's configuration for an exclusion that holds over a manifest
   * saying nothing — which is every consumer's first run.
   *
   * PRESENT ONLY WHEN NON-EMPTY, so a target whose pipeline does not run this tool renders and
   * serialises byte-identically to before.
   */
  reconcilerSteps?: readonly ReconcilerStep[];
  /**
   * THE `notChecks` ENTRIES THAT NAMED NO STEP — in the order the manifest wrote
   * them, and the other half of a total partition with `excludedSteps`.
   *
   * A LINE THAT MATCHES NOTHING IS A STALE EXCLUSION. The consumer renamed a step and the entry
   * now hides nothing, or is about to hide the wrong thing the next time a step is renamed onto
   * it. Either way it is a fact about their manifest that only this run can see, and dropping it
   * is the same fault as dropping a step: something was written, it took no effect, and nothing
   * anywhere says so.
   *
   * NOT `excludedSteps`, and the two are easy to mistake for one another. That one names a step
   * this run READ; every entry in here named none, so nothing in the pipeline corresponds to it.
   *
   * PRESENT ONLY WHEN NON-EMPTY, for the reason its twin is.
   */
  unmatchedNotChecks?: readonly string[];
  /**
   * THE SCOPE THIS RUN RANGED OVER — one entry per job of every workflow `--ci`
   * resolved, sorted by workflow and then by job.
   *
   * IT CARRIES THE PROVENANCE OF EVERY OTHER FIGURE ON THE REPORT, which is why it has to be
   * carried at all. The census above states how many checks ran; nothing anywhere states how many
   * jobs, in how many files, that number came from — so a consumer whose second job holds three
   * checks reads exactly what a consumer with three checks in one job reads, and a consumer
   * pointed at the wrong file has nothing that says so. The tool makes no judgement about whether
   * a scope is the right one; stating it is the answer.
   *
   * NOT THE ACCOUNTING IDENTITY, which is a separate claim over the same steps.
   * That one asserts the dispositions sum to the steps read, so nothing was dropped; this one
   * asserts WHERE the steps came from. A reader satisfies either alone.
   *
   * PRESENT ONLY WHEN NON-EMPTY, so a run that read no CI configuration at all renders and
   * serialises byte-identically to before.
   */
  discoveryScope?: readonly JobDiscoveryScope[];
  /**
   * WHAT BECAME OF EVERY STEP THIS RUN READ — the population, the four dispositions
   * and the total they come to, so the axis's first non-negotiable is a figure a reader can check
   * rather than a sentence they have to take on trust.
   *
   * IT IS THE ONLY MEMBER HERE THAT CAN SEE AN ABSENCE. `behaviouralRunners`, `reconcilerSteps`,
   * `excludedSteps` and the static-check census each name what a step BECAME; a step dropped on a
   * branch nobody enumerated became nothing, so it is missing from no list and every one of them
   * reads exactly as it would have read had the step never existed. Counting the population
   * against the dispositions is what makes the drop visible, and it is the whole reason this
   * member is a set of counts rather than another list of steps.
   *
   * NOT `discoveryScope`, which counts the same population for a different question. That one
   * asserts WHERE the steps came from — which files, which jobs; this one asserts that none of
   * them went missing between being read and being accounted for. A reader satisfies either alone.
   *
   * PRESENT ONLY WHEN THE RUN READ A STEP, so a run handed no CI configuration renders and
   * serialises byte-identically to before.
   */
  stepAccounting?: StepAccounting;
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
  /**
   * The corpus's scenario code errors — present whenever a feature corpus was judged,
   * `[]` when it was judged clean, and absent when this reconciliation was composed from parsed
   * scenarios with no corpus to judge.
   */
  scenarioCodeErrors?: readonly ScenarioCodeError[];
  /** The population those codes were judged over; present exactly when they are. */
  scenarioCodePopulation?: ScenarioCodePopulation;
}

/**
 * Materialise the summary totals from the balance — the aggregate the markdown's trial-balance
 * table derives, carried AS DATA so a later render-from-saved-JSON rebuilds it with zero
 * computation (the MATERIALISE ruling). THIN COMPOSITION: the LEDGER-PURE totals
 * (`scenarioReconciliations`, `evidenceObligations`, `pending`, `fitness`) come from `ledgerTally`
 * — the Ledger owns its own totals ("the summary is its totals") — and are MERGED here with the
 * census pass-throughs (`testVolume`, `staticChecks`), which are NOT Ledger-pure. The keys are
 * assembled in DOCUMENT ORDER (…, testVolume?, staticChecks?, fitness) so the JSON stays
 * byte-identical.
 */
export function summaryOf(
  ledger: Ledger,
  withRuntimeObservations: boolean,
  withStaticChecks: boolean
): Summary {
  const tally = ledgerTally(ledger);
  // The runtime evidence-observation totals are a FOLD OVER THE LEDGER —
  // the Ledger counts its own posted credits; the parallel census is RETIRED. `testVolume` and the
  // re-homed `rawByRuntimeQualityCheck` derive from THIS fold. The `withRuntimeObservations` flag is
  // now only the GATE (is the runtime-observation axis in play?) — the caller no longer threads a
  // census object at all (the assembler folds the Ledger it already has).
  const observations = runtimeObservationTally(ledger);
  // The static-check totals are a FOLD OVER THE LEDGER too — the Ledger counts its own
  // posted static-check credits; the parallel static census is RETIRED. `staticChecks` derives from
  // THIS fold. The `withStaticChecks` flag is now only the GATE (is the static-check axis in play?) —
  // the caller no longer threads a census object at all (the assembler folds the Ledger it holds).
  const staticChecks = staticObservationTally(ledger);
  return {
    scenarioReconciliations: tally.scenarioReconciliations,
    evidenceObligations: tally.evidenceObligations,
    pending: tally.pending,
    // The runtime test-volume kind-counts, materialised only when the evidenceObservations
    // read is threaded. The surface reads the fold's per-scenario-kind counts DIRECTLY (an identity
    // — the fold already groups by the scenario-kind the credit posted to). `onScenario` is every
    // credit posted to a scenario's account, which INCLUDES no-evidence-obligation as a subset
    // (matched-pair + no-evidence-obligation) — a DIFFERENT number from the reconciliation-matched-attributed
    // (the retired section's `attributed[]` sum, which excluded no-evidence-obligation). Keeping no-evidence-obligation
    // inside this count preserves the 3-termed identity `totalEvidenceObservations = onScenario +
    // onPhantomScenario + onSuspenseScenario` (no-evidence-obligation is a subset here, NOT a 4th identity term)
    // — the same shape the markdown's `### Test volume` line derives. `onPhantomScenario` /
    // `onSuspenseScenario` are the credits posted to the phantom / suspense accounts (suspense
    // includes `broken`).
    ...(withRuntimeObservations
      ? {
          testVolume: {
            // ASKED, not re-derived — the Ledger's fold computes this total and now
            // returns it. The assembler summed the same record again for it, which is an adapter
            // owning a model number by copied arithmetic.
            totalEvidenceObservations: observations.total,
            onScenario: observations.onScenario,
            onPhantomScenario: observations.onPhantomScenario,
            onSuspenseScenario: observations.onSuspenseScenario,
          },
          // The re-homed raw per-quality-check headline — a materialised Ledger
          // fold, sibling of `testVolume` and present on the SAME gate.
          rawByRuntimeQualityCheck: observations.rawByRuntimeQualityCheck,
        }
      : {}),
    // The static-check kind-counts, materialised only when the static-check axis is in
    // play — now a FOLD OVER THE LEDGER (`staticObservationTally`), symmetric with the
    // runtime `testVolume` fold. The surface keeps the census shape exactly
    // (`{ runningStaticCheckCount, uncitedStaticCheckCount }`; named is implicit). The member detail
    // lives in the rows (named → each scenario's fitness sub-row; no-evidence-obligation → the suspense
    // row) — there is no census section (2.4).
    ...(withStaticChecks ? { staticChecks } : {}),
    // The static-only fitness tally, a LEDGER-PURE derive from `ledgerTally` — LAST key in
    // document order (after the census pass-throughs).
    fitness: tally.fitness,
  };
}

/**
 * BUILD the Evidence Reconciliation from the journal — THE FACTORY.
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
 *
 * WHY THE TRAILING THREE ARE REQUIRED AND CARRY NO DEFAULTS. A gate that defaults to
 * `false` is a gate a caller can forget to state, and forgetting it CHANGES THE REPORT — the
 * summary then claims neither axis is in play, silently and plausibly. That is not a hypothetical:
 * when the defaults were removed, eleven call sites turned out to have been leaning on them. Every
 * one wanted exactly what it had been getting, so nothing moved; what changed is that each now says
 * so. A default is the wrong shape for an argument whose omission is indistinguishable from a
 * deliberate `false`.
 */
export function evidenceReconciliationOf(
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[],
  withRuntimeObservations: boolean,
  withStaticChecks: boolean
): EvidenceReconciliation {
  const ledger = reconcile(scenarios, evidenceObservations, untaggedScenarios);
  return { summary: summaryOf(ledger, withRuntimeObservations, withStaticChecks), ledger };
}
