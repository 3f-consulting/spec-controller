/**
 * The scenario ⟷ sub-issue match static check — ported HERMETICALLY into spec-controller
 * (from an earlier internal tool's foundation, itself ported from an adopter's repository 3F-834). Parent 3F-1137;
 * this module lands with @SCN-SSM-001 (3F-1489).
 *
 * On each PR, the static check computes the behaviour-bearing @SCN-<FFF>-<NNN> codes the
 * change touches (added / deleted Gherkin tag-line codes from the diff, UPDATED codes from
 * comparing the base and head feature SOURCES — @SCN-SSM-010, `scenarioTextChanges.ts` — plus the
 * unit-test-equivalent behaviour change, the 3F-805 surface) and verifies the
 * binding `scenario-binds-test-and-code` ENTIRELY INSIDE CI, with NO live Linear
 * call: the diff carries its @SCN cite (the test+code), AND the PR
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
 * `isExternalPr` is a SECOND injected boolean (added 3F-1489). @SCN-SSM-003
 * (3F-1495) wires the exemption over it: given `isExternalPr` the decision skips
 * silently — no violation, whatever the codes or handle — the fork carve-out. The
 * live CLI reads it from the GitHub PR event payload (GITHUB_EVENT_PATH:
 * head.repo.full_name != base.repo.full_name); the decision stays hermetic.
 *
 * The teeth: the 3F-805 leak (new behaviour shipped as a @unit test, no Gherkin
 * @SCN delta, no @SCN cite in its describe/it) still reds — the @SCN cite is still
 * required; the ticket handle proves *on a live work-unit*, not *which scenario*.
 * Both are required.
 *
 * Provenance: an earlier internal tool static-checks/scnSubIssueGate.ts (3F-1002); an adopter's repository
 * doc/decisions.md → 2026-06-19 "scnSubIssueGate re-founded hermetically";
 * spec-controller parent 3F-1137 (port + fork-exemption design, endorsed 2026-07-09).
 */

import { parseScnCitations } from "@3f-consulting/spec-controller-core/internal";
import { isQuotedStringLiteralLine, structuralBraces } from "./testSourceLexer.js";

/**
 * The exit code by which this check says it EXAMINED NOTHING — neither the 0 of a pass nor the 1
 * of a violation (@SCN-SSM-018). 2 is already this repository's usage/internal-error code across
 * the static checks, so the third answer takes the next free slot rather than overloading one.
 *
 * IT IS A CODE AND NOT A MARKER LINE ON STDOUT because the consumer that must not misread it is a
 * process, and a process reads an exit code. Any answer carried only in prose beside an exit of 0
 * would be a pass to every caller that did not happen to parse it.
 */
export const NOT_EXAMINED_EXIT_CODE = 3;

/** The recognised exemption reasons (enumerated; a missing/unknown reason reds). */
export const EXEMPTION_REASONS = ["renumber", "regression", "evidence-§8A"] as const;
export type ExemptionReason = (typeof EXEMPTION_REASONS)[number];

/** A renumber pair: a code that disappeared, relabelled to a code that appeared on the same text. */
export interface RenumberPair {
  removed: string;
  added: string;
}

/** An exemption parsed from a `SCN-exempt: <code> (<reason>)` trailer / PR-body line. */
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
  /**
   * @SCN codes whose scenario TEXT differs between the base and the head source — read by comparing
   * the two files, never by reading positions out of a diff (@SCN-SSM-010, `scenarioTextChanges.ts`).
   */
  updatedCodes: string[];
  /** @SCN codes the diff DELETES (a removed tag line whose behaviour stops). */
  deletedCodes: string[];
  /** Auto-detected renumber pairs (removed+added on an unchanged scenario body). */
  renumberPairs: RenumberPair[];
  /** Exemptions given via SCN-exempt trailers / PR-body lines. */
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
   * The touched test blocks carrying NO cite in their ancestor chain ("outer > inner").
   * Non-empty ⇒ the PR proves new behaviour with a test that cites no scenario of its
   * own, and a SIBLING's cite in the same file must not rescue it (@SCN-SSM-005,
   * 3F-1758 — closing the file-level widening SSM-004 opened).
   */
  uncitedChangedTestBlocks: string[];
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
  /**
   * Whether the PULL REQUEST BODY could be read at all — `true` when a body was supplied (an
   * EMPTY one included: it was read, and it carried no exemption), `false` when there was none
   * to read, which is what running outside a pull request IS.
   *
   * IT IS NOT "WAS THERE AN EXEMPTION". SCN-exempt directives arrive from the commit messages
   * too, and those are readable everywhere; this says only whether the OTHER source was
   * available. An implementation that folded the two would answer `false` on every pull request
   * whose author wrote no trailer, which is the state @SCN-SSM-002 pins redding. (@SCN-SSM-018)
   */
  prBodyReadable: boolean;
}

/**
 * The gate's three answers (@SCN-SSM-018), where there used to be two.
 *
 * `not-examined` is NOT a soft pass and must never be read as one: it says the question this
 * gate exists to ask had no answer available on this run, which is a different fact from
 * "asked, and nothing was wrong". Two of the three are verdicts about the CHANGE; the third is
 * a verdict about the RUN.
 */
export type ScnGateVerdict = "pass" | "fail" | "not-examined";

/** A code the gate could not answer for, and the statement of why not. */
export interface ScnGateUnexamined {
  /** The @SCN code (bare, no leading @) the gate could not answer for. */
  code: string;
  message: string;
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
  /**
   * True on a PASS AND ON NOTHING ELSE. A `not-examined` run did not pass, so this is false
   * there too — a caller still reading the old boolean gets the safe half of the third answer
   * rather than a silent green (@SCN-SSM-018). `verdict` is what separates the two falses.
   */
  ok: boolean;
  verdict: ScnGateVerdict;
  violations: ScnGateViolation[];
  /** The codes the gate could not answer for. Empty unless the verdict is `not-examined`. */
  unexamined: ScnGateUnexamined[];
}

/** What one surface of the gate found, before the verdict is taken over all of them. */
export type ScnGateFindings = Pick<ScnGateResult, "violations" | "unexamined">;

/**
 * What a code is told when the one question left for it had nowhere to be answered from
 * (@SCN-SSM-018). One spelling, so the two surfaces that can reach the third answer cannot come
 * to describe it differently.
 */
const notExamined = (code: string, subject: string): ScnGateUnexamined => ({
  code,
  message:
    `${subject} carries no ticket handle, and whether an exemption was claimed for it CANNOT BE ` +
    `ANSWERED on this run: SCN-exempt directives come from the pull request body as well as the ` +
    `commit messages, and there was no pull request body to read. So nothing was examined here — ` +
    `which is neither a pass nor a violation. On a pull request the body is always readable, and ` +
    `the same change there either carries its exemption or reds.`,
});

/**
 * The findings on the UNIT-EQUIVALENT surface — the 3F-805 leak: new behaviour shipped as a
 * `@unit` test with no Gherkin `@SCN` delta. Such a change must CITE a scenario (which scenario)
 * AND be on a ticketed PR (a live work-unit); both are required, and a valid exemption on the
 * cited code excuses the pair.
 *
 * LIFTED OUT OF `decideScnGate` AT @SCN-SSM-018, when its third answer made this a fourth branch.
 * The caller keeps the code-set loop; this keeps the surface that is not a code set, and neither
 * has to be read to understand the other.
 */
function unitEquivalentFindings(input: ScnGateInput): ScnGateFindings {
  const violations: ScnGateViolation[] = [];
  const unexamined: ScnGateUnexamined[] = [];

  const exempted = input.unitEquivalentCitedCodes.some((code) =>
    input.exemptions.some(
      (e) =>
        e.code === code &&
        e.reason !== null &&
        (EXEMPTION_REASONS as readonly string[]).includes(e.reason)
    )
  );
  if (!exempted) {
    if (input.uncitedChangedTestBlocks.length > 0) {
      // A CHANGED test block cites nothing — not on itself, not on any ancestor.
      // A sibling's cite elsewhere in the file does NOT vouch for it (@SCN-SSM-005),
      // and neither does the ticket handle: the handle proves a live work-unit, not
      // WHICH scenario this new behaviour belongs to. Both are required.
      violations.push({
        kind: "uncited-unit-equivalent",
        code: "",
        message:
          `A behaviour-bearing unit-equivalent change is proven by test block(s) that cite ` +
          `no scenario: ${input.uncitedChangedTestBlocks.join("; ")}. Another test in the ` +
          `same file citing an @SCN does not vouch for these — a cite belongs to the block ` +
          `it annotates. Carry the scenario's feature-prefixed @SCN-<FFF>-<NNN> id in the ` +
          `changed test's own describe/it string (or in an enclosing describe's).`,
      });
    } else if (input.unitEquivalentCitedCodes.length === 0) {
      violations.push({
        kind: "uncited-unit-equivalent",
        code: "",
        message:
          `A behaviour-bearing unit-equivalent change (a src/** change proven only by a ` +
          `@unit test, with no Gherkin @SCN feature delta) cites no scenario. Carry the ` +
          `scenario's feature-prefixed @SCN-<FFF>-<NNN> id inside the @unit test's describe/it ` +
          `string (the bidirectional-link rule) — a ticket handle alone is not enough.`,
      });
    } else if (!input.hasTicketHandle && !input.prBodyReadable) {
      // The same third answer the code-set loop gives, on the unit-equivalent surface and for
      // the same reason: the cite arrived, the handle did not, and an exemption was the only
      // thing left that could have bound it (@SCN-SSM-018).
      unexamined.push(
        notExamined(
          input.unitEquivalentCitedCodes[0]!,
          `The behaviour-bearing unit-equivalent change citing @${input.unitEquivalentCitedCodes[0]}`
        )
      );
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

  return { violations, unexamined };
}

/**
 * Decide the scenario ⟷ sub-issue gate over the behaviour-bearing code sets —
 * HERMETICALLY: from the diff + the PR ticket handle alone, NO Linear call.
 *
 * For each behaviour-bearing code: an auto-detected renumber → pass; the PR's own
 * ticket handle → pass; else a valid SCN-exempt directive → pass; else a malformed
 * exemption → red; else the change must be ON A TICKET — `hasTicketHandle` → pass,
 * no handle → red with a `missing-ticket-handle` violation.
 *
 * The fork exemption (@SCN-SSM-003): a FORK-SOURCED (external) PR is exempt —
 * given `isExternalPr` the decision returns NO violation regardless of the codes
 * or the (absent) ticket handle, so the methodology dogfoods on internal PRs
 * without auto-rejecting community contributions. Fork status is the ONLY
 * exemption signal — handle-absence is never exempting (a no-handle INTERNAL PR
 * still reds; that is the very violation the gate exists to catch).
 *
 * THE THIRD ANSWER (@SCN-SSM-018): where a code's LAST remaining rescue was an exemption, and
 * `prBodyReadable` says one of the two places exemptions live could not be read, the code is
 * reported UNEXAMINED rather than violated. Not a pass — nothing passed — and not a red, because
 * an absent pull request body is the ordinary state off a pull request rather than a fault.
 *
 * IT REACHES ONLY THE QUESTION THE BODY COULD HAVE ANSWERED. A malformed trailer arrived from the
 * commit messages and was read in full, so it still reds; so does a changed test block citing no
 * scenario, which is a fact about the checked-out tree. Widening the third answer over those would
 * hide a finding behind an absence — the same lie the other way round.
 */
export function decideScnGate(input: ScnGateInput): ScnGateResult {
  // Fork exemption: a fork-sourced (external) PR is skipped silently — no
  // violation, whatever the code sets or the ticket handle. Fork status ONLY;
  // an internal PR (isExternalPr false) still runs the full gate below.
  if (input.isExternalPr) {
    return { ok: true, verdict: "pass", violations: [], unexamined: [] };
  }

  const violations: ScnGateViolation[] = [];
  const unexamined: ScnGateUnexamined[] = [];

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
        message: `${verb} scenario code @${code} carries a malformed SCN-exempt trailer — its reason is missing or not in {${EXEMPTION_REASONS.join(", ")}}. A malformed exemption is a failure, not a silent pass: correct the reason to one of {${EXEMPTION_REASONS.join(", ")}}, or remove the SCN-exempt trailer and put the change on a ticketed PR.`,
      });
      return;
    }

    // The last rescue was an exemption, and one of the two places exemptions live was not
    // readable. Nothing here is a finding: the gate reports what it could not answer.
    if (!input.prBodyReadable) {
      unexamined.push(notExamined(code, `${verb} scenario code @${code}`));
      return;
    }

    violations.push({
      kind: "missing-ticket-handle",
      code,
      message: `${verb} scenario code @${code} is a behaviour-bearing change on a PR that carries no ticket handle (no Linear-auto-named branch "steven/3f-NNN-…" and no "[3F-NNN]" commit-message prefix), so it can't be bound to a live tracked work-unit. Open the PR from its Linear-auto-named branch (or carry a [3F-NNN] commit prefix), or add a SCN-exempt: ${code} (<reason>) trailer with reason ∈ {${EXEMPTION_REASONS.join(", ")}}.`,
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

  // Unit-equivalent surface (the 3F-805 leak) — its own function since @SCN-SSM-018 added a
  // fourth branch to it, because the complexity check reds before the reader does.
  if (input.unitEquivalentBehaviourBearing) {
    const found = unitEquivalentFindings(input);
    violations.push(...found.violations);
    unexamined.push(...found.unexamined);
  }

  // A FINDING OUTRANKS AN UNANSWERED QUESTION. A run that both found something and could not
  // answer for something else has still found something, so it reds — which is what keeps CI's
  // teeth: there, the body is always readable and `unexamined` is always empty anyway.
  const verdict: ScnGateVerdict =
    violations.length > 0 ? "fail" : unexamined.length > 0 ? "not-examined" : "pass";

  return { ok: verdict === "pass", verdict, violations, unexamined };
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
 * Detect the @SCN codes a feature-file diff DELETES: a removed `@SCN` tag-line
 * code whose behaviour stops — not the removed side of a renumber, not also
 * re-added, not an update. Renumber and update WIN over delete.
 *
 * THE UPDATED SET IS PASSED IN rather than computed here (@SCN-SSM-010, 3F-3044), AND SO IS THE
 * RENUMBER-REMOVED SET (@SCN-SSM-015, 3F-3057) — the same treatment for the same reason, one arm
 * apart. Neither is a question the diff can answer. Which scenarios' text differs, and which
 * relabelled scenario's body is otherwise unchanged, are both read by comparing the base and head
 * SOURCES (`scenarioTextChanges.ts`), so the only caller holding either answer is the one that read
 * the sources. Which tag lines the diff removed is still this function's own question, and still
 * the diff's.
 *
 * THE UPDATE EXCLUSION IS KEPT even though it is NEARLY vacuous under the new reading — a code
 * absent from the head cannot be `updated`, so the two sets barely overlap. Nearly is not never: a
 * file carrying the same code on two scenarios, one of them deleted, still reaches it. Removing a
 * check because a stronger upstream makes it usually-unnecessary is how the next hole gets dug.
 */
export function detectDeletedCodes(
  diff: string,
  updatedCodes: readonly string[],
  renumberRemovedCodes: readonly string[]
): string[] {
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

  const renumberRemoved = new Set(renumberRemovedCodes);
  const updated = new Set(updatedCodes);

  return removed.filter(
    (code) => !added.has(code) && !renumberRemoved.has(code) && !updated.has(code)
  );
}

/**
 * Scan the FULL CHECKED-OUT SOURCE of a `*.test.ts` file for the
 * `[SCN-<FFF>-<NNN>]` ids its Vitest `describe(...)` / `it(...)` strings cite (the
 * bidirectional-link rule). The BRACKET is what makes it a cite: this scan used to
 * match any SCN-shaped token on the line, sigil optional, so a title that merely
 * NAMED a scenario vouched for its block — a false green on the very check that
 * proves `scenario-binds-test-and-code` (@SCN-SSM-008, 3F-2368). The form lives in
 * core's `lib/scnCitation.ts`, shared with the vitest reader.
 * Returns bare codes, in document order, de-duplicated.
 *
 * Reads FILE STATE, not a diff — the fix for 3F-1741. A cite is a property of the
 * test file AS IT NOW STANDS: a rename-shaped change edits an `it`-body while the
 * cite on the enclosing `describe` stays a diff CONTEXT line, so a diff scan
 * mistakes "not in this hunk" for "absent" and reds a valid PR. Which @SCN codes
 * CHANGED is still a question for the diff; whether a changed code is CITED is
 * this one. Both stay hermetic — checked-out tree, no Linear call.
 *
 * @SCN-SSM-004 (3F-1750).
 */
export function parseCitedCodesInSource(source: string): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];

  for (const line of source.split(/\r?\n/)) {
    // The gate's own fixtures embed describe/it-of-diff strings as test DATA;
    // excluding quoted-literal lines keeps the scanner off its own fixtures.
    if (isQuotedStringLiteralLine(line)) continue;
    if (!/\b(?:describe|it|test)\s*(?:\.\w+)?\s*\(/.test(line)) continue;

    for (const bare of parseScnCitations(line)) {
      if (!seen.has(bare)) {
        seen.add(bare);
        codes.push(bare);
      }
    }
  }

  return codes;
}

/** A Vitest test block (`describe` / `it` / `test`) parsed from full source. */
export interface TestBlock {
  /** The block's title, as written in its string literal. */
  title: string;
  /** The chain of titles from the outermost ancestor down to this block. */
  chain: string[];
  /** 1-based line of the block's opening call. */
  startLine: number;
  /** 1-based line of the block's closing brace. */
  endLine: number;
  /** The @SCN codes cited on this block AND every ancestor (the inherited chain). */
  citedCodes: string[];
  /** True when no nested test block lives inside this one. */
  isLeaf: boolean;
}

/** The cite attribution for the blocks a diff TOUCHED in one test file. */
export interface ChangedBlockCites {
  /** The @SCN codes vouching for the touched blocks (own or inherited). */
  citedCodes: string[];
  /** The touched leaf blocks carrying NO cite in their ancestor chain, as "outer > inner". */
  uncitedBlocks: string[];
}

/**
 * Parse full checked-out test source into its `describe` / `it` / `test` blocks,
 * brace-tracked, each carrying its line range and the cites INHERITED down its
 * ancestor chain. @SCN-SSM-005 (3F-1762).
 */
export function parseTestBlocks(source: string): TestBlock[] {
  const TEST_CALL = /\b(?:describe|it|test)\s*(?:\.\w+)?\s*\(\s*(['"`])([\s\S]*?)\1/;
  const lines = source.split(/\r?\n/);

  const blocks: TestBlock[] = [];
  /** The blocks currently open, outermost first — the ancestor chain. */
  const open: { block: TestBlock; depthAtOpen: number }[] = [];
  let depth = 0;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // A block opens on a test call carrying a string title. Its cites are the codes
    // on its own line PLUS everything inherited from the ancestors still open.
    if (!isQuotedStringLiteralLine(line)) {
      const m = TEST_CALL.exec(line);
      if (m) {
        const title = m[2]!;
        // Bracketed cites only (@SCN-SSM-008) — a title that merely NAMES a scenario
        // vouches for nothing. Same matcher as the full-source scan above, so the two
        // reads cannot disagree about which cites a PR carries.
        const ownCodes = parseScnCitations(line);
        const inherited = open.flatMap((o) => o.block.citedCodes);
        const block: TestBlock = {
          title,
          chain: [...open.map((o) => o.block.title), title],
          startLine: lineNumber,
          endLine: lineNumber,
          citedCodes: [...new Set([...inherited, ...ownCodes])],
          isLeaf: true,
        };
        // An enclosing block that now contains another is no longer a leaf.
        for (const ancestor of open) ancestor.block.isLeaf = false;
        blocks.push(block);
        open.push({ block, depthAtOpen: depth });
      }
    }

    // Brace-track to find where each block closes, over the braces that nest CODE
    // (`testSourceLexer`) rather than every character. A block's opening line nets +1
    // from its own `(... , () => {` — but only once the braces inside the TITLE are
    // out of the count, or a `${…}` interpolation closes the block where it opened
    // and the `it`s beneath lose the cite they inherit (3F-2367).
    for (const ch of structuralBraces(line)) {
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        while (open.length > 0 && depth <= open[open.length - 1]!.depthAtOpen) {
          open.pop()!.block.endLine = lineNumber;
        }
      }
    }
  });

  // An unbalanced file (or a block left open at EOF) still yields usable ranges.
  for (const o of open) o.block.endLine = lines.length;

  return blocks;
}

/**
 * Map a `*.test.ts` diff to the NEW-file line numbers it touches, per file — read
 * from the hunk headers (`@@ -a,b +c,d @@`) plus the `+` lines within each hunk.
 * The diff is the CHANGE-DETECTOR; this is how we learn WHICH blocks changed.
 * @SCN-SSM-005 (3F-1762).
 */
export function changedLinesByFile(testFileDiff: string): Map<string, number[]> {
  const FILE_HEADER = /^\+\+\+ b\/(.+)$/;
  const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

  const byFile = new Map<string, number[]>();
  let file: string | undefined;
  let newLine = 0;

  for (const rawLine of testFileDiff.split(/\r?\n/)) {
    const fileMatch = FILE_HEADER.exec(rawLine);
    if (fileMatch) {
      file = fileMatch[1]!;
      if (!byFile.has(file)) byFile.set(file, []);
      continue;
    }

    const hunkMatch = HUNK.exec(rawLine);
    if (hunkMatch) {
      newLine = Number(hunkMatch[1]);
      continue;
    }

    if (file === undefined) continue;
    if (rawLine.startsWith("---")) continue;

    const marker = rawLine[0];
    if (marker === "+") {
      // An ADDED line: it exists in the new file, at newLine. This is a touched line.
      byFile.get(file)!.push(newLine);
      newLine += 1;
    } else if (marker === " " || marker === "") {
      // A CONTEXT line: present in the new file, but not touched.
      newLine += 1;
    }
    // A REMOVED line does not exist in the new file — it advances nothing. (A pure
    // deletion therefore touches no block, which is right: deleting a test is not
    // the leak this gate hunts.)
  }

  return byFile;
}

/**
 * Attribute cites to the blocks a diff TOUCHED: a touched leaf block is vouched for
 * by a cite on itself OR on any ancestor; one carrying no cite in its whole chain is
 * a violation. A SIBLING's cite never vouches — that is the file-level widening
 * SSM-004 opened and this closes (3F-1758).
 *
 * Inheritance is deliberate (operator ruling, 2026-07-14): this codebase cites on the
 * `describe` and the `it`s beneath inherit it, so a test inside a cited describe IS
 * claiming that scenario. @SCN-SSM-005 (3F-1762).
 */
export function attributeChangedBlockCites(
  source: string,
  changedLines: number[]
): ChangedBlockCites {
  const touched = new Set(changedLines);
  const blocks = parseTestBlocks(source);

  const citedCodes: string[] = [];
  const seenCodes = new Set<string>();
  const uncitedBlocks: string[] = [];
  const seenBlocks = new Set<string>();

  // Only LEAF blocks are judged: a describe is proven by the its beneath it, and
  // judging both would name the same offence twice.
  for (const block of blocks) {
    if (!block.isLeaf) continue;

    let isTouched = false;
    for (let line = block.startLine; line <= block.endLine; line += 1) {
      if (touched.has(line)) {
        isTouched = true;
        break;
      }
    }
    if (!isTouched) continue;

    if (block.citedCodes.length === 0) {
      // No cite on the block, none inherited from any ancestor. A SIBLING's cite is
      // not in this chain and so cannot vouch for it — the whole point of 3F-1758.
      const name = block.chain.join(" > ");
      if (!seenBlocks.has(name)) {
        seenBlocks.add(name);
        uncitedBlocks.push(name);
      }
      continue;
    }

    for (const code of block.citedCodes) {
      if (!seenCodes.has(code)) {
        seenCodes.add(code);
        citedCodes.push(code);
      }
    }
  }

  return { citedCodes, uncitedBlocks };
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
