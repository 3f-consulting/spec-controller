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
 * I/O wearing a callback, and `lint:boundaries`' `core-imports-io` rule reds over exactly that
 * (@SCN-EPG-001's `io-import` arm until 3F-3437).
 *
 * WHAT IS LEFT IN THIS MODULE, AND WHAT MOVED OUT. The rules themselves live in two siblings —
 * `corpusCodeFaults.ts` (a code binding to a file) and `corpusGrammarFaults.ts` (a tag meaning
 * something) — because the joined module reached the 400-line file-length ceiling then in force,
 * and canon ruled a split rather than an exception entry. (That ceiling was retired
 * portfolio-wide on 2026-09-18, 3F-2320; the seam it prompted is the rules' own and stands
 * without it.) A third sibling held the claim rule
 * (how many checks one scenario claims) until it left with the measured axis (3F-3516). What
 * stays here is the composition and the VOCABULARY: the fault kinds, the shape of a discovered
 * file, and the one entry point any sibling has. Splitting on any other seam would have put a
 * rule's inputs in one module and its finding's wording in another.
 */

import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";
import { duplicateFeatureCodes, foreignScenarioCodes } from "./corpusCodeFaults.js";
import { unrecognisedTags } from "./corpusGrammarFaults.js";

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
  };
};

/**
 * One way a corpus breaks the `@SCN` scheme's own rules.
 *
 * THREE KINDS, NOT ONE, because they are three faults with three different fixes — the same
 * argument that split the tier-tag check's findings three ways. `duplicate-feature-code` says
 * *give one of these files a code of its own*; `foreign-scenario-code` says *this id names a
 * file it is not written in*; and `unrecognised-tag` says *this word means nothing here*. A
 * fourth, `multiple-check-tags`, left with the measured axis (3F-3516). Collapsing any two would
 * print one fault's remedy at the other's author, which is precisely how a mistyped tier tag
 * stayed invisible for as long as it did.
 *
 * THE UNION IS THE COMMAND'S WHOLE VOCABULARY, and it is stated once here rather than grown a
 * member at a time by whichever rule landed last. That is also why it stayed in this module when
 * the rules left it: the two rule modules each raise a subset of these kinds, and a union
 * assembled from both sides would be a statement about the command that no single file made. The
 * two CODE rules have producers — `duplicate-feature-code` (@SCN-STG-010) and
 * `foreign-scenario-code` (@SCN-STG-011); so does `unrecognised-tag` (@SCN-STG-002, and the
 * clauses that narrow what it reaches at @SCN-STG-003, @SCN-STG-004 and @SCN-STG-005). Every
 * member of the union is raised by a rule with a scenario of its own, which is the state the kinds
 * were written down ahead of.
 */
export interface CorpusFault {
  readonly kind:
    | "unrecognised-tag"
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
 * @param input.packageJson the TARGET's manifest, from which the recognised deferral set is
 * resolved INSIDE this engine — through the same resolver the reconciliation reads it with, so the
 * rules here admit exactly what the reconciliation honours as a skip. READ SINCE 3F-3303, by the
 * grammar rules and only by them: the deferral set (@SCN-PND-021) is resolved from it. The
 * check-tag halves once read from it — the REGISTERED half (@SCN-STG-005) and the MEASURED half
 * — are retired (3F-3161, 3F-3516). The code rules never see it, which is the seam the module
 * split was drawn on.
 * @param input.deferralTags the application layer's STARTER deferral set, which a target's
 * config may only extend. Product policy, single-sourced there and never here — the same
 * argument, and the same parameter, as the reconcile composition's. Read since 3F-3303, and
 * handed onward unresolved: what turns it into the target's recognised set is
 * `resolveDeferralTags`, called once beside the rule that asks the question.
 */
export function corpusFaults(input: {
  features: readonly CorpusFile[];
  packageJson: TargetManifest;
  deferralTags: readonly string[];
}): CorpusFault[] {
  return [
    ...duplicateFeatureCodes(input.features),
    ...foreignScenarioCodes(input.features),
    ...unrecognisedTags(input.features, input.packageJson, input.deferralTags),
  ];
}
