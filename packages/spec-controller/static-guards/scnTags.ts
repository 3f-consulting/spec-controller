/**
 * The tier-tag floor guard logic (the @unit-testable core).
 *
 * spec-controller reconciles on evidence tiers but did not require its OWN
 * scenarios to declare one — a tier-less scenario yields no evidence obligation
 * and slips silently. This guard closes that (the cobbler's shoes): every
 * scenario under features/ carrying an @SCN-<FFF>-<NNN> must declare at least one
 * TIER tag, UNLESS it carries @wip.
 *
 * What counts as a tier (LOAD-BEARING): @unit / @integration / @e2e /
 * @performance, their `pending` variants (@unitpending / @integrationpending /
 * … — a <tier>pending declares the tier, deferred), AND @lint=<guard>
 * (spec-controller declares lint as @lint=<guard>, NOT bare @lint). The guard
 * accepts the =<guard> form: a bare-@lint-only match would false-flag every guard
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

/** A single scn-tags lint finding. */
export interface ScnTagsViolation {
  kind: "missing-tier-tag";
  message: string;
}

/** The result of an scn-tags lint run. */
export interface ScnTagsResult {
  ok: boolean;
  violations: ScnTagsViolation[];
}

/** The quality-check tiers whose bare (and `pending`) forms declare a tier. */
const QUALITY_CHECKS = ["unit", "integration", "e2e", "performance"] as const;

/** A scenario code is `SCN-<FFF>-<NNN>` (matches ingest's parseScenarioCodes). */
const SCN_PATTERN = /^SCN-[A-Z0-9]+-\d+$/;

/**
 * True when a bare tag (no leading @) declares an evidence tier: a plain
 * quality-check (`unit`/`integration`/`e2e`/`performance`), a `<qc>pending`
 * variant, or a lint declaration — bare `lint` OR the `lint=<guard>` form
 * spec-controller uses (LOAD-BEARING: a bare-`lint`-only match would miss
 * `@lint=<guard>` and false-flag every guard scenario, reding the real tree).
 */
function isTierTag(bare: string): boolean {
  if (bare === "lint" || bare.startsWith("lint=")) return true;
  for (const qc of QUALITY_CHECKS) {
    if (bare === qc || bare === `${qc}pending`) return true;
  }
  return false;
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
 * Lint the feature sources for the tier-tag floor: every scenario carrying an
 * @SCN must declare a tier tag unless it is @wip. Returns a LintResult-shaped
 * `{ ok, violations }` — an empty `violations` (and `ok: true`) means the tree
 * satisfies the floor; each violation names a tier-less non-@wip @SCN scenario.
 */
export function lintScnTags(features: readonly FeatureFileSource[]): ScnTagsResult {
  const violations: ScnTagsViolation[] = [];
  for (const feature of features) {
    for (const scenario of parseScenarios(feature.source)) {
      const scnId = scenario.tags.find((t) => SCN_PATTERN.test(t));
      if (scnId === undefined) continue; // not a declared scenario — not checked
      if (scenario.tags.includes("wip")) continue; // exempt
      if (scenario.tags.some(isTierTag)) continue; // declares a tier — satisfied
      violations.push({
        kind: "missing-tier-tag",
        message:
          `Feature "${feature.slug}" scenario @${scnId} ("${scenario.title}") declares ` +
          `no evidence tier and is not @wip — every @SCN scenario must declare at least ` +
          `one tier (@unit/@integration/@e2e/@performance, a <tier>pending variant, or ` +
          `@lint=<guard>) unless it carries @wip.`,
      });
    }
  }
  return { ok: violations.length === 0, violations };
}
