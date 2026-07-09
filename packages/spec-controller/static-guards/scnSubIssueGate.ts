/**
 * The scenario ⟷ sub-issue match guard — ported HERMETICALLY into spec-controller
 * (from an earlier internal tool's foundation, itself ported from an adopter's repository 3F-834). Parent 3F-1137;
 * this module lands with @SCN-SSM-001 (3F-1489).
 *
 * On each PR, the guard computes the behaviour-bearing @SCN-<FFF>-<NNN> codes the
 * diff touches (added / updated / deleted Gherkin tag-line codes, plus the
 * unit-test-equivalent behaviour change — the 3F-805 surface) and verifies the
 * binding `scenario-binds-test-and-code` ENTIRELY INSIDE CI, with NO live Linear
 * call: the diff carries the declared @SCN cite (the test+code), AND the PR
 * carries its own TICKET HANDLE (the Linear-auto-named source branch
 * `steven/3f-NNN-…` and/or the `[3F-NNN]` commit-message prefix). The Linear–
 * GitHub integration guarantees that handle maps to a real, in-flight ticket BY
 * CONSTRUCTION, so a sub-issue's existence and freshness come for free.
 *
 * This module is the testable core: a PURE decision function plus the diff
 * parsers/detectors. The ticket-handle is an INJECTED boolean (`hasTicketHandle`)
 * so @unit/@integration prove the decision against a fake; the real handle is read
 * from CI metadata (GITHUB_HEAD_REF + commit messages) in the live invocation (see
 * lintScnSubIssuesCli.ts → readTicketHandle). There is NO Linear seam left to
 * consult — the decision is a pure function of the checked-out tree + CI metadata.
 *
 * `isExternalPr` is a SECOND injected boolean, added here (3F-1489) so the
 * fork-exemption slots in without a later signature churn. It is passed `false` in
 * this slice and the decision does not yet branch on it; @SCN-SSM-003 (3F-1495)
 * wires the live fork read (GITHUB_EVENT_PATH: head.repo != base.repo) and the
 * skip-silently exemption for external PRs.
 *
 * The teeth: the 3F-805 leak (new behaviour shipped as a @unit test, no Gherkin
 * @SCN delta, no @SCN cite in its describe/it) still reds — the @SCN cite is still
 * required; the ticket handle proves *on a live work-unit*, not *which scenario*.
 * Both are required.
 *
 * Provenance: an earlier internal tool static-guards/scnSubIssueGate.ts (3F-1002); an adopter's repository
 * doc/decisions.md → 2026-06-19 "scnSubIssueGate re-founded hermetically";
 * spec-controller parent 3F-1137 (port + fork-exemption design, endorsed 2026-07-09).
 */

/** The recognised exemption reasons (enumerated; a missing/unknown reason reds). */
export const EXEMPTION_REASONS = ["renumber", "regression", "evidence-§8A"] as const;
export type ExemptionReason = (typeof EXEMPTION_REASONS)[number];

/** A renumber pair auto-detected from the diff: a removed code relabelled to an added code. */
export interface RenumberPair {
  removed: string;
  added: string;
}

/** A declared exemption parsed from a `SCN-exempt: <code> (<reason>)` trailer / PR-body line. */
export interface Exemption {
  /** The @SCN code the trailer exempts (without the leading @). */
  code: string;
  /**
   * The reason as written in the trailer. `null` when the trailer carried no
   * reason at all; an unrecognised string when it carried one not in
   * EXEMPTION_REASONS. Either case reds.
   */
  reason: string | null;
}

/** The inputs to the pure decision. */
export interface ScnGateInput {
  /** @SCN codes the diff adds, parsed from feature-file tag lines only (bare, no leading @). */
  addedCodes: string[];
  /** @SCN codes the diff UPDATES (a code present on both sides of a hunk with a body edit). */
  updatedCodes: string[];
  /** @SCN codes the diff DELETES (a removed tag line whose behaviour stops). */
  deletedCodes: string[];
  /** Auto-detected renumber pairs (removed+added on an unchanged scenario body). */
  renumberPairs: RenumberPair[];
  /** Exemptions declared via SCN-exempt trailers / PR-body lines. */
  exemptions: Exemption[];
  /**
   * Whether the diff is a behaviour-bearing UNIT-EQUIVALENT change (the 3F-805
   * leak): a `src/**` change + a `*.test.ts` assertion/it/describe change, with
   * NO feature-file `@SCN` delta. When true it must CITE a scenario via a
   * matching `@SCN-<FFF>-<NNN>` id in its describe/it.
   */
  unitEquivalentBehaviourBearing: boolean;
  /** The feature-prefixed `@SCN-<FFF>-<NNN>` codes the changed `*.test.ts` cite (bare). */
  unitEquivalentCitedCodes: string[];
  /**
   * Whether the PR carries a TICKET HANDLE: a Linear-auto-named source branch
   * `steven/3f-NNN-…` (GITHUB_HEAD_REF) and/or a `[3F-NNN]` commit-message prefix.
   */
  hasTicketHandle: boolean;
  /**
   * Whether the PR is fork-sourced (external): head.repo != base.repo, read from
   * GITHUB_EVENT_PATH by the live CLI. Injected here (3F-1489) so the exemption
   * slots in without a signature churn; passed `false` in this slice. The decision
   * does not yet branch on it — @SCN-SSM-003 (3F-1495) wires the skip-silently
   * exemption for external PRs.
   */
  isExternalPr: boolean;
}

/** A single gate violation. */
export interface ScnGateViolation {
  kind: "missing-ticket-handle" | "malformed-exemption" | "uncited-unit-equivalent";
  /** The @SCN code (bare, no leading @) the violation concerns. */
  code: string;
  message: string;
}

/** The result of a gate decision. */
export interface ScnGateResult {
  ok: boolean;
  violations: ScnGateViolation[];
}

/**
 * Decide the scenario ⟷ sub-issue gate over the behaviour-bearing code sets —
 * HERMETICALLY: from the diff + the PR ticket handle alone, NO Linear call.
 *
 * For each behaviour-bearing code: an auto-detected renumber → pass; the PR's own
 * ticket handle → pass; else a valid declared SCN-exempt → pass; else a malformed
 * exemption → red; else the change must be ON A TICKET — `hasTicketHandle` → pass,
 * no handle → red with a `missing-ticket-handle` violation.
 *
 * `isExternalPr` is accepted (injected) but not yet consulted; @SCN-SSM-003 adds
 * the fork exemption over it.
 */
export function decideScnGate(input: ScnGateInput): ScnGateResult {
  const violations: ScnGateViolation[] = [];

  const checkCode = (code: string, verb: "Added" | "Updated" | "Deleted"): void => {
    if (input.renumberPairs.some((p) => p.added === code)) return;
    if (input.hasTicketHandle) return;

    const exemptionsForCode = input.exemptions.filter((e) => e.code === code);
    if (
      exemptionsForCode.some(
        (e) => e.reason !== null && (EXEMPTION_REASONS as readonly string[]).includes(e.reason)
      )
    ) {
      return;
    }
    if (exemptionsForCode.length > 0) {
      violations.push({
        kind: "malformed-exemption",
        code,
        message: `${verb} scenario code @${code} carries a malformed SCN-exempt declaration — its reason is missing or not in {${EXEMPTION_REASONS.join(", ")}}. A malformed exemption is a failure, not a silent pass: correct the reason to one of {${EXEMPTION_REASONS.join(", ")}}, or remove the SCN-exempt trailer and put the change on a ticketed PR.`,
      });
      return;
    }

    violations.push({
      kind: "missing-ticket-handle",
      code,
      message: `${verb} scenario code @${code} is a behaviour-bearing change on a PR that carries no ticket handle (no Linear-auto-named branch "steven/3f-NNN-…" and no "[3F-NNN]" commit-message prefix), so it can't be bound to a live tracked work-unit. Open the PR from its Linear-auto-named branch (or carry a [3F-NNN] commit prefix), or declare a SCN-exempt: ${code} (<reason>) trailer with reason ∈ {${EXEMPTION_REASONS.join(", ")}}.`,
    });
  };

  const seen = new Set<string>();
  for (const code of input.addedCodes) {
    if (seen.has(code)) continue;
    seen.add(code);
    checkCode(code, "Added");
  }
  for (const code of input.updatedCodes) {
    if (seen.has(code)) continue;
    seen.add(code);
    checkCode(code, "Updated");
  }
  for (const code of input.deletedCodes) {
    if (seen.has(code)) continue;
    seen.add(code);
    checkCode(code, "Deleted");
  }

  // Unit-equivalent surface (the 3F-805 leak). A behaviour-bearing unit-equivalent
  // change must CITE a scenario (which scenario) AND be on a ticketed PR (a live
  // work-unit). Both are required.
  if (input.unitEquivalentBehaviourBearing) {
    const exempted = input.unitEquivalentCitedCodes.some((code) =>
      input.exemptions.some(
        (e) =>
          e.code === code &&
          e.reason !== null &&
          (EXEMPTION_REASONS as readonly string[]).includes(e.reason)
      )
    );
    if (!exempted) {
      if (input.unitEquivalentCitedCodes.length === 0) {
        violations.push({
          kind: "uncited-unit-equivalent",
          code: "",
          message:
            `A behaviour-bearing unit-equivalent change (a src/** change proven only by a ` +
            `@unit test, with no Gherkin @SCN feature delta) cites no scenario. Carry the ` +
            `scenario's feature-prefixed @SCN-<FFF>-<NNN> id inside the @unit test's describe/it ` +
            `string (the bidirectional-link rule) — a ticket handle alone is not enough.`,
        });
      } else if (!input.hasTicketHandle) {
        violations.push({
          kind: "missing-ticket-handle",
          code: input.unitEquivalentCitedCodes[0]!,
          message:
            `A behaviour-bearing unit-equivalent change cites @${input.unitEquivalentCitedCodes[0]} ` +
            `but is on a PR that carries no ticket handle (no Linear-auto-named branch ` +
            `"steven/3f-NNN-…" and no "[3F-NNN]" commit-message prefix), so it can't be bound to a ` +
            `live tracked work-unit. Open the PR from its Linear-auto-named branch (or carry a ` +
            `[3F-NNN] commit prefix).`,
        });
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Parse the @SCN codes a feature-file diff ADDS, from added tag lines only.
 * Only `+`-prefixed added lines that are genuine Gherkin TAG LINES are scanned
 * (first non-blank char `@`, every token a tag). A `+` line that merely mentions
 * an @SCN code in prose (a GWT step, a comment) is skipped. Returns bare codes,
 * in document order, de-duplicated.
 */
export function parseAddedCodes(diff: string): string[] {
  const codePattern = /^SCN-[A-Z0-9]+-\d+$/;
  const seen = new Set<string>();
  const codes: string[] = [];

  for (const rawLine of diff.split(/\r?\n/)) {
    if (!rawLine.startsWith("+") || rawLine.startsWith("+++")) continue;

    const line = rawLine.slice(1).trim();
    if (!line.startsWith("@")) continue;
    const tokens = line.split(/\s+/);
    if (!tokens.every((t) => t.startsWith("@"))) continue;

    for (const token of tokens) {
      const bare = token.slice(1);
      if (codePattern.test(bare) && !seen.has(bare)) {
        seen.add(bare);
        codes.push(bare);
      }
    }
  }

  return codes;
}

const HUNK_HEADER = /^@@ /;
const SCN_CODE = /^SCN-[A-Z0-9]+-\d+$/;

/** Is a diff line's body (after the marker, trimmed) a genuine Gherkin TAG LINE? */
function tagLineCodes(body: string): string[] {
  const line = body.trim();
  if (!line.startsWith("@")) return [];
  const tokens = line.split(/\s+/);
  if (!tokens.every((t) => t.startsWith("@"))) return [];
  return tokens.map((t) => t.slice(1)).filter((bare) => SCN_CODE.test(bare));
}

/**
 * Auto-detect renumber pairs from a feature-file diff. A renumber is a relabel:
 * a REMOVED `@SCN` code paired with an ADDED `@SCN` code on an otherwise-
 * UNCHANGED scenario body (exactly one removed + one added tag-line code, no
 * other changed line in the hunk).
 */
export function detectRenumberPairs(diff: string): RenumberPair[] {
  const pairs: RenumberPair[] = [];

  let removedCodes: string[] = [];
  let addedCodes: string[] = [];
  let otherChange = false;

  const flush = (): void => {
    if (removedCodes.length === 1 && addedCodes.length === 1 && !otherChange) {
      pairs.push({ removed: removedCodes[0]!, added: addedCodes[0]! });
    }
    removedCodes = [];
    addedCodes = [];
    otherChange = false;
  };

  for (const rawLine of diff.split(/\r?\n/)) {
    if (HUNK_HEADER.test(rawLine)) {
      flush();
      continue;
    }
    if (rawLine.startsWith("+++") || rawLine.startsWith("---")) continue;
    if (rawLine.startsWith("diff --git")) continue;

    const marker = rawLine[0];
    if (marker !== "+" && marker !== "-") continue;

    const body = rawLine.slice(1);
    const codes = tagLineCodes(body);
    if (codes.length > 0) {
      if (marker === "-") removedCodes.push(...codes);
      else addedCodes.push(...codes);
    } else {
      otherChange = true;
    }
  }

  flush();

  return pairs;
}

/**
 * Detect the @SCN codes a feature-file diff UPDATES: a scenario BODY changed
 * while its @SCN code held (on a context tag line, or churned removed+added with
 * the same code).
 */
export function detectUpdatedCodes(diff: string): string[] {
  const updated: string[] = [];
  const seen = new Set<string>();

  let removed: string[] = [];
  let added: string[] = [];
  let context: string[] = [];
  let otherChange = false;

  const flush = (): void => {
    if (otherChange) {
      const heldCodes = new Set<string>(context);
      for (const code of removed) {
        if (added.includes(code)) heldCodes.add(code);
      }
      for (const code of heldCodes) {
        if (!seen.has(code)) {
          seen.add(code);
          updated.push(code);
        }
      }
    }
    removed = [];
    added = [];
    context = [];
    otherChange = false;
  };

  for (const rawLine of diff.split(/\r?\n/)) {
    if (HUNK_HEADER.test(rawLine)) {
      flush();
      continue;
    }
    if (rawLine.startsWith("+++") || rawLine.startsWith("---")) continue;
    if (rawLine.startsWith("diff --git")) continue;

    const marker = rawLine[0];
    const body = marker === "+" || marker === "-" || marker === " " ? rawLine.slice(1) : rawLine;
    const codes = tagLineCodes(body);

    if (marker === "-") {
      if (codes.length > 0) removed.push(...codes);
      else otherChange = true;
    } else if (marker === "+") {
      if (codes.length > 0) added.push(...codes);
      else otherChange = true;
    } else {
      if (codes.length > 0) context.push(...codes);
    }
  }

  flush();

  return updated;
}

/**
 * Detect the @SCN codes a feature-file diff DELETES: a removed `@SCN` tag-line
 * code whose behaviour stops — not the removed side of a renumber, not also
 * re-added, not an update. Renumber and update WIN over delete.
 */
export function detectDeletedCodes(diff: string): string[] {
  const removed: string[] = [];
  const removedSeen = new Set<string>();
  const added = new Set<string>();

  for (const rawLine of diff.split(/\r?\n/)) {
    if (rawLine.startsWith("+++") || rawLine.startsWith("---")) continue;
    if (rawLine.startsWith("diff --git")) continue;
    if (HUNK_HEADER.test(rawLine)) continue;

    const marker = rawLine[0];
    if (marker !== "+" && marker !== "-") continue;

    const codes = tagLineCodes(rawLine.slice(1));
    if (codes.length === 0) continue;
    if (marker === "-") {
      for (const code of codes) {
        if (!removedSeen.has(code)) {
          removedSeen.add(code);
          removed.push(code);
        }
      }
    } else {
      for (const code of codes) added.add(code);
    }
  }

  if (removed.length === 0) return [];

  const renumberRemoved = new Set(detectRenumberPairs(diff).map((p) => p.removed));
  const updated = new Set(detectUpdatedCodes(diff));

  return removed.filter(
    (code) => !added.has(code) && !renumberRemoved.has(code) && !updated.has(code)
  );
}

/**
 * Is a line's content (after the diff marker) a QUOTED string literal in code
 * position? The gate's own fixtures embed describe/it-of-diff strings as test
 * data; excluding these keeps the scanner from over-firing on its own fixtures.
 */
function isQuotedStringLiteralLine(body: string): boolean {
  const t = body.trim();
  return t.startsWith('"') || t.startsWith("'") || t.startsWith("`");
}

/**
 * Scan a `*.test.ts` diff for the `@SCN-<FFF>-<NNN>` ids a CHANGED test cites in
 * its Vitest `describe(...)` / `it(...)` string literals (the bidirectional-link
 * rule). Both `@SCN-…` and bare `[SCN-…]` forms register. Returns bare codes.
 */
export function parseUnitCitedCodes(testDiff: string): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];

  for (const rawLine of testDiff.split(/\r?\n/)) {
    const marker = rawLine[0];
    if (marker !== "+" && marker !== "-") continue;
    if (rawLine.startsWith("+++") || rawLine.startsWith("---")) continue;

    const line = rawLine.slice(1);
    if (isQuotedStringLiteralLine(line)) continue;
    if (!/\b(?:describe|it|test)\s*(?:\.\w+)?\s*\(/.test(line)) continue;

    for (const m of line.matchAll(/@?(SCN-[A-Z0-9]+-\d+)/g)) {
      const bare = m[1]!;
      if (!seen.has(bare)) {
        seen.add(bare);
        codes.push(bare);
      }
    }
  }

  return codes;
}

/**
 * Decide whether a diff is a behaviour-bearing UNIT-EQUIVALENT change. True iff
 * the `*.test.ts` diff carries a behaviour-bearing test delta (an it/describe/
 * assertion line), the `src/**` diff is non-empty, AND there is NO feature-file
 * `@SCN` delta.
 */
export function isUnitEquivalentBehaviourBearing(
  testDiff: string,
  srcDiff: string,
  featureScnDelta: boolean
): boolean {
  if (featureScnDelta) return false;
  if (!hasSrcChange(srcDiff)) return false;
  return hasBehaviourBearingTestDelta(testDiff);
}

/** Does the `src/**` diff carry any added/removed content line (not just headers)? */
function hasSrcChange(srcDiff: string): boolean {
  for (const rawLine of srcDiff.split(/\r?\n/)) {
    if (rawLine.startsWith("+++") || rawLine.startsWith("---")) continue;
    if (rawLine.startsWith("diff --git") || HUNK_HEADER.test(rawLine)) continue;
    const marker = rawLine[0];
    if (marker !== "+" && marker !== "-") continue;
    if (rawLine.slice(1).trim() !== "") return true;
  }
  return false;
}

/**
 * Does the `*.test.ts` diff carry a behaviour-bearing test delta? An added or
 * removed line that is an it/describe/test call OR an assertion. A pure comment /
 * import / whitespace / type-only line does NOT count.
 */
function hasBehaviourBearingTestDelta(testDiff: string): boolean {
  const testCall = /\b(?:describe|it|test)\s*(?:\.\w+)?\s*\(/;
  const assertion = /\b(?:expect\s*\(|assert\b)/;

  for (const rawLine of testDiff.split(/\r?\n/)) {
    if (rawLine.startsWith("+++") || rawLine.startsWith("---")) continue;
    if (rawLine.startsWith("diff --git") || HUNK_HEADER.test(rawLine)) continue;
    const marker = rawLine[0];
    if (marker !== "+" && marker !== "-") continue;

    const body = rawLine.slice(1).trim();
    if (body === "") continue;
    if (body.startsWith("//") || body.startsWith("/*") || body.startsWith("*")) continue;
    if (/^(?:import|export)\b/.test(body) && /\bfrom\b/.test(body)) continue;
    if (isQuotedStringLiteralLine(body)) continue;

    if (testCall.test(body) || assertion.test(body)) return true;
  }
  return false;
}
