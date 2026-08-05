/**
 * The tier-tag floor static check logic (the @unit-testable core).
 *
 * spec-controller reconciles on evidence tiers but did not require its OWN
 * scenarios to NAME one — a tier-less scenario yields no evidence obligation
 * and slips silently. This static check closes that (the cobbler's shoes): every
 * scenario under features/ carrying an @SCN-<FFF>-<NNN> must NAME at least one
 * TIER tag, UNLESS it carries @wip.
 *
 * What counts as a tier (LOAD-BEARING): @unit / @integration / @e2e /
 * @performance, their `pending` variants (@unitpending / @integrationpending /
 * … — a <tier>pending NAMES the tier, deferred), AND @lint=<guard>
 * (spec-controller WRITES lint as @lint=<guard>, NOT bare @lint). The static check
 * accepts the =<guard> form: a bare-@lint-only match would false-flag every static check
 * scenario (including @SCN-STG-001 itself) and red the real tree. Exempt: @wip
 * ONLY.
 *
 * The feature-file SOURCES are INJECTED (not read from disk here) so the logic is
 * unit-tested in isolation over feature-strings; the CLI (lintScnTagsCli.ts)
 * provides the real sources by reading features/ over the real tree.
 *
 * @SCN-STG-001 — features/scn-tags.feature.
 */

/** A feature file's source, tagged with its slug for naming offenders. */
export interface FeatureFileSource {
  /** The feature-file basename (slug), used to name an offending scenario. */
  slug: string;
  /** The raw Gherkin source text of the feature file. */
  source: string;
}

/**
 * A single scn-tags lint finding.
 *
 * TWO KINDS, NOT ONE, because they are two faults with two different fixes
 * (@SCN-STG-002): `missing-tier-tag` says *add a tier*, `unrecognised-tag` says *this
 * tag means nothing here*. Collapsing them would print "names no evidence tier" at an
 * author whose real problem is a typo in the tier they did name — which is precisely
 * how `@untit` stayed invisible.
 */
export interface ScnTagsViolation {
  kind: "missing-tier-tag" | "unrecognised-tag";
  message: string;
}

/** The result of an scn-tags lint run. */
export interface ScnTagsResult {
  ok: boolean;
  violations: ScnTagsViolation[];
}

/** The quality-check tiers whose bare (and `pending`) forms NAME a tier. */
const QUALITY_CHECKS = ["unit", "integration", "e2e", "performance"] as const;

/** A scenario code is `SCN-<FFF>-<NNN>` (matches ingest's parseScenarioCodes). */
const SCN_PATTERN = /^SCN-[A-Z0-9]+-\d+$/;

/**
 * True when a bare tag (no leading @) NAMES an evidence tier: a plain
 * quality-check (`unit`/`integration`/`e2e`/`performance`), a `<qc>pending`
 * variant, or a lint TAG — bare `lint` OR the `lint=<guard>` form
 * spec-controller uses (LOAD-BEARING: a bare-`lint`-only match would miss
 * `@lint=<guard>` and false-flag every static check scenario, reding the real tree).
 *
 * EXPORTED for `vocabAudit.ts` (@SCN-VOC-013, 3F-2313), which needs the same answer to
 * decide what on a Gherkin tag line is GRAMMAR rather than authored vocabulary. It is
 * imported rather than copied on purpose: a second tier list over there would agree with
 * this one by diligence and then drift — the agreeing-by-copy @SCN-VOC-008 removed for
 * `.gitignore` and @SCN-VOC-010 for the canon table. This module imports nothing, so the
 * dependency is one-way and cycle-free.
 */
export function isTierTag(bare: string): boolean {
  if (bare === "lint" || bare.startsWith("lint=")) return true;
  for (const qc of QUALITY_CHECKS) {
    if (bare === qc || bare === `${qc}pending`) return true;
  }
  return false;
}

/**
 * The tag that exempts a scenario from the tier floor. Named once and used for both
 * questions it answers — the exemption, and its own membership of the grammar — so the
 * unrecognised-tag check cannot come to disagree with the floor about `@wip`.
 */
const WIP = "wip";

/** The tier tags a near-miss is measured against, bare. */
const TIER_TAGS: readonly string[] = [
  ...QUALITY_CHECKS,
  ...QUALITY_CHECKS.map((qc) => `${qc}pending`),
  "lint",
];

/** Levenshtein distance, capped by nothing — the strings here are tag-length. */
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
 * The tier an unrecognised tag was probably meant to be, or undefined when none is
 * close. A COURTESY, never the verdict (@SCN-STG-002): the tag reds whether or not a
 * suggestion is found, so a wrong guess costs a poor message and nothing else.
 *
 * Distance 2 rather than 1 catches the drop-plus-transpose shapes (`@untegration`);
 * wider than that and `@e2e` starts attracting every short tag in the tree.
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

/** A scenario parsed from a feature source: its title and its own tag block. */
interface ParsedScenario {
  title: string;
  /** The scenario's own tags, bare (no leading @), in document order. */
  tags: string[];
}

/**
 * Parse each `Scenario:` / `Scenario Outline:` in a feature source together with
 * its own tag block — the contiguous tag lines immediately preceding the keyword
 * (blank lines tolerated, mirroring ingest's extractFeatureCode). Only genuine
 * TAG LINES contribute (a line whose first non-blank char is `@` and whose every
 * whitespace-separated token is a tag).
 */
function parseScenarios(source: string): ParsedScenario[] {
  const lines = source.split(/\r?\n/);
  const scenarios: ParsedScenario[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const match = /^Scenario(?: Outline)?:\s*(.*)$/.exec(line);
    if (match === null) continue;
    const tags: string[] = [];
    for (let j = i - 1; j >= 0; j--) {
      const prev = lines[j]!.trim();
      if (prev === "") continue;
      if (!prev.startsWith("@")) break;
      const tokens = prev.split(/\s+/);
      if (!tokens.every((t) => t.startsWith("@"))) break;
      for (const token of tokens.slice().reverse()) tags.unshift(token.slice(1));
    }
    scenarios.push({ title: match[1]!.trim(), tags });
  }
  return scenarios;
}

/**
 * The tags on one scenario that are not part of the grammar at all (@SCN-STG-002) —
 * neither the `@SCN` id, nor a tier, nor a member of the recognised deferral set.
 *
 * A SEPARATE FUNCTION, not an inlined loop, because the two questions this module now
 * asks have no shared state beyond the tag block: the floor asks about the scenario,
 * this asks about each tag on it.
 */
function unrecognisedTagViolations(
  feature: FeatureFileSource,
  scenario: ParsedScenario,
  scnId: string,
  recognised: ReadonlySet<string>
): ScnTagsViolation[] {
  const violations: ScnTagsViolation[] = [];
  for (const tag of scenario.tags) {
    if (SCN_PATTERN.test(tag) || isTierTag(tag) || recognised.has(tag)) continue;
    const suggestion = nearestTier(tag);
    violations.push({
      kind: "unrecognised-tag",
      message:
        `Feature "${feature.slug}" scenario @${scnId} ("${scenario.title}") carries ` +
        `@${tag}, which is neither an evidence tier nor a recognised deferral tag` +
        (suggestion === undefined ? "" : ` — did you mean @${suggestion}?`),
    });
  }
  return violations;
}

/**
 * Lint the feature sources for the tier-tag floor: every scenario carrying an
 * @SCN must NAME a tier tag unless it is @wip. Returns a LintResult-shaped
 * `{ ok, violations }` — an empty `violations` (and `ok: true`) means the tree
 * satisfies the floor; each violation names a tier-less non-@wip @SCN scenario.
 */
export function lintScnTags(
  features: readonly FeatureFileSource[],
  recognisedDeferralTags: readonly string[] = []
): ScnTagsResult {
  const violations: ScnTagsViolation[] = [];
  const recognised = new Set([WIP, ...recognisedDeferralTags]);
  for (const feature of features) {
    for (const scenario of parseScenarios(feature.source)) {
      const scnId = scenario.tags.find((t) => SCN_PATTERN.test(t));
      if (scnId === undefined) continue; // no @SCN tag — not checked

      // The GRAMMAR question, asked before the floor and independently of it: a
      // scenario can name a tier AND carry a typo, and the typo is the interesting half.
      violations.push(...unrecognisedTagViolations(feature, scenario, scnId, recognised));

      if (scenario.tags.includes(WIP)) continue; // exempt
      if (scenario.tags.some(isTierTag)) continue; // names a tier — satisfied
      violations.push({
        kind: "missing-tier-tag",
        message:
          `Feature "${feature.slug}" scenario @${scnId} ("${scenario.title}") names ` +
          `no evidence tier and is not @wip — every @SCN scenario must name at least ` +
          `one tier (@unit/@integration/@e2e/@performance, a <tier>pending variant, or ` +
          `@lint=<guard>) unless it carries @wip.`,
      });
    }
  }
  return { ok: violations.length === 0, violations };
}
