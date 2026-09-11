/**
 * THE CLAIM RULE of `spec-controller tags` — how many checks ONE scenario may claim. Its siblings
 * hold the other two questions: `corpusCodeFaults.ts` whether a feature code binds to one feature
 * file, `corpusGrammarFaults.ts` whether a tag means anything at all. `corpusFaults.ts` composes
 * the three and is the only entry point any of them has.
 *
 * WHY IT IS NOT A GRAMMAR RULE, WHICH IS THE SEAM THIS MODULE IS DRAWN ON. The grammar arm asks
 * *does this word mean something here*, and answers it one tag at a time against a set. This asks
 * *does this scenario claim too many of the words that do* — a different question, over the same
 * set, whose verdict belongs to the SCENARIO rather than to any tag on it. A grammar rule that
 * redded a legitimate word would be wrong; this one reds two legitimate words for being on one
 * line. Two questions, two modules — and the joined module would have carried the grammar clauses
 * past the 400-line `max-lines` ceiling, which canon answers with a split and never with an
 * exception entry (@SCN-CPX-001).
 *
 * THE SET IS NOT ASSEMBLED HERE. `checkTagsOf` is the grammar module's, and it is imported rather
 * than rebuilt: a rule counting a NARROWER set than the grammar admits would green a corpus
 * claiming two checks by one of the words the grammar had just called legitimate, and a WIDER one
 * would red a word no obligation is ever raised from. That is not a hypothetical — the floor and
 * the obligation rule each assembled their own copy of this set, came to disagree about it, and
 * cost a slice to bring back (3F-3126). One assembly, two questions asked over it.
 */

import type { CorpusFault, CorpusFile, TargetManifest } from "./corpusFaults.js";
import { checkTagsOf } from "./corpusGrammarFaults.js";
import { parseTaggedScenarios } from "./scenarios.js";
import { type KillFloorReader, resolveDeferralTags } from "./targetManifest.js";

/**
 * A scenario whose tags name more than one check (@SCN-STG-007).
 *
 * ONE CHECK PER FITNESS SCENARIO is canon (`fitness-functions.md`). @SCN-LNT-008 already enforces
 * it from the CREDIT side — one run is not evidence for two scenarios, and the runner-up reads
 * missing — but that arm only ever sees two scenarios reaching one check. The fault running the
 * other way is invisible to it: two runs citing one scenario are two honest credits, and nothing
 * about them says the corpus is wrong.
 *
 * AND THE LEDGER IS BLIND TO IT, MEASURED RATHER THAN ARGUED. A stepless scenario carrying two
 * registered bare check tags, both handles wired in CI, reconciles BALANCED at exit 0 — two
 * Evidence Obligations, two Evidence Observations, nothing out of balance and nothing pending.
 * Every other assertion this command makes has some cell of a reconciliation that already names
 * the fault; this one has none, in any cut, at any exit status. That measurement is the whole
 * reason the rule ships rather than being left to the ledger beside it.
 *
 * IT DOES NOT MAKE THE MODEL'S SOUNDNESS OPTIONAL. A registry mapping two handles onto one check
 * reaches the same collision with no corpus fault for this to see, which is why @SCN-LNT-012
 * stamps each credit with its own bare tag as well. Mechanism and model, not one or the other;
 * what this adds is that the collision becomes unconstructible from a feature file, at the moment
 * the author is looking at it and the fix is one line.
 *
 * NOTHING ABOUT SHAPE (3F-3126). It first shipped asking only about a STEPLESS scenario, on the
 * argument that a stepped row riding two check tags has a different fault — it names no tier — so
 * telling it "two checks" would send the author to delete a tag when what they owe is a tier. That
 * argument was downstream of the tier floor and true only while the floor redded such a row as
 * tier-less; 3F-3133 stopped it doing that, and the shipped command carries no floor at all. Steps
 * are a fact about how a row is written; the check tag is the claim about which axis it is on
 * (3F-3115). A scenario carrying two check tags meant two scenarios however it was written.
 *
 * DISTINCT WORDS, NOT TAG OCCURRENCES, and this clause is new rather than moved. The walk here is
 * `parseTaggedScenarios`, which inherits Feature- and Rule-level tags onto every scenario beneath
 * exactly as cucumber does — so a check tag hoisted to a `Rule:` and repeated on one of its
 * scenarios arrives TWICE in one tag list. Counting occurrences would red that scenario for
 * claiming `@complexity` and `@complexity`, a finding whose own message reads as nonsense. The
 * private check this rule replaced never met the case because it read a scenario's own tag block
 * and nothing above it — which is precisely the second reading `parseTaggedScenarios` exists to
 * end, arriving here as a fault of its own rather than as a missed one.
 *
 * BOTH TAGS NAMED, IN DOCUMENT ORDER. The author has to choose which scenario keeps which check,
 * and a message naming one of them has already chosen for them; the order is the walk's own —
 * a scenario's OWN tags first, then what it inherits — so the message reads like the line.
 *
 * AND THE REMEDY NAMES NO SHAPE (3F-3133). It read "Split it into one stepless scenario per
 * check", which was sound only while the floor redded a stepped check-tagged row as tier-less: an
 * author who split into two STEPPED rows would have been sent back by it. Both halves of the split
 * are admissible however they are written, and an instruction to strip the steps would be this
 * rule prescribing the very shape 3F-3097 exists to stop assuming.
 *
 * ASKED OF UNPARKED SCENARIOS ONLY (operator ruling, 3F-2655). This rule first shipped saying the
 * opposite — that a parking tag defers what a scenario OWES and so has nothing to say about what
 * it IS. Both readings agree the split is the same edit whenever it happens; they disagree about
 * whether an author who has already said "not yet" should be made to do it now, and canon says no:
 * parking is a SKIP-SIGNAL, and out of scope is not a place where some questions still get asked.
 * The skip is not an ERASURE, which is a separate claim and a separate arm: unpark the scenario
 * and the same two tags red again, unchanged.
 *
 * THE SCOPE IS A CLAUSE HERE, AND IT USED TO BE A POSITION. Inside the private check the rules
 * shared one walk, so parking was enforced by where this rule sat in it — below the grammar
 * question, above everything else — and the rule never had to know what parking was. Three rule
 * functions over one corpus have no shared walk to be positioned in, so the clause is written out.
 * What the position bought is unchanged and is now structural rather than remembered: the grammar
 * arm has no parking clause AT ALL, so a parked scenario's tags are still read for well-formedness
 * — parking defers what a scenario owes and what shape it must have, never whether its tags are
 * spelled right, and the deferral set is the very thing that lets that arm recognise the parking
 * tag. `@wip @untit` cannot go quiet.
 *
 * @param features the target's discovered feature files, read once at the edge.
 * @param packageJson the TARGET's manifest, read HERE through the same resolvers the grammar arm
 * reads it with — one reading of `specController.deferralTags` (@SCN-PND-021), and `checkTagsOf`
 * for the three sources of what names a check.
 * @param starterDeferralTags the APPLICATION layer's starter set, which a target's config may only
 * extend and never replace. A parameter because it is product policy; a copy held in core would be
 * a second statement of it.
 * @param killFloor the reader over the TARGET's mutation records, threaded through to the
 * threshold resolution inside `checkTagsOf` because a bar may name a gate rather than a figure
 * (@SCN-MUT-012).
 */
export function multipleCheckTags(
  features: readonly CorpusFile[],
  packageJson: TargetManifest,
  starterDeferralTags: readonly string[],
  killFloor: KillFloorReader
): CorpusFault[] {
  // Both sets are resolved ONCE, before the walk, for the grammar arm's reasons: the manifest
  // cannot change mid-corpus, and one resolution keeps the target's mutation record opened once.
  const deferralTags = resolveDeferralTags(packageJson, starterDeferralTags);
  const checkTags = checkTagsOf(packageJson, killFloor);
  const faults: CorpusFault[] = [];
  for (const file of features) {
    for (const scenario of parseTaggedScenarios(file.source)) {
      if (scenario.tags.some((tag) => deferralTags.includes(tag))) continue;
      const claimed = [...new Set(scenario.tags.filter((tag) => checkTags.includes(tag)))];
      if (claimed.length < 2) continue;
      faults.push({
        kind: "multiple-check-tags",
        message:
          `multiple-check-tags: ${file.slug}.feature scenario @${scenario.scnId} carries ` +
          `${claimed.length} check tags — ${claimed.map((tag) => `@${tag}`).join(", ")} — but a ` +
          `scenario names ONE check: one run is one credit, and a scenario claiming two owes ` +
          `evidence it cannot tell apart. Split it into one scenario per check.`,
      });
    }
  }
  return faults;
}
