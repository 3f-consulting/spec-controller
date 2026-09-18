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
 * The `lint` quality-check is raised by a scenario's REGISTERED bare check tag, STEPS OR NONE
 * (`fitnessObligationsOf`, @SCN-LNT-006): the tag says which axis a scenario is on and the steps say
 * nothing about it (3F-3115). The retired `@lint=<guard>` form — where the scenario
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
 * `TAG_TO_QUALITY_CHECK`, this covers ALL FIVE quality-checks including `lint` (a pending
 * lint obligation is one-sided — no `staticCheck` payload).
 */
const PENDING_TAG_TO_QUALITY_CHECK: Record<string, QualityCheck> = {
  lintpending: "lint",
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
 * THE FITNESS OBLIGATIONS a scenario's tags raise (@SCN-LNT-006) — one per REGISTERED bare check
 * tag it carries, whether or not the scenario carries steps.
 *
 * THE TECHNIQUE LEAVES THE TAG. Under name-match the DEBIT cited: a scenario carried
 * `@lint=<handle>` and a run was matched back to it by name, so an obligation could only be raised
 * by naming a runnable script — which put one technique in front of a whole class of fitness
 * functions, and is why `complexity`, `typecheck` and `vocab` all had to spell themselves
 * `lint:something` to be seen at all. A bare tag drops it: `@complexity` is a flat peer of `@unit`
 * exactly as `@unit` is a flat peer of `@integration`. There is no `@behavioural=unit`, so there is
 * no `@fitness=complexity` (canon 2026-08-07, the bare-tags Correction).
 *
 * THE TAG IS THE DISCRIMINATOR, AND THE STEPS ARE NOT (3F-3115). A scenario carrying a registered
 * bare check owes that check from the row that carries it; a scenario carrying a tier tag owes its
 * tier. Steps say how a scenario is WRITTEN, not which axis it is ON, so a fitness scenario handed
 * a runnable example keeps the characteristic it was written to hold instead of swapping axes.
 *
 * THE `stepless` CONDITION THAT USED TO STAND HERE WAS A PROXY, AND IT READ THE WRONG SIGNAL —
 * having nothing to exemplify is why a fitness scenario usually carries no steps, a correlate of
 * being non-behavioural rather than the thing itself. The CREDIT side never read it: the citation
 * seam has always reached a stepped row, so the debit alone stopped short and such a row produced a
 * credit with no obligation to post to (3F-3092). Removing the condition removes that asymmetry;
 * no compensating rule is added on the credit side, and none is needed.
 *
 * AND THE FIELD THAT OUTLIVED THE CONDITION IS GONE WITH IT (3F-3369). `TaggedScenario` carried a
 * `stepless` boolean on after the rule stopped reading it, kept by a reason that was wrong twice
 * (3F-3134): it named `parse/scnTags.ts` as the surviving reader, which is not a path in this
 * repository, and the corpus check it meant computed its own steplessness off its own line parser
 * and never read this one. Both rules that reason named read the tag instead (@SCN-STG-005, and
 * the one-check rule until it left with the measured axis; 3F-3126, 3F-3516). So nothing asked
 * the walk for a scenario's SHAPE, and the walk stopped answering: steplessness is derived
 * nowhere in this tree, and a scenario's axis is its tag.
 *
 * SUPPLIED, NOT INFERRED. `checkTags` is the caller's set of recognised check tags, taken as
 * data. Without it every unrecognised tag would be a candidate check and `@smoke` would owe one;
 * with a prefix heuristic instead, `typecheck` would be missed, which is the reading 3F-2495 already
 * disproved on the discovery side. An empty set raises nothing, so this is inert on a corpus
 * that has not been swept.
 *
 * `seen` CARRIES THE CHECKS ALREADY RAISED, and is mutated here: a scenario's effective tags are
 * its own plus its `Rule:`'s and its `Feature:`'s (@SCN-LDG-020), so one check can reach one
 * scenario twice and is owed once. Two obligations for one check would leave the second `missing`
 * for ever — one run is one credit and can cite one `@SCN`.
 */
function fitnessObligationsOf(
  tags: readonly string[],
  checkTags: readonly string[],
  seen: Set<string>
): EvidenceObligation[] {
  const registered = new Set(checkTags);
  const raised: EvidenceObligation[] = [];
  for (const tag of tags) {
    if (!registered.has(tag) || seen.has(tag)) continue;
    seen.add(tag);
    raised.push({ qualityCheck: "lint", staticCheck: tag });
  }
  return raised;
}

/**
 * The one word a CONVERTED check's scenario carries — the axis, and nothing about the subject.
 *
 * It is a literal rather than a registered tag because it names no characteristic: `checkTags` is
 * the answer to "which words are checks here", and this word is the answer to "which axis is this
 * scenario on", which is the same question `unit` and `integration` answer for the other axis. A
 * target does not get to spell it differently for the reason nobody spells `@unit` differently.
 */
export const FITNESS_AXIS_TAG = "fitness";

/**
 * The obligation a CONVERTED check's scenario raises (@SCN-LNT-018) — the characteristic its
 * CONFIGURED ROW names, once.
 *
 * THE TAG NAMES THE AXIS AND THE ROW NAMES THE SUBJECT. A bare characteristic tag answered both at
 * once; the tier tags answer only the first, and nobody mints `@unit-parser`. So a converted
 * scenario carries `@fitness` alone and the characteristic is looked up by the scenario's own
 * `@SCN` — which is the row's KEY, so a row cannot name one scenario and be read against another.
 *
 * NOT A SECOND OBLIGATION SHAPE. What comes back is the same
 * `{ qualityCheck: "lint", staticCheck: <characteristic> }` the registered-tag arm raises, so the
 * pair key, the reconciler's static arm and the roll-up are untouched: only where the word came
 * from changed.
 *
 * NO REGISTRY HOP, and that is what conversion retires. An unconverted static check is discovered
 * as a script handle, and a handle does not know what it is for — hence the (now-retired)
 * registry, and hence the corpus lookup behind it. This route reads the citation off the row
 * rather than resolving it onto one.
 *
 * `seen` IS THE ARM ABOVE'S OWN SET, and shared deliberately. A check is owed once however it was
 * named: the axis tag can reach one scenario twice through its `Rule:` and its `Feature:`
 * (@SCN-LDG-020), and a row whose characteristic a bare tag on the same scenario already raised
 * owes nothing further. Two obligations for one characteristic would leave the second `missing`
 * for ever, since one run is one credit and can cite one `@SCN`.
 */
function convertedFitnessObligationsOf(
  tags: readonly string[],
  fitnessChecks: FitnessCheckIndex,
  seen: Set<string>,
  scnId: string
): EvidenceObligation[] {
  if (!tags.includes(FITNESS_AXIS_TAG)) return [];
  const row = fitnessChecks.get(scnId);
  if (row === undefined || seen.has(row.characteristic)) return [];
  seen.add(row.characteristic);
  return [{ qualityCheck: "lint", staticCheck: row.characteristic }];
}

/**
 * The scenarios ON the fitness axis that no configured row NAMES (@SCN-LNT-020) — a corpus that has
 * half-converted a check: the tag moved and the row was never written.
 *
 * IT RAISES NOTHING AND THAT IS NOT NEGOTIABLE. Such a scenario has said which axis it is on and
 * then said nothing about what it asserts; there is no characteristic to raise an obligation FOR,
 * and reaching for the nearest word is the near-match courtesy the portfolio roster already
 * refuses. So `convertedFitnessObligationsOf` above answers the empty list, and this reads the same
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
 * the obligations travel with the scenarios, so a row with no scenario contributed a characteristic
 * nobody asked for and the run read balanced over a check that was declared and never specified.
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
  for (const [scnId, row] of fitnessChecks) {
    if (carried.has(scnId)) continue;
    unspecified.push({ scnId, characteristic: row.characteristic });
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
  checkTags: readonly string[],
  scnId: string,
  fitnessChecks: FitnessCheckIndex
): EvidenceObligation[] {
  const evidenceObligations: EvidenceObligation[] = [];
  const seenQualityChecks = new Set<RuntimeQualityCheck>();
  const seenPending = new Set<QualityCheck>();
  const seenChecks = new Set<string>();
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
  // The FITNESS obligations (@SCN-LNT-006), raised after the tier arms and BEFORE the deferral pass
  // below, so a deferred fitness scenario defers like any other rather than escaping through a later
  // arm. `seenChecks` keeps a check from being owed twice however many of a scenario's effective
  // tags name it.
  evidenceObligations.push(
    ...fitnessObligationsOf(tags, checkTags, seenChecks),
    // The CONVERTED route (@SCN-LNT-018), on the same `seen` set and after the registered-tag arm:
    // a characteristic is owed once whichever of the two named it.
    ...convertedFitnessObligationsOf(tags, fitnessChecks, seenChecks, scnId)
  );
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
 * `checkTags` — the registry's bare check tags (@SCN-LNT-006) — is ADDITIVE and defaults to none, so
 * `parseScenarios` keeps its place on the v1 barrel and every existing caller
 * reads exactly the corpus it read before. A target that has registered nothing raises no fitness
 * obligations, which is what lets the bare-tag reading land ahead of the corpus sweep that uses it.
 *
 * `fitnessChecks` — the target's CONFIGURED ROWS (@SCN-LNT-018) — is trailing and optional for the
 * same reason, and carries the scenario's own `scnId` into the obligation rule: a converted check's
 * characteristic is keyed by the row it is owed on, so the rule cannot be applied to a tag set
 * alone. Empty by default, so a target that has converted nothing raises nothing on this route.
 */
export function parseScenarios(
  source: string,
  deferralTags: readonly string[] = [],
  checkTags: readonly string[] = [],
  fitnessChecks: FitnessCheckIndex = new Map()
): Scenario[] {
  return parseTaggedScenarios(source).map((scenario) => ({
    scnId: scenario.scnId,
    evidenceObligations: obligationsFromTags(
      scenario.tags,
      deferralTags,
      checkTags,
      scenario.scnId,
      fitnessChecks
    ),
  }));
}
