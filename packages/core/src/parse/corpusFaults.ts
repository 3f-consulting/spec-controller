/**
 * THE `@SCN` SCHEME'S OWN RULES, asked of a target's Gherkin corpus — the rule half of
 * `spec-controller tags`.
 *
 * WHY IT SHIPS AT ALL. The tool hands a consumer the `@SCN` scheme and then made them write
 * the guards that keep it usable; 816 lines of exactly that sat in this repository's own check
 * tree, published nowhere. An adopter got the codes and inherited none of the policing, so
 * nobody's tags were policed but ours. These rules are the kind that CAN ship: every one of
 * them reads a corpus the engine already parses, rather than needing to know what a piece of
 * text IS.
 *
 * WHY IT IS IN CORE AND NOT AT THE CLI EDGE. It is `evidenceReconciliationFromSources`'s shape,
 * taken deliberately rather than by analogy. The published CLI module may reach core only
 * through the ROOT barrel — `./internal` is dropped by `publishConfig.exports` at pack time,
 * which is how an installed `balance --help` once threw ERR_PACKAGE_PATH_NOT_EXPORTED behind
 * thirteen green gates (3F-3086). So the CALLER lives on this side of the boundary and the app
 * hands over bytes; nothing internal is re-exported to buy it.
 *
 * WHAT SEPARATES A FAULT FROM A VERDICT. `balance`'s exit code IS its verdict — balanced, out of
 * balance, pending-under-strict, unsound, nothing-to-reconcile — and a corpus fault is not a
 * reconciliation verdict. It
 * is a statement that the corpus itself is malformed, which is why it is a second command with
 * its own status ladder rather than a fourth meaning bolted onto a status a consumer's CI
 * branches on.
 *
 * NOTHING HERE READS A FILE, AND NOTHING HERE RE-READS ONE. Every input arrives already read,
 * for `evidenceReconciliationFromSources`'s reason: an engine handed a reader is an engine doing
 * I/O wearing a callback, and `@SCN-EPG-001` reds over exactly that.
 *
 * WHAT IS LEFT IN THIS MODULE, AND WHAT MOVED OUT. The rules themselves live in three siblings —
 * `corpusCodeFaults.ts` (a code binding to a file), `corpusGrammarFaults.ts` (a tag meaning
 * something) and `corpusClaimFaults.ts` (how many checks one scenario claims) — because the joined
 * module reached the 400-line `max-lines` ceiling, twice, and canon rules that split rather than
 * an exception entry (@SCN-CPX-001). What stays here is the composition and the VOCABULARY: the
 * fault kinds, the shape of a discovered file, and the one entry point any sibling has. Splitting
 * on any other seam would have put a rule's inputs in one module and its finding's wording in
 * another.
 */

import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";
import { multipleCheckTags } from "./corpusClaimFaults.js";
import { duplicateFeatureCodes, foreignScenarioCodes } from "./corpusCodeFaults.js";
import { unrecognisedTags } from "./corpusGrammarFaults.js";
import type { KillFloorReader } from "./targetManifest.js";

/**
 * A target's manifest as these rules read it — its scripts, and its `specController` block.
 *
 * Spelled here rather than imported for the reason the reconcile composition spells its own:
 * every field of it is `unknown` until a resolver narrows it, so the type is a statement about
 * what a manifest on disk IS rather than a contract owed to anybody.
 */
export type TargetManifest = PackageJsonScripts & {
  specController?: {
    deferralTags?: unknown;
    thresholds?: unknown;
    fitnessChecks?: unknown;
  };
};

/**
 * One way a corpus breaks the `@SCN` scheme's own rules.
 *
 * FOUR KINDS, NOT ONE, because they are four faults with four different fixes — the same
 * argument that split the tier-tag check's findings three ways. `duplicate-feature-code` says
 * *give one of these files a code of its own*; `foreign-scenario-code` says *this id names a
 * file it is not written in*; `unrecognised-tag` says *this word means nothing here*; and
 * `multiple-check-tags` says *split this into two scenarios*. Collapsing any two would print one
 * fault's remedy at the other's author, which is precisely how a mistyped tier tag stayed
 * invisible for as long as it did.
 *
 * THE UNION IS THE COMMAND'S WHOLE VOCABULARY, and it is stated once here rather than grown a
 * member at a time by whichever rule landed last. That is also why it stayed in this module when
 * the rules left it: the two rule modules each raise a subset of these kinds, and a union
 * assembled from both sides would be a statement about the command that no single file made. The
 * two CODE rules have producers — `duplicate-feature-code` (@SCN-STG-010) and
 * `foreign-scenario-code` (@SCN-STG-011); so does `unrecognised-tag` (@SCN-STG-002, and the
 * clauses that narrow what it reaches at @SCN-STG-003, @SCN-STG-004, @SCN-STG-005 and
 * @SCN-STG-009); and since 3F-3307 so does `multiple-check-tags` (@SCN-STG-007). Every member of
 * the union is now raised by a rule with a scenario of its own, which is the state the kinds were
 * written down ahead of.
 */
export interface CorpusFault {
  readonly kind:
    | "unrecognised-tag"
    | "multiple-check-tags"
    | "duplicate-feature-code"
    | "foreign-scenario-code";
  readonly message: string;
}

/** One discovered feature file, as the edge read it. */
export interface CorpusFile {
  /** The feature-file basename without the `.feature` extension. */
  slug: string;
  /**
   * The file's `@<FFF>` header code, or null where it carries none.
   *
   * IT ARRIVES; IT IS NEVER RE-DERIVED HERE. The header is read by exactly one thing — the
   * ingest edge's `extractFeatureCode` — and that is also the reading a reconciliation's
   * *Out-of-balance by feature* cut groups on. A second reading inside this module would be free
   * to disagree with the report about the very field these rules are ABOUT, and the check could
   * then pass clean over a corpus whose report mis-attributes a scenario. So it is a parameter.
   */
  featureCode: string | null;
  /** The file's raw Gherkin source, read once at the edge. */
  source: string;
}

/**
 * Every way this corpus breaks the scheme, in a stable order.
 *
 * THE ONE ENTRY POINT, and the reason the rules' own modules are not on the barrel. A consumer's
 * route to this capability is the CLI; a second route through an imported rule would be a second
 * surface to freeze, and it would let the code rules and the grammar rules be run over two
 * different readings of one corpus.
 *
 * @param input.features the target's discovered feature files — slug, header code and source,
 * read ONCE at the edge so two discoveries can never disagree about which corpus was judged.
 * @param input.packageJson the TARGET's manifest, from which the check-tag union and the
 * recognised deferral set are resolved INSIDE this engine — through the same resolvers the
 * reconciliation reads them with, so the rules here admit exactly what the obligation rule
 * raises against. READ SINCE 3F-3303, by the grammar rules and only by them: the deferral set
 * (@SCN-PND-021), the REGISTERED half of the check-tag union (@SCN-STG-005) and, since 3F-3306,
 * its MEASURED half (@SCN-STG-009) are all resolved from it. The code rules never see it, which
 * is the seam the module split was drawn on.
 * @param input.deferralTags the application layer's STARTER deferral set, which a target's
 * config may only extend. Product policy, single-sourced there and never here — the same
 * argument, and the same parameter, as the reconcile composition's. Read since 3F-3303, and
 * handed onward unresolved: what turns it into the target's recognised set is
 * `resolveDeferralTags`, called once beside the rule that asks the question.
 * @param input.killFloor the reader over the target's mutation records, injected as a closure
 * because the thresholds resolver has to reach one to read a bar that names a gate
 * (@SCN-MUT-012). READ SINCE 3F-3306, by the grammar rules and only by them: the check-tag
 * union's MEASURED half is the target's thresholds, and resolving those is what reaches a record.
 * It is handed onward UNUSED-LOOKING and that is deliberate — a threshold KEY survives whatever
 * its bar resolves to (@SCN-MUT-003), so this reader cannot move a tag-grammar verdict today.
 * What it buys is that the set is resolved by the resolver that owns it, on the tree the manifest
 * came from, rather than by a cheaper reading beside it that would agree until it did not.
 */
export function corpusFaults(input: {
  features: readonly CorpusFile[];
  packageJson: TargetManifest;
  deferralTags: readonly string[];
  killFloor: KillFloorReader;
}): CorpusFault[] {
  return [
    ...duplicateFeatureCodes(input.features),
    ...foreignScenarioCodes(input.features),
    ...unrecognisedTags(input.features, input.packageJson, input.deferralTags, input.killFloor),
    // THE CLAIM RULE LAST, which is where the private check's own walk put it: below the grammar
    // question, above nothing. Inside that walk the position WAS the parking scope — this rule
    // ran only for scenarios the parked-continue had not already skipped — and here it can only
    // order the findings, so the scope is a clause the rule writes out for itself. What the
    // position still carries is the reading order: a corpus with both faults tells its author
    // which of its words mean nothing before it tells them they have claimed two that do.
    ...multipleCheckTags(input.features, input.packageJson, input.deferralTags, input.killFloor),
  ];
}
