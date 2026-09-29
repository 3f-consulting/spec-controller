/**
 * The SCENARIO reader — parse spec-controller's own `features/**\/*.feature` source
 * into evidence obligations: per scenario, `{ scnId, evidenceObligations }`, with
 * each (kind, level) drawn from the scenario's evidence tags (@unit → runtime/unit,
 * @integration → runtime/integration, @e2e → runtime/e2e, @performance →
 * runtime/performance — the evidence-obligation reading).
 *
 * One of the three separated inputs to the reconciler (obligations / observations /
 * static checks) — the embryonic obligation-side adapter, deliberately not a registry (v1).
 *
 * Approach: scan TAG LINES (a line whose first non-blank char is `@` and whose
 * every whitespace-separated token is a tag) for an @SCN-<FFF>-<NNN> id and any
 * co-located evidence-level tags. A scenario's @SCN id and its level tags sit on
 * the same accumulated tag block immediately above the Scenario keyword, so a tag
 * line carrying an @SCN id contributes that scenario's evidenceObligations from the level
 * tags found across the contiguous tag block.
 *
 * The `fitness` quality-check is raised by a scenario's `@fitness` axis tag ALONE, STEPS OR NONE
 * (`convertedFitnessObligationsOf`): the tag says which axis a scenario is on and the
 * steps say nothing about it. The manifest list that once had to name the scenario as
 * well is retired, so the tag is the whole declaration. No set of registered check tags raises
 * one any more. The retired `@lint=<guard>` form — where the scenario
 * named a runnable npm script and the run was matched back to it BY NAME — raises nothing:
 * it supplies no citation, so anything it raised could never be credited under
 * the one posting rule and would read `missing` for ever. The form is inert in the READER, which
 * is what makes it retired rather than merely unused.
 */

import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type FeatureChild, type GherkinDocument } from "@cucumber/messages";
import { bareTerm } from "../lib/bareTerm.js";
import { SCN_ID_SOURCE } from "../lib/featureCode.js";
import type { Scenario, EvidenceObligation, QualityCheck, RuntimeQualityCheck } from "../model.js";

/**
 * A BARE `@SCN` code — the `@` already stripped. Exported for the citation reader
 * beside it (`parse/fitnessCitations`), which asks the same question of a CI step's `id:`: a
 * second copy of this pattern there would agree with this one by coincidence, and what it decides
 * is whether a step states a citation at all.
 *
 * NO OPTIONAL SIGIL, deliberately, and that is what `SCN_TAG` in `parse/cucumber` is for instead.
 * `bareTerm` strips ONE leading `@`, so a doubled sigil bares to `@SCN-…` and must
 * NOT read as the un-doubled code: it is a different spelling, not whitespace.
 *
 * THE FEATURE PART IS TWO TO FIVE CHARACTERS, the NUMBER ANY WIDTH (evidence-manifesto §9A).
 * A longer or shorter feature part is not an @SCN, so it mints no account and cites nothing.
 */
export const SCN_CODE = new RegExp(`^${SCN_ID_SOURCE}$`);

/**
 * The recognised `<quality-check>pending` lexicon (evidence-manifesto §11B) — a bare tag
 * (the `@` stripped) that DEFERS an obligation to a later slice. Exact-match keyed, so the
 * `pending` suffix is significant: `integrationpending` is NOT `integration`, and an
 * unrecognised `<x>pending` (or bare `pending`) is absent from the map → ignored. Unlike
 * `TAG_TO_QUALITY_CHECK`, this covers ALL FIVE quality-checks including `fitness` (a pending
 * fitness obligation is one-sided — no `staticCheck` payload). The fitness spelling follows the
 * quality check's name; the retired `lintpending` is not an alias, since no adopter writes it.
 */
const PENDING_TAG_TO_QUALITY_CHECK: Record<string, QualityCheck> = {
  fitnesspending: "fitness",
  unitpending: "unit",
  integrationpending: "integration",
  e2epending: "e2e",
  performancepending: "performance",
};

/**
 * Recognise a `<quality-check>pending` tag (evidence-manifesto §11B) — return its deferred
 * quality-check, or `null` when the bare tag is not one of the five recognised `<qc>pending`
 * (a bare tier tag, an unknown `<x>pending`, or bare `pending`). The pure per-tag helper
 * `parseScenarios` uses to derive a pending obligation.
 */
export function pendingQualityCheck(tag: string): QualityCheck | null {
  return PENDING_TAG_TO_QUALITY_CHECK[tag] ?? null;
}

const TAG_TO_QUALITY_CHECK: Record<string, RuntimeQualityCheck> = {
  unit: "unit",
  integration: "integration",
  e2e: "e2e",
  performance: "performance",
};


/** Is a trimmed line a genuine Gherkin TAG LINE? Return its bare tags, else null. */
function tagLineTags(line: string): string[] | null {
  if (!line.startsWith("@")) return null;
  const tokens = line.split(/\s+/);
  if (!tokens.every((t) => t.startsWith("@"))) return null;
  return tokens.map((t) => t.slice(1));
}

/**
 * `@SCN-FFF-NNN` — a raw scenario-id occurrence ANYWHERE in the source (tag line OR
 * the non-tag context — prose, comments, step text — the tag-line parser ignores).
 * The global flag counts every occurrence.
 */
const SCN_OCCURRENCE = new RegExp(`@${SCN_ID_SOURCE}`, "g");

/**
 * Count every raw `@SCN-FFF-NNN` occurrence across the WHOLE source — including the
 * non-tag-line context (prose, comments, step text) the tag-line `parseScenarios`
 * deliberately ignores. A sibling read over the same source; `parseScenarios` is
 * unchanged. Each scenario contributes exactly one tag-line occurrence, so
 * the delta against `parseScenarios(...).length` is precisely the ids seen in non-tag
 * context.
 */
export function countScnOccurrences(source: string): number {
  return (source.match(SCN_OCCURRENCE) ?? []).length;
}

/** The `@SCN` codes a TAG LINE contributes — its tokens that are codes, already bare of the `@`. */
function tagLineScnCodes(tags: readonly string[]): string[] {
  return tags.filter((tag) => SCN_CODE.test(tag));
}

/** The `@SCN` codes a NON-TAG line contributes — every occurrence in it, stripped of its `@`. */
function proseLineScnCodes(line: string): string[] {
  return [...line.matchAll(SCN_OCCURRENCE)].map((match) => match[0].slice(1));
}

/**
 * Sort ONE source's `@SCN` codes into the two sets the difference is taken over.
 *
 * ITS OWN FUNCTION so `proseOnlyCodes` states the set difference and nothing else — the per-line
 * classification is a separate idea, and holding both in one body put it over the cognitive-
 * complexity standard. The sets are passed in rather than returned and
 * merged because the union across files is load-bearing: a code tagged in one file and written in
 * prose in another is NOT prose-only, so every source accumulates into the same two sets.
 */
function collectScnCodes(source: string, tag: Set<string>, prose: Set<string>): void {
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const tags = line === "" ? null : tagLineTags(line);
    if (tags === null) {
      for (const code of proseLineScnCodes(line)) prose.add(code);
      continue;
    }
    for (const code of tagLineScnCodes(tags)) tag.add(code);
  }
}

/**
 * The PROSE-ONLY @SCN codes — codes that appear in non-tag
 * context (prose / comments / step text) but are NEVER an @SCN tag ANYWHERE in the
 * corpus: dangling references. A CROSS-CORPUS set difference `proseCodes − tagCodes`
 * over ALL sources (unique, sorted): per source each line is inspected — a tag line
 * contributes its @SCN tokens to the TAG set; any other line contributes its @SCN
 * matches (the leading `@` stripped) to the PROSE set. The union across files is
 * load-bearing: a code tagged in one file but mentioned in prose in another is NOT
 * prose-only. Distinct from `countScnOccurrences`'s raw count (occurrences, not unique
 * dangling codes). The bare code (`SCN-<FFF>-<NNN>`) is its own locator.
 */
export function proseOnlyCodes(sources: string[]): string[] {
  const tag = new Set<string>();
  const prose = new Set<string>();
  for (const source of sources) collectScnCodes(source, tag, prose);
  return [...prose].filter((code) => !tag.has(code)).sort();
}

/**
 * A Gherkin scenario-header line: `Scenario:` / `Scenario Outline:` / `Scenario
 * Template:` / `Example:` (the synonym for Scenario), capturing the name after the
 * colon. The colon is anchored immediately after the keyword, so `Examples:` (plural —
 * the Scenario Outline DATA TABLE, not a scenario) does NOT match. Longer keywords lead
 * the alternation for clarity.
 */
const SCENARIO_HEADER =
  /^(?:Scenario Outline|Scenario Template|Scenario|Example):\s*(.*)$/;

/**
 * Parse the UNTAGGED scenarios — Gherkin scenario headers whose preceding contiguous
 * tag block carries no `@SCN` id. Mirrors `parseScenarios`'s
 * tag-block accumulation: a tag line accumulates the block; any non-tag line closes it.
 * At each scenario header, the just-accumulated block is checked for an `@SCN` — if it
 * has none, the scenario is untagged (returns its name). The obligation-side counterpart
 * to the evidenceObservations aggregate's anomaly terms: a scenario with no evidence anchor.
 */
export function parseUntaggedScenarios(source: string): string[] {
  const untagged: string[] = [];
  let blockTags: string[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const tags = line === "" ? null : tagLineTags(line);
    if (tags) {
      blockTags.push(...tags);
      continue;
    }
    const header = SCENARIO_HEADER.exec(line);
    if (header && !blockTags.some((t) => SCN_CODE.test(t))) {
      untagged.push(header[1]!.trim());
    }
    // Any non-tag line (a scenario header, a step, a blank, Feature:/Rule:) closes the block.
    blockTags = [];
  }
  return untagged;
}

/**
 * The one word a CONVERTED check's scenario carries — the axis, and nothing about the subject.
 *
 * It is a literal, the model's own word: it answers "which axis is this scenario on", the question
 * `unit` and `integration` answer for the other axis. A target does not get to spell it differently
 * for the reason nobody spells `@unit` differently.
 */
export const FITNESS_AXIS_TAG = "fitness";

/**
 * The obligation a CONVERTED check's scenario raises — one, at the quality check
 * `fitness`, keyed by the scenario's own `@SCN`.
 *
 * ONE @fitness SCENARIO IS ONE CHECK. The tag says which axis the scenario is on, exactly
 * as `@unit` does, and the scenario's TITLE says what the check is about; nobody mints
 * `@unit-parser`, and nothing classifies a fitness check further.
 *
 * THE TAG IS THE WHOLE DECLARATION, AND NOTHING GATES IT. A manifest list —
 * `specController.fitnessChecks` — once stood between the tag and the obligation: a scenario the
 * list did not name raised nothing, and the run said so in a census line rather than on the books.
 * That was the pre-retirement model surviving the characteristic's retirement, and it broke the
 * symmetry canon requires: *every obligation and every observation is a reconciliation row, for
 * every quality check* (`technical-design/fitness-functions.md`). A `@fitness` scenario now raises
 * its obligation whether or not anything runs it, exactly as a `@unit` scenario with no test does,
 * and with no CI step citing its `@SCN` it reconciles `missing`.
 *
 * THE ONE ROUTE IN. The registered bare-tag arm that once raised the same obligation beside this
 * one left with `parseScenarios`' check-tag set, so a fitness obligation is raised here
 * and nowhere else.
 *
 * NO LOOKUP OF ANY KIND, which is what makes it the same KIND of rule as the tier arm beside it.
 * The `@SCN` is read off the scenario that raised the obligation, never resolved onto it from
 * somewhere else, so no second document can disagree about which check this is.
 *
 * OWED ONCE, BY CONSTRUCTION. The axis tag can reach one scenario twice, through its `Rule:` and
 * its `Feature:`, and this is asked once per scenario whatever its tag list holds,
 * so the answer is one obligation or none. Two for one check would leave the second `missing` for
 * ever, since one run is one credit and can cite one `@SCN`.
 */
function convertedFitnessObligationsOf(tags: readonly string[]): EvidenceObligation[] {
  if (!tags.includes(FITNESS_AXIS_TAG)) return [];
  return [{ qualityCheck: "fitness" }];
}


/**
 * Derive a scenario's evidence obligations from its EFFECTIVE tags — its own PLUS everything it
 * inherits from its `Feature:` and any enclosing `Rule:`. Unchanged in substance
 * from the tag-block reading it replaces; what changed is WHICH tags reach it.
 */
function obligationsFromTags(
  tags: readonly string[],
  deferralTags: readonly string[]
): EvidenceObligation[] {
  const evidenceObligations: EvidenceObligation[] = [];
  const seenQualityChecks = new Set<RuntimeQualityCheck>();
  const seenPending = new Set<QualityCheck>();
  for (const t of tags) {
    // A `<quality-check>pending` tag derives a DEFERRED, one-sided obligation
    // `{ qualityCheck, pending: true }` (no `staticCheck` payload). Tracked in its own set so
    // it is neither blocked by nor blocks a bare tier of the same quality-check, and
    // recognised SEPARATELY from the bare tier tag (the `pending` suffix is significant).
    const pendingCheck = pendingQualityCheck(t);
    if (pendingCheck && !seenPending.has(pendingCheck)) {
      seenPending.add(pendingCheck);
      evidenceObligations.push({ qualityCheck: pendingCheck, pending: true });
      continue;
    }
    const qualityCheck = TAG_TO_QUALITY_CHECK[t];
    if (qualityCheck && !seenQualityChecks.has(qualityCheck)) {
      seenQualityChecks.add(qualityCheck);
      evidenceObligations.push({ qualityCheck });
      continue;
    }
  }
  // The FITNESS obligation, raised after the tier arms and BEFORE the deferral pass
  // below, so a deferred fitness scenario defers like any other rather than escaping through a later
  // arm.
  evidenceObligations.push(...convertedFitnessObligationsOf(tags));
  // SCENARIO-SCOPE community deferral: when the tag block carries a
  // RECOGNISED community deferral tag (a bare tag ∈ the injected `deferralTags` set —
  // empty by default; the app passes its starter policy ∪ config), the whole scenario is
  // deferred: mark EVERY obligation `pending: true`, overriding its observation-derived
  // outcome. Applied AFTER the
  // obligation list is built, so it composes with the `<qc>pending` recognition and covers
  // every obligation kind (runtime tiers AND the fitness ones). Idempotent on an
  // already-pending obligation.
  if (tags.some((t) => deferralTags.includes(t))) {
    if (evidenceObligations.length === 0) {
      // INTERPRETATION 2: a deferred scenario raising ZERO obligations (a
      // bare `@wip` — no evidence tag) synthesises ONE scenario-scope pending obligation:
      // `{ pending: true }` with NO `qualityCheck` (undefined = scenario-scope) and no `staticCheck`.
      // The reconcile partition routes it to one `qualityCheck`-less Pending Item, so the
      // scenario is deferred (pending) — the both-missing guard (fires only on zero pending
      // items) leaves it balanced, not the degenerate both-missing row.
      evidenceObligations.push({ pending: true });
    } else {
      for (const obligation of evidenceObligations) obligation.pending = true;
    }
  }
  return evidenceObligations;
}

/**
 * One `@SCN`-carrying scenario as the corpus READS it, before any obligation rule is applied:
 * its id and its EFFECTIVE tag set (its own tags, then everything it inherits from its `Rule:`
 * and `Feature:`).
 *
 * Extracted so a second corpus reader cannot grow a second tag-inheritance walk. That walk is
 * where both of `parseScenarios`'s historical false-greens lived — the UNDER-READ (a hoisted
 * tier tag invisible, so its obligation was never raised) and the OVER-READ (a tag block above a
 * `Rule:` emitted as a scenario). A reader that re-derived "which tags does this scenario carry"
 * would be free to reproduce either one alone, silently, exactly as the retired hand-rolled scan
 * did beside cucumber's own parse.
 */
export interface TaggedScenario {
  /** The bare scenario id, `SCN-<FFF>-<NNN>` (no leading @). */
  scnId: string;
  /** The scenario's OWN tags first, then its inherited ones — bare, no leading @. */
  tags: readonly string[];
  /**
   * The scenario's NAME as the AST gives it — what the report names a
   * scenario by when its code is carried by another too, since the account keyed by that code
   * cannot say which scenarios stand behind it.
   */
  name: string;
}

/**
 * Parse one feature source into cucumber's own AST, or THROW.
 *
 * An UNPARSEABLE source never yields an empty corpus. Silently returning zero scenarios is the
 * precise shape of the false-green this tool exists to prevent: an empty debit side balances against
 * anything. The app refuses an unreadable feature file at the ingest edge long before this
 * (exit 2, halting before any reconcile), so the throw is unreachable in a real run —
 * it is the floor that keeps a future caller from re-opening the hole quietly.
 */
function parseFeatureDocument(source: string): GherkinDocument {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());
  try {
    return parser.parse(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `The feature source is not valid Gherkin, so no scenario corpus can be read from it. ` +
        `Reconciling an empty corpus would balance against anything — so this fails loudly ` +
        `rather than silently. Cause: ${message}`
    );
  }
}

/**
 * Read every `@SCN`-carrying scenario with its EFFECTIVE tags — the corpus walk `parseScenarios`
 * is built on, and the same walk any other whole-corpus tag question is answered from.
 *
 * The obligation rule is deliberately NOT applied here: what a scenario TAGS and what it OWES are
 * different questions, and the second is `obligationsFromTags`'. Keeping them apart is what lets
 * the citation seam ask the first without inheriting a reading of the second.
 *
 * WHY THE WALK IS THE AST'S AND NOT A SCAN'S. This was a hand-rolled TAG-LINE SCAN that saw only
 * the contiguous tag block directly above a `Scenario:`. Gherkin does not work that way — a
 * scenario INHERITS the tags of its `Feature:` and of any enclosing `Rule:`. Two bugs followed,
 * and both were false-greens:
 *
 *   UNDER-READ. An evidence tier hoisted to the Feature/Rule line — idiomatic, valid Gherkin,
 *   exactly what an author does with a tier shared by every scenario beneath — was INVISIBLE. The
 *   obligation was never RAISED, so its missing evidence could never reconcile `missing`, and the
 *   run read BALANCED (exit 0) while cucumber named a tier nothing proved. Unlike the corrupt-
 *   file false-green, this one fires on WELL-WRITTEN files — which makes it likelier.
 *
 *   OVER-READ. Any non-tag line flushed the accumulated block, so a tag block above a `Rule:` was
 *   emitted AS IF it were a scenario. The corpus did not merely miss scenarios — it INVENTED them.
 *
 * EVERY tag inherits, `@SCN` included: parity with cucumber is the goal, and excluding one would
 * invent a rule cucumber does not have. A hoisted `@SCN` therefore gives every scenario beneath it
 * the same id — a corpus-authoring fault, but a VISIBLE one (whether it should red is a deferred
 * policy question).
 *
 * An UNPARSEABLE source THROWS, from `parseFeatureDocument` — it never yields an empty corpus, for
 * the reason recorded there.
 */
export function parseTaggedScenarios(source: string): TaggedScenario[] {
  const document = parseFeatureDocument(source);

  const tagged: TaggedScenario[] = [];
  // The parser tokenises, so no whitespace ever reaches `tag.name` and this was never a defect —
  // it takes the shared reading anyway so the count of readings stays at one.
  const bare = (tags: readonly { name: string }[]): string[] => tags.map((t) => bareTerm(t.name));

  const featureTags = bare(document.feature?.tags ?? []);

  const collect = (children: readonly FeatureChild[], inherited: string[]): void => {
    for (const child of children) {
      if (child.rule) {
        // A Rule's tags cascade to every scenario beneath it — cucumber applies them, so we must.
        collect(child.rule.children as FeatureChild[], [...inherited, ...bare(child.rule.tags)]);
        continue;
      }
      if (!child.scenario) continue;

      // The EFFECTIVE tag set: the scenario's OWN tags, then everything it inherits from its Rule
      // and Feature. This is the whole fix — the old scan saw only the first of the three. Own
      // tags lead so a scenario's obligations read in the order its tags name them, and a
      // file using NO inheritance yields a byte-identical corpus to the one the scan produced.
      const effective = [...bare(child.scenario.tags), ...inherited];
      const scnTag = effective.find((t) => SCN_CODE.test(t));
      if (scnTag === undefined) continue;

      tagged.push({ scnId: scnTag, tags: effective, name: child.scenario.name });
    }
  };

  collect((document.feature?.children ?? []) as FeatureChild[], featureTags);

  return tagged;
}

/**
 * Parse the SCENARIO CORPUS — the ledger's DEBIT side — from the REAL Gherkin AST, the
 * same parser cucumber uses. So the scenarios spec-controller reconciles carry
 * EXACTLY the tags cucumber gives them: one reading of the file, not two.
 *
 * The corpus walk is `parseTaggedScenarios`'; this is the OBLIGATION rule applied over it. An
 * unparseable source still THROWS from the walk rather than yielding an empty corpus.
 *
 * NO THIRD PARAMETER AT ALL, AND THAT IS THE POINT. It was once the target's
 * bare check tags — the one place a registered word could raise a fitness obligation — and then
 * the target's `specController.fitnessChecks` rows, which gated whether a `@fitness` scenario
 * raised one at all. Both are retired. A fitness obligation is raised by the `@fitness` tag and by
 * nothing else, so there is no second document to hand this reader and none to disagree with it.
 */
export function parseScenarios(
  source: string,
  deferralTags: readonly string[] = []
): Scenario[] {
  return parseTaggedScenarios(source).map((scenario) => ({
    scnId: scenario.scnId,
    evidenceObligations: obligationsFromTags(scenario.tags, deferralTags),
  }));
}
