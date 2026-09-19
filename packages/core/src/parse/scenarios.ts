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
 * The `fitness` quality-check is raised by a scenario's `@fitness` axis tag and the configured row that
 * names it, STEPS OR NONE (`convertedFitnessObligationsOf`, @SCN-LNT-018): the tag says which axis a
 * scenario is on and the steps say nothing about it (3F-3115). No set of registered check tags raises
 * one any more (3F-3561). The retired `@lint=<guard>` form — where the scenario
 * named a runnable npm script and the run was matched back to it BY NAME — raises nothing
 * (@SCN-LNT-007): it supplies no citation, so anything it raised could never be credited under
 * the one posting rule and would read `missing` for ever. The form is inert in the READER, which
 * is what makes it retired rather than merely unused.
 *
 * Parent: @SCN-LDG-001.
 */

import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type FeatureChild, type GherkinDocument } from "@cucumber/messages";
import { bareTerm } from "../lib/bareTerm.js";
import type { Scenario, EvidenceObligation, QualityCheck, RuntimeQualityCheck } from "../model.js";
import type { FitnessCheckIndex, UnspecifiedFitnessRow } from "../domain/fitnessChecks.js";

const SCN_CODE = /^SCN-[A-Z0-9]+-\d+$/;

/**
 * The recognised `<quality-check>pending` lexicon (evidence-manifesto §11B) — a bare tag
 * (the `@` stripped) that DEFERS an obligation to a later slice. Exact-match keyed, so the
 * `pending` suffix is significant: `integrationpending` is NOT `integration`, and an
 * unrecognised `<x>pending` (or bare `pending`) is absent from the map → ignored. Unlike
 * `TAG_TO_QUALITY_CHECK`, this covers ALL FIVE quality-checks including `fitness` (a pending
 * fitness obligation is one-sided — no `staticCheck` payload). The fitness spelling follows the
 * quality check's name; the retired `lintpending` is not an alias, since no adopter writes it
 * (3F-3569).
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

/**
 * Every recognised `<quality-check>pending` spelling, derived from the map above rather than
 * listed again (@SCN-STG-002, 3F-3302).
 *
 * WHY A LIST AND NOT JUST THE PREDICATE. `pendingQualityCheck` answers "is THIS tag one", which
 * is all an obligation needs. The tag-grammar rule needs the other direction too — the words to
 * measure an unrecognised tag AGAINST, so it can name the tier a typo resembles — and a list
 * written out over there would agree with this map by diligence and then drift the first time a
 * quality-check is added.
 */
export const PENDING_QUALITY_CHECK_TAGS: readonly string[] = Object.keys(
  PENDING_TAG_TO_QUALITY_CHECK
);

const TAG_TO_QUALITY_CHECK: Record<string, RuntimeQualityCheck> = {
  unit: "unit",
  integration: "integration",
  e2e: "e2e",
  performance: "performance",
};

/**
 * The bare tags that name a RUNTIME evidence tier, derived from the map above (@SCN-STG-002,
 * 3F-3302). Exported for the same reason as the pending list beside it, and kept beneath the map
 * it reads so the two can never be edited apart.
 */
export const RUNTIME_QUALITY_CHECK_TAGS: readonly string[] = Object.keys(TAG_TO_QUALITY_CHECK);

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
 * The global flag counts every occurrence (@SCN-RPT-008).
 */
const SCN_OCCURRENCE = /@SCN-[A-Z0-9]+-\d+/g;

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

/**
 * The PROSE-ONLY @SCN codes (@SCN-RPT-015) — codes that appear in non-tag
 * context (prose / comments / step text) but are NEVER an @SCN tag ANYWHERE in the
 * corpus: dangling references. A CROSS-CORPUS set difference `proseCodes − tagCodes`
 * over ALL sources (unique, sorted): per source each line is inspected — a tag line
 * contributes its @SCN tokens to the TAG set; any other line contributes its @SCN
 * matches (the leading `@` stripped) to the PROSE set. The union across files is
 * load-bearing: a code tagged in one file but mentioned in prose in another is NOT
 * prose-only. Distinct from `countScnOccurrences`'s raw count (occurrences, not unique
 * dangling codes). The bare code (e.g. `SCN-FOO-001`) is its own locator.
 */
export function proseOnlyCodes(sources: string[]): string[] {
  const tag = new Set<string>();
  const prose = new Set<string>();
  for (const source of sources) {
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      const tags = line === "" ? null : tagLineTags(line);
      if (tags) {
        for (const t of tags) if (SCN_CODE.test(t)) tag.add(t);
      } else {
        for (const m of line.matchAll(SCN_OCCURRENCE)) prose.add(m[0].slice(1));
      }
    }
  }
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
 * tag block carries no `@SCN` id (@SCN-RPT-014). Mirrors `parseScenarios`'s
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
 * The obligation a CONVERTED check's scenario raises (@SCN-LNT-018) — one, at the quality check
 * `fitness`, keyed by the scenario's own `@SCN`.
 *
 * ONE @fitness SCENARIO IS ONE CHECK (3F-3525). The tag says which axis the scenario is on, exactly
 * as `@unit` does, and the scenario's TITLE says what the check is about; nobody mints
 * `@unit-parser`, and nothing classifies a fitness check further. The row is the consumer's
 * declaration that this `@SCN` is a configured check, and its `@SCN` is the row's KEY, so a row
 * cannot name one scenario and be read against another.
 *
 * THE ONE ROUTE IN. The registered bare-tag arm that once raised the same obligation beside this
 * one left with `parseScenarios`' check-tag set (3F-3561), so a fitness obligation is raised here
 * and nowhere else.
 *
 * NO REGISTRY HOP, and that is what conversion retires. An unconverted static check is discovered
 * as a script handle, and a handle does not know what it is for — hence the (now-retired)
 * registry, and hence the corpus lookup behind it. This route reads the citation off the row
 * rather than resolving it onto one.
 *
 * OWED ONCE, BY CONSTRUCTION. The axis tag can reach one scenario twice, through its `Rule:` and
 * its `Feature:` (@SCN-LDG-020), and this is asked once per scenario whatever its tag list holds,
 * so the answer is one obligation or none. Two for one check would leave the second `missing` for
 * ever, since one run is one credit and can cite one `@SCN`.
 */
function convertedFitnessObligationsOf(
  tags: readonly string[],
  fitnessChecks: FitnessCheckIndex,
  scnId: string
): EvidenceObligation[] {
  if (!tags.includes(FITNESS_AXIS_TAG)) return [];
  if (!fitnessChecks.has(scnId)) return [];
  return [{ qualityCheck: "fitness" }];
}

/**
 * The scenarios ON the fitness axis that no configured row NAMES (@SCN-LNT-020) — a corpus that has
 * half-converted a check: the tag moved and the row was never written.
 *
 * IT RAISES NOTHING AND THAT IS NOT NEGOTIABLE. Such a scenario has said which axis it is on and
 * then said nothing else at all: no row declares it a configured check, so there is nothing for a
 * run to answer and no command to send a reader to. So `convertedFitnessObligationsOf` above
 * answers the empty list, and this reads the same
 * two facts — the axis tag, and the row's absence — to say WHO.
 *
 * THE RUN ALREADY REDS ON IT, through no rule of this function's. A converted check's scenario
 * carries the axis tag and its `@SCN` and nothing else, so a scenario no row names reconciles to
 * zero rows on BOTH sides and is out of balance through the degenerate `both-missing` item — canon's
 * row for exactly this profile (Scenario Exists, Evidence Obligation None, Evidence Observation
 * None). No outcome is minted here, and none is needed.
 *
 * WHAT IS ADDED IS THE SENTENCE. That degenerate item cannot say WHY: its own gloss is about a
 * scenario carrying no `@SCN`, and this one carries one. So the run NAMES these, count and id, where
 * it already names the other corpus-shape faults — facts only, no prescribed cure, and the reader
 * is left with the one remedy there is, which is to write the row.
 *
 * IT READS THE WALK IT IS HANDED rather than taking a source of its own, and it reads the same
 * `FITNESS_AXIS_TAG` and the same registry the obligation rule reads. A second walk would be free to
 * disagree about which scenario it is looking at, and a corpus naming one scenario while the rule
 * raised nothing for another is precisely the disagreement `parseTaggedScenarios` was extracted to
 * foreclose.
 *
 * NAMED ONCE however many of a scenario's effective tags name the axis (@SCN-LDG-020) — naming it
 * twice would put one remedy on the report twice and make the count say there are two
 * half-converted checks where there is one.
 */
export function unconfiguredFitnessScenarios(
  scenarios: readonly TaggedScenario[],
  fitnessChecks: FitnessCheckIndex
): string[] {
  const unconfigured: string[] = [];
  for (const scenario of scenarios) {
    if (!scenario.tags.includes(FITNESS_AXIS_TAG)) continue;
    if (fitnessChecks.has(scenario.scnId)) continue;
    if (!unconfigured.includes(scenario.scnId)) unconfigured.push(scenario.scnId);
  }
  return unconfigured;
}

/**
 * THE CONFIGURED ROWS THE CORPUS CARRIES NO SCENARIO FOR (3F-3472, @SCN-LNT-027) — the mirror of
 * `unconfiguredFitnessScenarios` directly above, in MANIFEST order.
 *
 * THE RUN DOES NOT ALREADY RED ON IT, WHICH IS THE WHOLE DIFFERENCE BETWEEN THE TWO. Its mirror
 * adds only a sentence, because a scenario no row names already reconciles to zero rows on both
 * sides and is out of balance through the degenerate item. A row no scenario names raised NOTHING:
 * the obligations travel with the scenarios, so a row with no scenario contributed nothing at all
 * and the run read balanced over a check that was declared and never specified.
 * `double-entry-manifesto.md` names that shape exactly — a ledger catches a credit that never
 * arrived and is blind to a debit that was never raised.
 *
 * IT READS THE WALK IT IS HANDED, for its mirror's reason: a second walk would be free to disagree
 * about which scenarios the corpus holds, and a row raised against a corpus the obligations were
 * not taken from is the phantom-row fault (@SCN-LNT-009) reached from the manifest side.
 *
 * EVERY `@SCN`-CARRYING SCENARIO COUNTS, NOT THE `@fitness` ONES ALONE. The claim is that the
 * corpus carries no scenario for the row — so a scenario carrying the row's code and saying nothing
 * about the fitness axis is still a scenario somebody wrote under that code, and minting a debit
 * beside it would report a check nobody has specified where one has been started.
 */
export function unspecifiedFitnessRows(
  scenarios: readonly TaggedScenario[],
  fitnessChecks: FitnessCheckIndex
): UnspecifiedFitnessRow[] {
  const carried = new Set(scenarios.map((scenario) => scenario.scnId));
  const unspecified: UnspecifiedFitnessRow[] = [];
  for (const scnId of fitnessChecks) {
    if (carried.has(scnId)) continue;
    unspecified.push({ scnId });
  }
  return unspecified;
}

/**
 * Derive a scenario's evidence obligations from its EFFECTIVE tags — its own PLUS everything it
 * inherits from its `Feature:` and any enclosing `Rule:` (@SCN-LDG-020). Unchanged in substance
 * from the tag-block reading it replaces; what changed is WHICH tags reach it.
 */
function obligationsFromTags(
  tags: readonly string[],
  deferralTags: readonly string[],
  scnId: string,
  fitnessChecks: FitnessCheckIndex
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
  // The FITNESS obligation (@SCN-LNT-018), raised after the tier arms and BEFORE the deferral pass
  // below, so a deferred fitness scenario defers like any other rather than escaping through a later
  // arm.
  evidenceObligations.push(...convertedFitnessObligationsOf(tags, fitnessChecks, scnId));
  // SCENARIO-SCOPE community deferral (@SCN-PND-016): when the tag block carries a
  // RECOGNISED community deferral tag (a bare tag ∈ the injected `deferralTags` set —
  // empty by default; the app passes its starter policy ∪ config), the whole scenario is
  // deferred: mark EVERY obligation `pending: true`, overriding its observation-derived
  // outcome. Applied AFTER the
  // obligation list is built, so it composes with the `<qc>pending` recognition and covers
  // every obligation kind (runtime tiers AND the fitness ones). Idempotent on an
  // already-pending obligation.
  if (tags.some((t) => deferralTags.includes(t))) {
    if (evidenceObligations.length === 0) {
      // INTERPRETATION 2 (@SCN-PND-022): a deferred scenario raising ZERO obligations (a
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
  /** The bare scenario id, e.g. `SCN-LDG-001` (no leading @). */
  scnId: string;
  /** The scenario's OWN tags first, then its inherited ones — bare, no leading @. */
  tags: readonly string[];
  /**
   * The scenario's EXTENT in the source — 1-based and INCLUSIVE, so `lines.slice(startLine - 1,
   * endLine)` is exactly this scenario's text (@SCN-SSM-010, 3F-3044). It rides on this walk for the
   * reason the walk was extracted at all, sharpened by what an extent is FOR: a second pass over the
   * same file would be free to disagree with this one about which scenario it is looking at, and the
   * caller that wants an extent is asking which scenario some text belongs to — so a disagreeing
   * second pass is precisely how that question gets the neighbour's answer.
   *
   * `startLine` is the lesser of the scenario's first OWN tag line and its keyword line — an
   * inherited `Rule:`/`Feature:` tag is not part of this scenario's text. `endLine` is the line
   * before the next block starts (a scenario, a `Rule:` — or its first tag line — a `Background:`,
   * or EOF), TRIMMED BACK over trailing blank and comment lines.
   *
   * The trim is load-bearing rather than tidiness: without it a blank line or a comment sitting
   * between two scenarios belongs to the preceding one, and an edit there reads as a change to a
   * scenario it is not part of — neighbour-inheritance rebuilt at a smaller scale, which is the one
   * outcome @SCN-SSM-010 rules out.
   *
   * Derived from AST locations rather than from step positions, so docstrings, data tables and
   * `Examples:` blocks are covered with no special case.
   */
  startLine: number;
  /** The last line of this scenario's text — see `startLine`. 1-based, inclusive. */
  endLine: number;
}

/**
 * Parse one feature source into cucumber's own AST, or THROW.
 *
 * An UNPARSEABLE source never yields an empty corpus. Silently returning zero scenarios is the
 * precise shape of the false-green this tool exists to prevent: an empty debit side balances against
 * anything. The app refuses an unreadable feature file at the ingest edge long before this
 * (@SCN-CLI-016: exit 2, halting before any reconcile), so the throw is unreachable in a real run —
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

/** A Gherkin block as the extent reading needs it: where it sits, and where its own tags sit. */
interface LocatedBlock {
  location: { line: number };
  tags?: readonly { location: { line: number } }[];
}

/** A blank line, or one carrying only a `#` comment — what a block's extent is trimmed back over. */
const BLANK_OR_COMMENT = /^\s*(?:#.*)?$/;

/**
 * Where a Gherkin block STARTS: its first own tag line if it has one, else its keyword line. Own
 * tags only — a tag inherited from an enclosing `Rule:` or from the `Feature:` sits in another
 * block's text, and claiming it here would give two blocks the same lines.
 */
function blockStart(block: LocatedBlock): number {
  return Math.min(block.location.line, ...(block.tags ?? []).map((t) => t.location.line));
}

/**
 * Every block start in the document, ascending — the BOUNDARIES one block's text ends at. Untagged
 * scenarios count: a block's extent has to stop at the next block whether or not that block is one
 * anybody can name.
 */
function collectBlockStarts(children: readonly FeatureChild[], starts: number[]): void {
  for (const child of children) {
    if (child.rule) {
      starts.push(blockStart(child.rule));
      collectBlockStarts(child.rule.children as FeatureChild[], starts);
      continue;
    }
    if (child.background) starts.push(blockStart(child.background));
    if (child.scenario) starts.push(blockStart(child.scenario));
  }
}

/**
 * Every block start in the document, ASCENDING — the boundaries `blockEnd` measures against. Read
 * off the SAME parse the tags come from (@SCN-SSM-010): one Gherkin parse, two walks of its
 * children, never a second read of the source.
 */
function documentBlockStarts(document: GherkinDocument): number[] {
  const starts: number[] = [];
  collectBlockStarts((document.feature?.children ?? []) as FeatureChild[], starts);
  return starts.sort((a, b) => a - b);
}

/**
 * Where the block starting at `start` ENDS: the line before the next boundary, or EOF, trimmed back
 * over trailing blank and comment lines so the gap between two scenarios belongs to neither.
 */
function blockEnd(start: number, starts: readonly number[], lines: readonly string[]): number {
  const next = starts.find((boundary) => boundary > start);
  let end = Math.min(next !== undefined ? next - 1 : lines.length, lines.length);
  while (end > start && BLANK_OR_COMMENT.test(lines[end - 1] ?? "")) end -= 1;
  return end;
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
 *   file false-green (3F-1767), this one fires on WELL-WRITTEN files — which makes it likelier.
 *
 *   OVER-READ. Any non-tag line flushed the accumulated block, so a tag block above a `Rule:` was
 *   emitted AS IF it were a scenario. The corpus did not merely miss scenarios — it INVENTED them.
 *
 * EVERY tag inherits, `@SCN` included: parity with cucumber is the goal, and excluding one would
 * invent a rule cucumber does not have. A hoisted `@SCN` therefore gives every scenario beneath it
 * the same id — a corpus-authoring fault, but a VISIBLE one (whether it should red is a deferred
 * policy question, 3F-1774's sibling).
 *
 * An UNPARSEABLE source THROWS, from `parseFeatureDocument` — it never yields an empty corpus, for
 * the reason recorded there.
 */
export function parseTaggedScenarios(source: string): TaggedScenario[] {
  const document = parseFeatureDocument(source);

  const tagged: TaggedScenario[] = [];
  // The parser tokenises, so no whitespace ever reaches `tag.name` and this was never a defect —
  // it takes the shared reading anyway so the count of readings stays at one (@SCN-TRM-001).
  const bare = (tags: readonly { name: string }[]): string[] => tags.map((t) => bareTerm(t.name));

  const featureTags = bare(document.feature?.tags ?? []);
  const lines = source.split(/\r?\n/);
  const starts = documentBlockStarts(document);

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

      const startLine = blockStart(child.scenario);
      tagged.push({
        scnId: scnTag,
        tags: effective,
        startLine,
        endLine: blockEnd(startLine, starts, lines),
      });
    }
  };

  collect((document.feature?.children ?? []) as FeatureChild[], featureTags);

  return tagged;
}

/**
 * Parse the SCENARIO CORPUS — the ledger's DEBIT side — from the REAL Gherkin AST (@SCN-LDG-020,
 * 3F-1775), the same parser cucumber uses. So the scenarios spec-controller reconciles carry
 * EXACTLY the tags cucumber gives them: one reading of the file, not two.
 *
 * The corpus walk is `parseTaggedScenarios`'; this is the OBLIGATION rule applied over it. An
 * unparseable source still THROWS from the walk rather than yielding an empty corpus.
 *
 * NO SET OF REGISTERED CHECK TAGS (3F-3561). The third parameter was once the target's bare check
 * tags, the one place a registered word could raise a fitness obligation; it left with the
 * characteristic's retirement, and a check is its `@fitness` scenario and the row naming it.
 *
 * `fitnessChecks` — the target's CONFIGURED ROWS (@SCN-LNT-018) — is trailing and optional, so
 * `parseScenarios` keeps its place on the v1 barrel and a caller with no rows reads exactly the
 * corpus it read before, and carries the scenario's own `scnId` into the obligation rule: a converted check's
 * obligation is keyed by the `@SCN` the row names, so the rule cannot be applied to a tag set
 * alone. Empty by default, so a target that has converted nothing raises nothing on this route.
 */
export function parseScenarios(
  source: string,
  deferralTags: readonly string[] = [],
  fitnessChecks: FitnessCheckIndex = new Set()
): Scenario[] {
  return parseTaggedScenarios(source).map((scenario) => ({
    scnId: scenario.scnId,
    evidenceObligations: obligationsFromTags(
      scenario.tags,
      deferralTags,
      scenario.scnId,
      fitnessChecks
    ),
  }));
}
