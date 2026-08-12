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
 * The `lint` quality-check is raised by a STEPLESS scenario's REGISTERED bare check tag
 * (`fitnessObligationsOf`, @SCN-LNT-006). The retired `@lint=<guard>` form — where the scenario
 * named a runnable npm script and the run was matched back to it BY NAME — raises nothing
 * (@SCN-LNT-007): it supplies no citation, so anything it raised could never be credited under
 * the one posting rule and would read `missing` for ever. The form is inert in the READER, which
 * is what makes it retired rather than merely unused.
 *
 * Parent: @SCN-LDG-001.
 */

import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type FeatureChild, type GherkinDocument } from "@cucumber/messages";
import type { Scenario, EvidenceObligation, QualityCheck, RuntimeQualityCheck } from "../model.js";
import { measuredCheckTags, thresholdFor, type ThresholdRegistry } from "../domain/thresholds.js";

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
 * tag it carries, and only when the scenario is STEPLESS.
 *
 * THE TECHNIQUE LEAVES THE TAG. Under name-match the DEBIT cited: a scenario carried
 * `@lint=<handle>` and a run was matched back to it by name, so an obligation could only be raised
 * by naming a runnable script — which put one technique in front of a whole class of fitness
 * functions, and is why `complexity`, `typecheck` and `vocab` all had to spell themselves
 * `lint:something` to be seen at all. A bare tag drops it: `@complexity` is a flat peer of `@unit`
 * exactly as `@unit` is a flat peer of `@integration`. There is no `@behavioural=unit`, so there is
 * no `@fitness=complexity` (canon 2026-08-07, the bare-tags Correction).
 *
 * STEPLESS IS THE DISCRIMINATOR. A behavioural scenario is an EXAMPLE and carries steps; a fitness
 * scenario is a whole-system characteristic held against a threshold and has nothing to exemplify,
 * so it carries none. Reading a bare check tag off a STEPPED scenario would raise a fitness
 * obligation on a behavioural row — name-match's own fault, a whole-system characteristic smeared
 * across examples it was never about, reintroduced through a shorter tag. The tier floor's reading
 * of the same shape is @SCN-STG-005's; what is settled here is that the obligation follows it.
 *
 * REGISTERED, NOT INFERRED. `checkTags` is the registry's answer (`domain/checkRegistry`), taken as
 * data. Without it every unrecognised tag would be a candidate check and `@smoke` would owe one;
 * with a prefix heuristic instead, `typecheck` would be missed, which is the reading 3F-2495 already
 * disproved on the discovery side. An empty registry raises nothing, so this is inert on a corpus
 * that has not been swept.
 *
 * `seen` CARRIES THE CHECKS ALREADY RAISED, and is mutated here: a scenario's effective tags are
 * its own plus its `Rule:`'s and its `Feature:`'s (@SCN-LDG-020), so one check can reach one
 * scenario twice and is owed once. Two obligations for one check would leave the second `missing`
 * for ever — one run is one credit and can cite one `@SCN`.
 *
 * MEASURED CHECKS JOIN THROUGH THE SAME ARM (@SCN-CIP-001), because they are the same rule: a bare
 * tag on a stepless scenario, owed once. What differs is what the obligation HOLDS. A measured check
 * is assessed by running the suite and measuring it, so its evidence is a number and its obligation
 * carries the CEILING that number is held against — read for THIS scenario, since canon's own shape
 * for the axis is several stepless scenarios sharing one characteristic with ceilings of their own.
 *
 * A MEASURED TAG IS RECOGNISED BY THE THRESHOLD REGISTRY, not by the check registry, and the two sets
 * are unioned by the caller. A measured check has no runnable script handle — nothing invokes
 * `ci-run-time` — so `checkRegistry` cannot name it, and a rule reading that set alone would raise
 * nothing for it: silent, which is worse than wrong.
 *
 * `measured: true` IS SET WHETHER OR NOT A CEILING WAS FOUND, and that is the point. The flag routes
 * the obligation to the comparison arm; the missing ceiling is what that arm then reports
 * (@SCN-CIP-002). Marking it measured only when a ceiling exists would send an un-authored one down
 * the static route, to be reported as a check nobody wrote — the wrong cure for the actual fault.
 */
function fitnessObligationsOf(
  tags: readonly string[],
  checkTags: readonly string[],
  stepless: boolean,
  seen: Set<string>,
  scnId: string,
  thresholds: ThresholdRegistry
): EvidenceObligation[] {
  if (!stepless) return [];
  const registered = new Set(checkTags);
  const measured = new Set(measuredCheckTags(thresholds));
  const raised: EvidenceObligation[] = [];
  for (const tag of tags) {
    if ((!registered.has(tag) && !measured.has(tag)) || seen.has(tag)) continue;
    seen.add(tag);
    if (!measured.has(tag)) {
      raised.push({ qualityCheck: "lint", staticCheck: tag });
      continue;
    }
    const ceiling = thresholdFor(thresholds, scnId, tag);
    raised.push({
      qualityCheck: "lint",
      staticCheck: tag,
      measured: true,
      // Spread rather than `threshold: ceiling ?? undefined`, so an obligation with no authored
      // ceiling carries no key at all — the absence is a fact about the manifest, and a row
      // serialising `"threshold": null` would read as a ceiling somebody wrote.
      ...(ceiling !== null ? { threshold: ceiling } : {}),
    });
  }
  return raised;
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
  stepless: boolean,
  scnId: string,
  thresholds: ThresholdRegistry
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
    ...fitnessObligationsOf(tags, checkTags, stepless, seenChecks, scnId, thresholds)
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
   * The scenario carries NO steps — the fitness/behavioural shape, read off the same walk as the
   * tags (@SCN-LNT-006). A behavioural scenario is an EXAMPLE and has steps; a fitness scenario is a
   * whole-system characteristic held against a threshold, so it has nothing to exemplify.
   *
   * It rides here rather than in a reader of its own for the reason the walk was extracted at all: a
   * second pass over the same file would be free to disagree with this one about which scenario it
   * is looking at, and a shape read against the wrong scenario is exactly the false-green shape this
   * parser has already produced twice.
   */
  stepless: boolean;
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
 * An UNPARSEABLE source THROWS — it never yields an empty corpus. Silently returning zero scenarios
 * is the precise shape of the false-green this tool exists to prevent: an empty debit side balances
 * against anything. The app refuses an unreadable feature file at the ingest edge long before this
 * (@SCN-CLI-016: exit 2, halting before any reconcile), so the throw is unreachable in a real run —
 * it is the floor that keeps a future caller from re-opening the hole quietly.
 */
export function parseTaggedScenarios(source: string): TaggedScenario[] {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());

  let document: GherkinDocument;
  try {
    document = parser.parse(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `The feature source is not valid Gherkin, so no scenario corpus can be read from it. ` +
        `Reconciling an empty corpus would balance against anything — so this fails loudly ` +
        `rather than silently. Cause: ${message}`
    );
  }

  const tagged: TaggedScenario[] = [];
  const bare = (tags: readonly { name: string }[]): string[] =>
    tags.map((t) => t.name.replace(/^@/, ""));

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

      tagged.push({ scnId: scnTag, tags: effective, stepless: child.scenario.steps.length === 0 });
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
 * `parseScenarios` keeps its place on the frozen v1 barrel (@SCN-API-001) and every existing caller
 * reads exactly the corpus it read before. A target that has registered nothing raises no fitness
 * obligations, which is what lets the bare-tag reading land ahead of the corpus sweep that uses it.
 *
 * `thresholds` — the target's authored ceilings (@SCN-CIP-001) — is trailing and optional for the
 * same reason, and carries the scenario's own `scnId` into the obligation rule: a measured check's
 * ceiling is keyed by the row it is owed on, so the rule cannot be applied to a tag set alone.
 * Empty by default, so a target that has authored no ceiling raises no measured obligation and the
 * axis is dormant.
 */
export function parseScenarios(
  source: string,
  deferralTags: readonly string[] = [],
  checkTags: readonly string[] = [],
  thresholds: ThresholdRegistry = new Map()
): Scenario[] {
  return parseTaggedScenarios(source).map((scenario) => ({
    scnId: scenario.scnId,
    evidenceObligations: obligationsFromTags(
      scenario.tags,
      deferralTags,
      checkTags,
      scenario.stepless,
      scenario.scnId,
      thresholds
    ),
  }));
}
