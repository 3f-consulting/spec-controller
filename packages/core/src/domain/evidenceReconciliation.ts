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
 * gone home. Every importer now points at the module that OWNS the symbol.
 *
 * (3F-2233 completes the move: the concept's TYPE, its `Summary`, and the factory that fuses this
 * fold with the summary tally. Today this module holds the fold alone.)
 *
 * The pure obligation-vs-observation join, keyed by one flat
 * `qualityCheck` (the two-axis `(kind, level)` grid collapsed). This module is THIN
 * COMPOSITION: the domain RULES it once held moved to the
 * concept modules that own them (3F-1994) — `reconcileEvidenceObligation` (the per-obligation
 * outcome) to `domain/qualityCheckReconciliation`, `verdictFor` / `reconcilingItemsOf` (the
 * account roll-up) to `domain/scenarioReconciliation`, `isBalanced` / `hasPendingItems` /
 * `hasBrokenEvidence` (the whole-run predicates) to `domain/ledger`. `reconcile` is the fold that
 * WALKS the inputs, CALLS those rules, and BUILDS the rows; it is the orchestration, not their home.
 *
 * POSTING-DESTINATION left too (3F-2202) — WHERE an entry lands is canon's own glossary group
 * ("### Posting") and now lives on `domain/posting`: `postingOf`, the one citation route over both
 * axes (plus the no-evidence-obligation-static-check arm). The by-name half is gone (3F-2590).
 * The fold no longer DECIDES a destination anywhere — it
 * asks the rule once per credit and files the answer. What remains is assembly: which rows exist,
 * in what order, holding which items.
 *
 * Per the slice design: for each evidence obligation a scenario raises (a reconciling
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
  FitnessEvidenceObservation,
  EvidenceObservation,
  ScenarioReconciliation,
  PendingItem,
  RuntimeEvidenceObservation,
  Ledger,
} from "../model.js";
import {
  evidenceObligationPairsOf,
  // THE PENDING PARTITION (3F-2204) — the two exact complements over a scenario's obligations.
  evidenceObligationsOf,
  pendingItemsOf,
} from "../model.js";
import {
  reconcileEvidenceObligation,
  // THE CREDIT-SIDE AND DEGENERATE OUTCOME RULES (3F-2204) — what an entry reconciles TO, as
  // opposed to where it lands. `reconcile` asks; it no longer maps outcomes itself.
  noEvidenceObligationReconciliationsOf,
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
import { postingOf } from "./posting.js";
// The `lint` quality-check's own sub-discriminator (@SCN-CIP-003), asked here to NARROW what the
// posting rule has already routed — see the fitness arm below.
import { isStaticCheckObservation } from "../model.js";

/** A destination that names ONE row — the two citation-routed `Posting` kinds. */
type CitedPosting = { kind: "scenario" | "phantom-scenario"; scnId: string };

/**
 * THE CITATION INDEX — the credits routed BY CITATION, held by the row each one names, plus the
 * phantom ids those credits MINTED, in first-seen order (@SCN-LDG-006).
 *
 * It became a thing of its own when the static axis started citing (@SCN-LNT-001). Before that
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
  /** Proofs that never ran, from EITHER axis (@SCN-LDG-017, @SCN-LNT-026). */
  readonly brokenEvidence: readonly (RuntimeEvidenceObservation | GuardEvidenceObservation)[];
  /** Runtime credits that RAN and carried no `@SCN`. */
  readonly uncited: readonly RuntimeEvidenceObservation[];
  /** Static checks that ran with no Evidence Obligation naming them. */
  readonly noEvidenceObligationGuards: readonly FitnessEvidenceObservation[];
}

/**
 * THE ONE ROUTING PASS (3F-2202). Every credit is routed ONCE, by THE posting rule
 * (`domain/posting`), into the structures the fold reads. `reconcile` no longer DECIDES a
 * destination anywhere — it asks, and files the answer.
 *
 * This replaces two passes that re-stated the SAME four routing decisions (the citation index and
 * the phantom-id scan) plus three stream filters. They agreed by copy-paste, not by construction:
 * either could have grown an arm alone and nothing would have redded — the identical anaemia
 * `evidenceObligationPairsOf` was extracted to cure.
 *
 * ITS OWN FUNCTION, extracted at @SCN-LNT-026 when the static axis gained its second suspense
 * reason and took `reconcile` past the `complexity` and `max-lines-per-function` ceilings. Routing
 * is one idea with a name and the fold below is another; nothing about what it decides moved, and
 * the exception list is untouched — an exception buys no headroom.
 */
function routeCredits(
  evidenceObservations: readonly EvidenceObservation[],
  scenarioIds: ReadonlySet<string>
): RoutedCredits {
  // THE CITATION INDEX holds BOTH axes now (@SCN-LNT-001): a fitness check's run cites the
  // scenario that raises its obligation, so it files here exactly as a test result does.
  const citations = citationIndex();
  // The three SUSPENSE streams, kept separate and each in observation order — the suspense row's
  // item order (broken first, then uncited, then the no-evidence-obligation static checks) is row
  // assembly, owned by the fold in `reconcile`, not a routing decision.
  // BROKEN EVIDENCE FROM EITHER AXIS (@SCN-LNT-026). It was a runtime-only stream while `broken`
  // was a runtime-only fact; a converted static check that did not run is the same fact about the
  // same kind of absence, so it lands in the same stream and renders through the same section.
  const brokenEvidence: (RuntimeEvidenceObservation | GuardEvidenceObservation)[] = [];
  const uncited: RuntimeEvidenceObservation[] = [];
  // The FITNESS union, not the static interface alone (@SCN-CIP-003). A measurement always cites —
  // its runner stamps the citation — so it cannot in fact reach suspense; the stream is typed to
  // what `postingOf` may hand it rather than to what today's producers happen to emit.
  const noEvidenceObligationGuards: FitnessEvidenceObservation[] = [];
  for (const o of evidenceObservations) {
    // The union NARROW — `qualityCheck === "lint"` is the `EvidenceObservation` union's TYPE TAG,
    // not a posting decision. Which axis a credit rides is read here; where it LANDS is the rule's,
    // on both branches.
    if (o.qualityCheck === "lint") {
      const posting = postingOf(o, scenarioIds);
      // THE SPLIT ON THIS AXIS TOO (@SCN-LNT-026), the twin of the runtime arm's below. Both
      // reasons post to suspense because neither names a row, and they stay in separate streams
      // because they are different facts with different remedies: a check nobody named RAN and
      // wants an obligation written for it; a broken one never ran and wants its harness fixed.
      //
      // THE SECOND CLAUSE IS THE NARROW, NOT A SECOND DECISION. `postingOf` reaches `broken` on
      // this axis only through `isStaticCheckObservation`, so asking the same predicate here
      // cannot disagree with it — it re-states what the rule already settled in the one form the
      // compiler accepts. Nothing falls between the two arms: an observation that somehow took
      // neither still lands in the second, misfiled rather than vaporised.
      if (posting.kind === "suspense-scenario") {
        if (posting.posted === "broken" && isStaticCheckObservation(o)) brokenEvidence.push(o);
        else noEvidenceObligationGuards.push(o);
      }
      // A CITING run files into the citation index like any other credit (@SCN-LNT-001) —
      // exactly one row, real or invented. There is no third destination left (3F-2590).
      else citations.file(posting, o);
      continue;
    }
    const posting = postingOf(o, scenarioIds);
    switch (posting.kind) {
      case "scenario":
      case "phantom-scenario": {
        // THE CITATION INDEX holds real AND invented ids alike — a phantom row reads its posted
        // credits from here too, so both citation-routed destinations file together.
        citations.file(posting, o);
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
  return { citations, brokenEvidence, uncited, noEvidenceObligationGuards };
}

export function reconcile(
  scenarios: Scenario[],
  evidenceObservations: EvidenceObservation[],
  untaggedScenarios: readonly string[] = []
): Ledger {
  const scenarioReconciliations: ScenarioReconciliation[] = [];

  // THE OBLIGATION SIDE, prepared once — the three sets the posting rule and the outcome rules read.
  // Each is already the MODEL's own rule (never re-derived here), and each is built ONCE and
  // shared, so no two consumers can drift: `scenarioIds` is which scenarios exist,
  // and `evidenceObligationPairs` is what they name at each quality-check (3F-1858).
  const scenarioIds = new Set(scenarios.map((d) => d.scnId));
  // The NAMED pairs — the model's rule, built ONCE and shared with the census (3F-1858).
  // Pending obligations are excluded: a pending obligation names nothing.
  const evidenceObligationPairs = evidenceObligationPairsOf(scenarios);
  // THE ONE ROUTING PASS (3F-2202) — asked of the posting rule, in one place, and read back as
  // four streams. What each of them then RECONCILES to is the fold's, below.
  const { citations, brokenEvidence, uncited, noEvidenceObligationGuards } = routeCredits(
    evidenceObservations,
    scenarioIds
  );
  for (const d of scenarios) {
    // THE PENDING PARTITION (@SCN-PND-004) — `pendingItemsOf` and `evidenceObligationsOf`
    // are exact complements over the scenario's obligations, so nothing is dropped and nothing is
    // counted twice. Rule + rationale: `domain/journal`.
    const pendingItems: PendingItem[] = pendingItemsOf(d);

    // The DEBIT side — each NAMED obligation reconciled against the observed evidence.
    const reconciledEvidenceObligations = evidenceObligationsOf(d.evidenceObligations).map((req) =>
      reconcileEvidenceObligation(d.scnId, req, evidenceObservations)
    );

    // The CREDIT side — NO-EVIDENCE-OBLIGATION (@SCN-LDG-008): a credit citing THIS real scenario at a
    // quality-check it never named. Rule + rationale: `domain/qualityCheckReconciliation`.
    const noEvidenceObligationItems = noEvidenceObligationReconciliationsOf(
      d.scnId,
      citations.creditsFor(d.scnId),
      evidenceObligationPairs
    );

    // The row's SUB-ROWS, degenerating to one `both-missing` item when the row reconciled to
    // nothing either way (@SCN-LDG-009). Rule + rationale: `domain/scenarioReconciliation`.
    const qualityCheckReconciliations = qualityCheckReconciliationsOf(
      reconciledEvidenceObligations,
      noEvidenceObligationItems,
      pendingItems
    );
    scenarioReconciliations.push({
      scnId: d.scnId,
      kind: "scenario",
      verdict: verdictFor(qualityCheckReconciliations),
      // THE POSTED CREDITS (@SCN-LDG-022) — every credit CITING this scenario, whatever it
      // reconciles to above. The citation index holds every citing credit, so this includes one citing a
      // PENDING quality-check, which reconciles `no-evidence-obligation` (3F-1858 — it used to reconcile to
      // NO ROW AT ALL, the false-green this posting made visible without fixing). It posts and is
      // findable WHATEVER it reconciles to; posting is not classifying, and a misclassification
      // must misfile an entry, never vaporise it. A fitness check's run is in here too and by the
      // SAME route (3F-2590): it cites this scenario, so the citation index holds it like any other.
      evidenceObservations: citations.creditsFor(d.scnId),
      // THE POSTED DEBITS (@SCN-LDG-023) — every obligation THIS scenario RAISES, in document
      // order, keyed by quality-check. The debit half of the same posting: where a credit is
      // routed by its citation, a debit needs no routing at all — the account IS the scenario.
      // Includes a PENDING obligation, which partitioned off above and earns NO reconciled row: it
      // posts ANYWAY. Posting is not classifying, on this side too.
      evidenceObligations: [...d.evidenceObligations],
      qualityCheckReconciliations,
      reconcilingItems: reconcilingItemsOf(qualityCheckReconciliations),
      pendingItems,
    });
  }

  // CREDIT-SIDE — PHANTOM scenarios (@SCN-LDG-006). One phantom Scenario Reconciliation per
  // UNKNOWN cited id, in first-seen order, its Quality Check Reconciliation(s) carrying the
  // outcome `cites-unknown-scenario` (and the evidence observation's locator, ruling Q5), verdict
  // ALWAYS out-of-balance. Grouped AFTER the scenario rows.
  //
  // `phantomIds` was ROUTED ABOVE (3F-2202) — this block only ASSEMBLES the rows. The scan that
  // stood here re-stated the citation index's four routing decisions verbatim, including the
  // fail-safe arms (a BROKEN credit mints no phantom row; an uncited credit is suspense, never
  // phantom); both now come from the one `postingOf` call.
  for (const scnId of citations.phantomIds) {
    const credits = citations.creditsFor(scnId);
    // ASKED, not decided (3F-2204).
    const items = citesUnknownScenarioReconciliationsOf(credits);
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
      evidenceObservations: [...credits],
      // A phantom account is MINTED BY A CREDIT — no scenario raises it, so nothing can have
      // been named of it. Its debit side is empty by construction (@SCN-LDG-023); the asymmetry
      // with the credit side is real, not an omission.
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
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
  if (brokenEvidence.length > 0 || uncited.length > 0 || noEvidenceObligationGuards.length > 0) {
    const items = suspenseReconciliationsOf(brokenEvidence, uncited, noEvidenceObligationGuards);
    scenarioReconciliations.push({
      scnId: "(no scenario)",
      kind: "suspense-scenario",
      // ASKED, not restated — same reason as the phantom row. The `if` above is what makes this
      // out-of-balance by construction: the row exists only when a credit landed on it.
      verdict: verdictFor(items),
      // The credits citing NO scenario post here (@SCN-LDG-022) — the uncited, the broken (it
      // named no test, so it cites nothing whatever scnId it structurally carries), and the
      // no-evidence-obligation static checks. With the citation index this exhausts the credit stream.
      evidenceObservations: [...brokenEvidence, ...uncited, ...noEvidenceObligationGuards],
      // Suspense is MINTED BY A CREDIT too — it raises nothing, so it names nothing
      // (@SCN-LDG-023). It can therefore carry no Pending Item either.
      evidenceObligations: [],
      qualityCheckReconciliations: items,
      reconcilingItems: items,
      pendingItems: [],
    });
  }

  // UNCODED WORK (@SCN-LDG-021) — a scenario carrying no @SCN. It is REAL and ORDINARY
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
      // It reaches the ledger by NAME, carrying no parsed obligations — so it posts no debits
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
 * of THOSE no `@lint` cites — a subset of the first, @SCN-LNT-033). The named count is IMPLICIT
 * (`running − uncited`) and is not carried (every named static check is already a reconciled
 * `@lint` sub-row); drawn from one population under one membership rule, it cannot go below nil.
 */
export interface StaticCheckTotals {
  runningStaticCheckCount: number;
  uncitedStaticCheckCount: number;
}

/**
 * ONE STEP THAT IS THE RECONCILER (@SCN-USG-014) — the step, as the report names one, and which
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
 * ONE STEP RECOGNISED AS THE RUNNER OF ONE TIER (@SCN-USG-011) — the tier the target named it
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

/**
 * ONE JOB OF ONE WORKFLOW THIS RUN READ (@SCN-USG-020) — where the steps came from, and how many
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
 * WHAT BECAME OF EVERY STEP THIS RUN READ (@SCN-USG-018) — the population, the four dispositions,
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
   * The Pending Items tally (@SCN-PND-011) — the count of Pending Items across the
   * reconciliation (one per deferred `<quality-check>pending` obligation, evidence-manifesto §11B),
   * SEPARATE from the scenario balanced / out-of-balance counts and the evidence-obligation counts.
   * A Pending Item is deferred, NOT out-of-balance, so it is NEVER folded into
   * `OUT_OF_BALANCE_OUTCOMES` (never a leaf of its own, at any leaf count — the constraint is
   * categorical, not arithmetic) nor into `evidenceObligations` — its own tally.
   * Counts Pending ITEMS, not scenarios-carrying-pending (mirroring the out-of-balance
   * decomposition, which counts obligations, not scenarios). Always present (a pure balance derive,
   * like `lint`); reads 0 when no scenario raises a pending obligation.
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
  /**
   * The scenarios ON the fitness axis that no configured row NAMES (@SCN-LNT-020) — the corpus's
   * half-converted checks, in corpus order.
   *
   * NOT A LEDGER FOLD, and it says so by being the one member here that is not. It is a fact about
   * the CORPUS — what a scenario said about itself and what no row said back — which the Ledger
   * cannot hold: such a scenario raises nothing, so nothing about it reaches a row except the
   * degenerate `both-missing` item its emptiness earns, and that item's own gloss is about a
   * scenario carrying no `@SCN`. It rides beside `staticChecks` for the reason that one does: the
   * report's `### Static checks` section is where a half-entry the run saw and nothing owed is
   * named, and this is that same class of half-entry on the other side of the books.
   *
   * PRESENT ONLY WHEN NON-EMPTY, so a target that has converted nothing — every target today —
   * renders and serialises exactly as it did before.
   */
  unconfiguredFitnessScenarios?: readonly string[];
  /**
   * THE STEPS RECOGNISED AS BEHAVIOURAL RUNNERS (@SCN-USG-011), in the order the pipeline runs
   * them — what the target named, found where its pipeline invokes it.
   *
   * NOT A LEDGER FOLD, and it rides here for the reason `unconfiguredFitnessScenarios` does: it is
   * a fact about what the reader SAW, not about anything the books hold. A runner raises no
   * obligation and posts no credit — it is the disposition a step gets INSTEAD of reaching the
   * ledger — so there is no row for it to be derived from and it has to be carried.
   *
   * PRESENT ONLY WHEN NON-EMPTY, so a target that has named no runners renders and serialises
   * exactly as it did before.
   */
  behaviouralRunners?: readonly BehaviouralRunner[];
  /**
   * WHAT THE TARGET SAID ABOUT EACH TIER (@SCN-USG-016) — `specController.runners` as written: the
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
   * THE RUNNER BLOCK'S KEYS THAT ARE NOT ONE OF THE FOUR CANON TIERS (@SCN-USG-019) — what the
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
   * THE STEPS THE TARGET NAMES NON-CHECKS (@SCN-USG-015) — `specController.notChecks`' entries
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
   * THE STEPS THAT ARE THE RECONCILER (@SCN-USG-014) — the step running this reconciliation and
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
   * THE `notChecks` ENTRIES THAT NAMED NO STEP (@SCN-USG-015) — in the order the manifest wrote
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
   * THE SCOPE THIS RUN RANGED OVER (@SCN-USG-020) — one entry per job of every workflow `--ci`
   * resolved, sorted by workflow and then by job.
   *
   * IT CARRIES THE PROVENANCE OF EVERY OTHER FIGURE ON THE REPORT, which is why it has to be
   * carried at all. The census above states how many checks ran; nothing anywhere states how many
   * jobs, in how many files, that number came from — so a consumer whose second job holds three
   * checks reads exactly what a consumer with three checks in one job reads, and a consumer
   * pointed at the wrong file has nothing that says so. The tool makes no judgement about whether
   * a scope is the right one; stating it is the answer.
   *
   * NOT THE ACCOUNTING IDENTITY, which is a separate claim over the same steps (@SCN-USG-018).
   * That one asserts the dispositions sum to the steps read, so nothing was dropped; this one
   * asserts WHERE the steps came from. A reader satisfies either alone.
   *
   * PRESENT ONLY WHEN NON-EMPTY, so a run that read no CI configuration at all renders and
   * serialises byte-identically to before.
   */
  discoveryScope?: readonly JobDiscoveryScope[];
  /**
   * WHAT BECAME OF EVERY STEP THIS RUN READ (@SCN-USG-018) — the population, the four dispositions
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
    // lives in the rows (named → each scenario's `@lint` sub-row; no-evidence-obligation → the suspense
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
 *
 * WHY THE TRAILING THREE ARE REQUIRED AND CARRY NO DEFAULTS (3F-2875). A gate that defaults to
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
