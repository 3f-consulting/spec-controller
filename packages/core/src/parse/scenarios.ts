/**
 * The `declared` reader — parse spec-controller's own `features/**\/*.feature` source
 * into declared evidence obligations: per scenario, `{ scnId, evidenceObligations }`, with
 * each (kind, level) drawn from the scenario's evidence tags (@unit → runtime/unit,
 * @integration → runtime/integration, @e2e → runtime/e2e, @performance →
 * runtime/performance — the evidence-obligation reading).
 *
 * One of the three separated inputs to the reconciler (declared / observed /
 * static check) — the embryonic declared-side adapter, deliberately not a registry (v1).
 *
 * Approach: scan TAG LINES (a line whose first non-blank char is `@` and whose
 * every whitespace-separated token is a tag) for an @SCN-<FFF>-<NNN> id and any
 * co-located evidence-level tags. A scenario's @SCN id and its level tags sit on
 * the same accumulated tag block immediately above the Scenario keyword, so a tag
 * line carrying an @SCN id contributes that scenario's evidenceObligations from the level
 * tags found across the contiguous tag block.
 *
 * The `lint` quality-check: a `@lint=<guard>` tag in the same block
 * contributes a `{ qualityCheck: "lint", staticCheck: guard }` evidenceObligation — the static check handle is the
 * exact npm-script name, taken as everything after the FIRST `=` (so
 * `@lint=lint:feature-codes` → static check `lint:feature-codes`). The `=` prefix
 * delimiter (operator ruling) replaced an earlier `@lint:` double-colon
 * form, keeping exact-match while removing the double-colon wart.
 *
 * Parent: @SCN-LDG-001.
 */

import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type FeatureChild, type GherkinDocument } from "@cucumber/messages";
import type { Scenario, EvidenceObligation, QualityCheck, RuntimeQualityCheck } from "../model.js";

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
 * `lint=<guard>` — the static-check handle. Split on the FIRST `=`; the guard is
 * everything after it (the exact npm-script name, which may itself contain `:`).
 */
const LINT_TAG = /^lint=(.+)$/;
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
 * has none, the scenario is untagged (returns its name). The declared-side counterpart
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
 * Derive a scenario's declared obligations from its EFFECTIVE tags — its own PLUS everything it
 * inherits from its `Feature:` and any enclosing `Rule:` (@SCN-LDG-020). Unchanged in substance
 * from the tag-block reading it replaces; what changed is WHICH tags reach it.
 */
function obligationsFromTags(
  tags: readonly string[],
  deferralTags: readonly string[]
): EvidenceObligation[] {
  const blockTags = tags;
  {
    {
      const evidenceObligations: EvidenceObligation[] = [];
      const seenQualityChecks = new Set<RuntimeQualityCheck>();
      const seenPending = new Set<QualityCheck>();
      const seenGuards = new Set<string>();
      for (const t of blockTags) {
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
        const lintMatch = LINT_TAG.exec(t);
        if (lintMatch) {
          const guard = lintMatch[1]!;
          if (!seenGuards.has(guard)) {
            seenGuards.add(guard);
            evidenceObligations.push({ qualityCheck: "lint", staticCheck: guard });
          }
        }
      }
      // SCENARIO-SCOPE community deferral (@SCN-PND-016): when the tag block carries a
      // RECOGNISED community deferral tag (a bare tag ∈ the injected `deferralTags` set —
      // empty by default; the app passes its starter policy ∪ config), the whole scenario is
      // deferred: mark EVERY declared
      // obligation `pending: true`, overriding its observation-derived outcome. Applied AFTER the
      // obligation list is built, so it composes with the `<qc>pending` recognition and covers
      // every obligation kind (runtime tiers AND `@lint=<guard>`). Idempotent on an
      // already-pending obligation.
      if (blockTags.some((t) => deferralTags.includes(t))) {
        if (evidenceObligations.length === 0) {
          // INTERPRETATION 2 (@SCN-PND-022): a deferred scenario declaring ZERO obligations (a
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
  }
}

/**
 * Parse the DECLARED CORPUS — the ledger's DEBIT side — from the REAL Gherkin AST (@SCN-LDG-020,
 * 3F-1775), the same parser cucumber uses. So the scenarios spec-controller reconciles carry
 * EXACTLY the tags cucumber gives them: one reading of the file, not two.
 *
 * WHY. This was a hand-rolled TAG-LINE SCAN that saw only the contiguous tag block directly above
 * a `Scenario:`. Gherkin does not work that way — a scenario INHERITS the tags of its `Feature:`
 * and of any enclosing `Rule:`. Two bugs followed, and both were false-greens:
 *
 *   UNDER-READ. An evidence tier hoisted to the Feature/Rule line — idiomatic, valid Gherkin,
 *   exactly what an author does with a tier shared by every scenario beneath — was INVISIBLE. The
 *   obligation was never DECLARED, so its missing evidence could never reconcile `missing`, and the
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
 * The signature is UNCHANGED (`source`, `deferralTags`) — `parseScenarios` is on the frozen v1
 * barrel (@SCN-API-001), so downstream consumers are untouched.
 *
 * An UNPARSEABLE source THROWS — it never yields an empty corpus. Silently returning zero scenarios
 * is the precise shape of the false-green this tool exists to prevent: an empty debit side balances
 * against anything. The app refuses an unreadable feature file at the ingest edge long before this
 * (@SCN-CLI-016: exit 2, halting before any reconcile), so the throw is unreachable in a real run —
 * it is the floor that keeps a future caller from re-opening the hole quietly.
 */
export function parseScenarios(
  source: string,
  deferralTags: readonly string[] = []
): Scenario[] {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());

  let document: GherkinDocument;
  try {
    document = parser.parse(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `The feature source is not valid Gherkin, so no declared corpus can be read from it. ` +
        `Reconciling an empty corpus would balance against anything — so this fails loudly ` +
        `rather than silently. Cause: ${message}`
    );
  }

  const scenarios: Scenario[] = [];
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
      // tags lead so a scenario's declared obligations read in the order it declares them, and a
      // file using NO inheritance yields a byte-identical corpus to the one the scan produced.
      const effective = [...bare(child.scenario.tags), ...inherited];
      const scnTag = effective.find((t) => SCN_CODE.test(t));
      if (scnTag === undefined) continue;

      scenarios.push({
        scnId: scnTag,
        evidenceObligations: obligationsFromTags(effective, deferralTags),
      });
    }
  };

  collect((document.feature?.children ?? []) as FeatureChild[], featureTags);

  return scenarios;
}
