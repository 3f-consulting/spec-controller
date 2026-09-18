/**
 * THE GRAMMAR RULES of `spec-controller tags` — everything about whether a TAG on a scenario
 * means anything. Its sibling holds the other question: `corpusCodeFaults.ts` whether a feature
 * code binds to one feature file. `corpusFaults.ts` composes the two and is the only entry point
 * either of them has.
 *
 * THE SEAM, STATED FROM THIS SIDE. A grammar rule asks *is this word part of the `@SCN` scheme*,
 * and the answer is assembled from places that are not this module's: the engine's own
 * quality-check maps, the `SCN-<FFF>-<NNN>` spelling `featureCodeOf` owns, and the target's own
 * manifest. A code rule needs none of those; it reads the corpus's shape. Two questions, two
 * modules; the split happened when the joined module reached the 400-line `max-lines` ceiling
 * with four more grammar clauses still to land (@SCN-FIT-001, and never an exception entry). The
 * claim rule that once made a third sibling left with the measured axis (3F-3516): once the axis
 * word is the only word that names a check, no scenario can claim two.
 *
 * AND THE TARGET'S HALF IS RESOLVED HERE, NOT HANDED IN RESOLVED. The composition hands this
 * module a manifest rather than an answer, so the read lives beside the rule that uses it — the
 * arrangement the parent's Design settled for the check-tag union and applied here first, because
 * the whole reason the floor and the obligation rule once disagreed about a set was that each
 * assembled its own. The composition passes bytes and policy; what a word MEANS is decided in one
 * place.
 *
 * NOTHING HERE IS RESTATED. The recognised set is the whole subject of this module, and every
 * member of it is DERIVED from the place that already owns it — a list written out here would
 * agree with its source by diligence and then drift, and the check that then reds is the one
 * telling authors which words are legitimate.
 */

import { featureCodeOf } from "../lib/featureCode.js";
import type { CorpusFault, CorpusFile, TargetManifest } from "./corpusFaults.js";
import {
  FITNESS_AXIS_TAG,
  PENDING_QUALITY_CHECK_TAGS,
  RUNTIME_QUALITY_CHECK_TAGS,
  parseTaggedScenarios,
} from "./scenarios.js";
import { resolveDeferralTags } from "./targetManifest.js";

/**
 * The tier tags an unrecognised tag is measured against, and the set that answers whether a tag
 * NAMES a tier at all.
 *
 * DERIVED, NEVER RESTATED, which is the whole reason this rule could ship. The words live in the
 * engine's own quality-check maps; a list written out here would agree with them by diligence and
 * then drift the first time a tier is added — and the check that then reds is the one telling
 * authors which words are legitimate.
 *
 * BARE `lint` IS ONE OF THEM and is not in either map, because `@lint` is not a runtime tier: it
 * is the style-lint check, a flat peer of `@complexity`, which raises a `lint` obligation without
 * a runtime observation. It is named here rather than pushed into `TAG_TO_QUALITY_CHECK`, where
 * it would start raising runtime obligations for every scenario that carries it.
 *
 * `lintpending` ARRIVES WITH THE PENDING LIST, and that is one word wider than the private check
 * this rule moved out of. That check kept its own four-member tier list, so `@lintpending` was
 * unrecognised there while the engine beside it read the same tag as a deferred `lint`
 * obligation — two readers of one corpus disagreeing about one word, which is precisely the
 * second reading this module exists to end. Taking the engine's own lexicon closes it.
 */
const TIER_TAGS: readonly string[] = [
  ...RUNTIME_QUALITY_CHECK_TAGS,
  "lint",
  ...PENDING_QUALITY_CHECK_TAGS,
];

/**
 * Every word that NAMES A CHECK on this target (@SCN-STG-005) — the set the grammar admits
 * beside the scheme's own tier tags.
 *
 * ONE ASSEMBLY, AND THAT IS THE WHOLE POINT OF ITS BEING HERE. The tier floor this rule
 * replaced assembled its own copy at a private CLI while the obligation rule assembled another
 * in the engine, and the two coming to disagree about this set cost a slice (3F-3126). Resolving
 * it beside the rule that asks the question means the words this command calls legitimate are
 * the words the engine beside it raises obligations from — there is no second answer to fall
 * behind the first, and no package boundary for one to be resolved on either side of.
 *
 * NO BARE TAG NAMES A CHECK ANY LONGER (3F-3161). The target's own check registry used to be
 * read here as the TARGET's answer for which bare words meant a check; that reading is retired,
 * and a bare check tag is grammar nowhere now, registered or not. The measured tags read off the
 * target's own thresholds left with the measured axis (3F-3516), so the one word this function
 * admits beside the scheme's own tiers is the converted axis word — and it reads no manifest to
 * find it, because the word is the model's. A target still writing a bare check tag is read
 * nowhere by this assembly, which is the whole of what @SCN-STG-005 changed.
 *
 * AND THE AXIS WORD IS NOT THE TARGET'S TO GRANT (3F-3138, 3F-3149). A CONVERTED check carries
 * one word for the whole axis and puts its CHARACTERISTIC on a configured row, so the retired
 * registry names it nowhere and never will. Which words name a CHECK is the target's
 * answer; which axis a scenario is ON is the model's, exactly as `unit` is — so the word is
 * admitted whatever the manifest holds, and a target that has converted nothing does not get to
 * spell it differently. It arrives as `FITNESS_AXIS_TAG`, the one spelling of it, because a
 * literal written out here would be a second answer travelling under the first's name.
 *
 * A CONVERTED SCENARIO NO CONFIGURED ROW NAMES IS ADMITTED, deliberately: that IS a corpus
 * fault, and it is @SCN-LNT-020's, which names the scenario by id and leaves the one remedy
 * there is. Redding it here too would print half of one fault in a second place with the wrong
 * remedy attached — *this word means nothing here*, said to an author whose scenario names the
 * one axis the model has.
 */
function checkTagsOf(): readonly string[] {
  return [FITNESS_AXIS_TAG];
}

/** Levenshtein distance, uncapped — the strings here are tag-length. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * The tier an unrecognised tag was probably meant to be, or undefined when none is close.
 *
 * A COURTESY, NEVER THE VERDICT. The tag reds whether or not a suggestion is found, so a wrong
 * guess costs a poor message and nothing else. A guess that DECIDED the outcome would make the
 * command only as good as its edit distance.
 *
 * Distance 2 rather than 1 catches the drop-plus-transpose shapes (`@untegration`); wider than
 * that and `@e2e` starts attracting every short tag in the corpus.
 */
function nearestTier(bare: string): string | undefined {
  let best: string | undefined;
  let bestDistance = 3;
  for (const tier of TIER_TAGS) {
    const distance = editDistance(bare.toLowerCase(), tier);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = tier;
    }
  }
  return best;
}

/**
 * The bare tag a group-prefixed tag should have been (@SCN-STG-004), or undefined where the tag
 * carries no value to strip a group from.
 *
 * `fitness=complexity` spells into the tag what the model already holds. There is no
 * `behavioural=unit`, so there is no `fitness=complexity` (canon 2026-08-07, the bare-tags
 * Correction) — and the author's intent survives the mistake intact: drop the group and what is
 * left is the tag they wanted.
 *
 * NO LIST OF GROUP NAMES IS CONSULTED, because there is nothing to list. The words a codebase
 * might reach for are not enumerable, and a list of the ones canon happens to name would green the
 * first group name nobody thought of. So the SHAPE is the whole of the rule: a value means a group
 * was spelled in, whatever the group is called.
 *
 * AND THE RETIRED `lint=<handle>` FORM REACHES IT, served by the same rule rather than carved out.
 * That form raises no Evidence Obligation (@SCN-LNT-007), so admitting it as a tier would let a
 * scenario look tiered while owing nothing — which is the silent slip these rules exist to close,
 * re-opened by the one shape a reader would most expect to be excused. The private check this rule
 * replaced did carve it out, for as long as the form was live; nothing here has to remember to
 * take that clause away again.
 *
 * IT DECIDES NOTHING, WHICH IS WHY IT IS SAFE TO BE THIS BROAD. `isGrammar` has already answered
 * the verdict by the time this is asked; a tag reaching here reds whatever this returns.
 */
function groupPrefixedMember(tag: string): string | undefined {
  return /^[^=]+=(.+)$/.exec(tag)?.[1];
}

/**
 * Why an unrecognised tag is unrecognised, and what to write instead — the clause following
 * `carries @<tag>,` in the message.
 *
 * TWO SHAPES, ONE VERDICT, TWO MESSAGES. A group-prefixed tag resembles no tier, so edit distance
 * has nothing to offer it (@SCN-STG-004); what it has instead is a legible intent, and the message
 * names the bare tag rather than leaving the author to work out which half of their tag was the
 * mistake. Every other unrecognised tag falls back to the near-miss courtesy, which stays a
 * courtesy and never the verdict (@SCN-STG-002). Collapsing the two would print one fault's remedy
 * at the other's author — the wrong-message failure the fault kinds were split to avoid.
 */
function unrecognisedTagFault(tag: string): string {
  const member = groupPrefixedMember(tag);
  if (member !== undefined) {
    return (
      `which spells a group into the tag — a check is named bare, its group living in the ` +
      `model — so this should have been @${member}`
    );
  }
  const suggestion = nearestTier(tag);
  return (
    `which is neither an evidence tier nor a recognised deferral tag` +
    (suggestion === undefined ? "" : ` — did you mean @${suggestion}?`)
  );
}

/**
 * Is this tag part of the `@SCN` scheme's grammar, on a scenario in this file?
 *
 * SIX CLAUSES, AND ONE OF THEM CARRIES THE WHOLE CHECK-TAG SET. What this rule reaches is the
 * scheme's own words, the target's deferral set, and `checkTagsOf`'s one word — the axis word (a
 * bare check tag is grammar nowhere now, 3F-3161, and the measured tags left with the measured
 * axis, 3F-3516). That the set grew and then shrank to one source changed nothing here, which is
 * the point of assembling it there: a clause reading one source at a time would have had to move
 * with it.
 *
 * THE FILE'S HEADER CODE IS GRAMMAR, and that clause is new rather than moved. `@TGT` sits on the
 * `Feature:` line and `parseTaggedScenarios` inherits it onto every scenario beneath, exactly as
 * cucumber does — so without this clause the rule reds every scenario in every coded file:
 * measured over this repository's own corpus, 253 scenario/tag pairs across 28 codes. The private
 * scan this rule replaced never met the case because it read a scenario's own tag block and
 * nothing above it, which is the second reading `parseTaggedScenarios` was extracted to end.
 *
 * A WELL-FORMED `@SCN` ID IS GRAMMAR WHEREVER IT SITS — `featureCodeOf` is the one owner of that
 * spelling, so an id it parses is recognised here without a second regex. An id it CANNOT parse
 * is not this fault: `no-scn-code` raises it, names it, and would print a different remedy.
 *
 * A WORD THAT NAMES A CHECK IS GRAMMAR (@SCN-STG-005), steps or none. A fitness check is named
 * by a BARE tag — a flat peer of the behavioural tiers, not a member of some group — so it
 * matches nothing in `TIER_TAGS` and would otherwise red every fitness scenario in a corpus:
 * measured over this repository's own, ten findings and exit 1 on the commit before this clause
 * landed. The set is `checkTagsOf`'s and is resolved once, before the walk.
 *
 * AND STEPS ARE NOT CONSULTED, WHICH IS STRUCTURAL RATHER THAN REMEMBERED (3F-3126). The tier
 * floor this rule replaced once keyed on steplessness, and a rule keyed on that correlate reds
 * the first converted check for writing exactly the shape the obligation rule asks for. Here
 * there is no clause to remove: the walk reads a scenario's TAGS, so the stepped and the
 * stepless row are one case rather than two that agree.
 *
 * A RECOGNISED DEFERRAL TAG IS GRAMMAR (@SCN-STG-003), and it is the first clause here whose
 * answer is the TARGET'S rather than the scheme's. Reding every tag outside the tier set would red
 * `@skip` — a tag spec-controller itself recognises, honours as a deferral signal, and lets a
 * target extend by config. A check that condemns what the product accepts is not stricter, it is
 * wrong. The set arrives RESOLVED and is never restated, so there is no second list here to fall
 * behind the first; and this module names no community tag of its own, because which words the
 * community recognises is product policy handed in from the application layer.
 */
function isGrammar(
  tag: string,
  scenarioId: string,
  featureCode: string | null,
  deferralTags: readonly string[],
  checkTags: readonly string[]
): boolean {
  if (tag === scenarioId) return true;
  if (featureCodeOf(tag) !== null) return true;
  if (featureCode !== null && tag === featureCode) return true;
  if (deferralTags.includes(tag)) return true;
  if (checkTags.includes(tag)) return true;
  return TIER_TAGS.includes(tag);
}

/**
 * A tag on an `@SCN` scenario that means nothing here (@SCN-STG-002, @SCN-STG-003, @SCN-STG-004).
 *
 * ONE VERDICT, AND THE DIAGNOSIS IS SEPARATE FROM IT. Whether a tag is grammar is decided by
 * `isGrammar` alone; what the message then SAYS about it is `unrecognisedTagFault`'s. Keeping the
 * two apart is what lets the group-prefixed reading be as broad as it is (@SCN-STG-004) without
 * ever widening or narrowing what reds.
 *
 * THE TYPO THE REST OF THE MODEL CANNOT SEE, measured rather than argued. `@untit` ALONE
 * reconciles both-missing, so half of this fault a reconciliation does cover. Planted beside a
 * real tier — `@unit @untit` — the only reconciling item is the absent unit Evidence Observation:
 * the typo contributes nothing and is named nowhere, in any cell, at any exit status.
 *
 * PER TAG, NOT PER SCENARIO, because two junk tags are two things to fix and a finding naming one
 * of them leaves the author to re-run the command to discover the other.
 *
 * ONLY `@SCN` SCENARIOS ARE ASKED, which comes free from `parseTaggedScenarios` — it yields
 * nothing for a scenario carrying no id. That is the same scope the tier floor drew and it is
 * drawn for the same reason: a corpus mid-adoption has scenarios the scheme has not reached yet,
 * and policing their tag lines would make adopting the scheme a whole-corpus edit.
 *
 * AND A PARKED SCENARIO IS ASKED TOO (@SCN-STG-003). There is no clause anywhere below that
 * excuses a scenario for carrying a deferral tag, and that absence is the discipline rather than
 * an oversight: parking defers what a scenario OWES, never whether its tags are spelled right.
 * This very set is what lets the walk recognise the parking tag, so excusing the walk on a parked
 * scenario would hide `@wip @untit` — a check whose teeth come off by writing one more tag. The
 * resolve happens once, before the walk, for that reason as much as for the cost.
 *
 * @param features the target's discovered feature files, read once at the edge.
 * @param packageJson the TARGET's manifest, read HERE through the same resolvers the ingest edge
 * reads it with — one reading of `specController.deferralTags` (@SCN-PND-021), so the words this
 * rule calls legitimate are exactly the words the engine beside it honours as a skip.
 * The target's own check registry is retired and read nowhere in this assembly (@SCN-STG-005,
 * 3F-3161). A set handed in already resolved would have been a second answer travelling under the
 * first's name.
 * @param starterDeferralTags the APPLICATION layer's starter set, which a target's config may only
 * extend and never replace. It is a parameter because it is product policy — an evolvable list of
 * strings — and a copy held in core would be a second statement of it. Pass none and this clause
 * recognises nothing it was not given, which is the difference between owning a policy and
 * hard-coding someone else's.
 */
export function unrecognisedTags(
  features: readonly CorpusFile[],
  packageJson: TargetManifest,
  starterDeferralTags: readonly string[]
): CorpusFault[] {
  const deferralTags = resolveDeferralTags(packageJson, starterDeferralTags);
  // Both sets are resolved ONCE, before the walk, rather than per tag: the manifest cannot change
  // mid-corpus, and one resolution is what makes "the same set the obligation rule reads" a fact
  // about this run rather than about each tag's turn through it.
  const checkTags = checkTagsOf();
  const faults: CorpusFault[] = [];
  for (const file of features) {
    for (const scenario of parseTaggedScenarios(file.source)) {
      for (const tag of scenario.tags) {
        if (isGrammar(tag, scenario.scnId, file.featureCode, deferralTags, checkTags)) continue;
        faults.push({
          kind: "unrecognised-tag",
          message:
            `unrecognised-tag: ${file.slug}.feature scenario @${scenario.scnId} carries @${tag}, ` +
            unrecognisedTagFault(tag),
        });
      }
    }
  }
  return faults;
}
