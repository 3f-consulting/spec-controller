/**
 * CLI entry point for the scenario ⟷ sub-issue match static check — ported HERMETICALLY
 * into spec-controller (from an earlier internal tool, itself ported from an adopter's repository 3F-834):
 * verifies the binding from the diff + the PR ticket handle alone, NO Linear call.
 *
 * Run via `pnpm lint:scn-subissues` in a PR-only CI step. It:
 *   1. resolves the PR base ref (GITHUB_BASE_SHA, falling back to origin/main);
 *   2. computes the feature-file diff and the src/test diffs;
 *   3. parses the behaviour-bearing @SCN codes (added/updated/deleted + the
 *      unit-equivalent discriminator) from the DIFF, and the unit-equivalent
 *      CITES from the CHECKED-OUT content of the changed test files — the diff
 *      detects the change, live file state carries the cite (@SCN-SSM-004,
 *      3F-1741: a cite on an unchanged line is invisible to a diff scan, which
 *      false-positived a valid rename-shaped PR on 3F-1725);
 *   4. auto-detects renumber pairs and reads SCN-exempt trailers;
 *   5. reads the PR TICKET HANDLE from CI metadata — GITHUB_HEAD_REF and/or a
 *      "[3F-NNN]" commit-message prefix — NO Linear call;
 *   6. runs decideScnGate and exits non-zero on any violation.
 *
 * On a PR that touches no behaviour-bearing surface the code sets are empty and
 * the surface is inert: no violations, exit 0 — a no-op that smoke-tests the
 * whole wiring (git diff + handle read) live, over the REAL checked-out source.
 *
 * `isExternalPr` is read LIVE from the GitHub PR event payload (@SCN-SSM-003,
 * 3F-1495): readIsExternalPr parses GITHUB_EVENT_PATH and returns
 * head.repo.full_name != base.repo.full_name — a fork-sourced (external) PR is
 * exempt (decideScnGate skips it silently, exit 0). Absent/local runs default
 * false (internal), keeping the teeth for no-handle internal PRs.
 *
 * Parent: 3F-1137 (the port + fork-exemption design).
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import {
  attributeChangedBlockCites,
  changedLinesByFile,
  decideScnGate,
  detectDeletedCodes,
  detectRenumberPairs,
  detectUpdatedCodes,
  isUnitEquivalentBehaviourBearing,
  parseAddedCodes,
  type ChangedBlockCites,
  type Exemption,
} from "./scnSubIssueGate.js";

/** Resolve the base ref to diff HEAD against (the PR base). */
function resolveBaseRef(): string {
  const baseSha = process.env["GITHUB_BASE_SHA"];
  if (baseSha && baseSha.trim() !== "") return baseSha.trim();
  return "origin/main";
}

/**
 * The `3F-NNN` ticket-handle pattern. Linear's GitHub integration auto-names every
 * issue branch `steven/3f-NNN-…` and the commit convention prefixes the subject
 * `[3F-NNN]`. Case-insensitive on the `3F`/`3f`.
 */
const TICKET_HANDLE = /\b3F-\d+\b/i;

/**
 * Read the PR TICKET HANDLE hermetically — does the PR carry a `3F-NNN` handle
 * (proving the change is on a real, in-flight tracked work-unit BY CONSTRUCTION)?
 * Two redundant CI-metadata sources, no Linear call: GITHUB_HEAD_REF and the
 * `[3F-NNN]` prefix in any commit-message subject.
 */
export function readTicketHandle(
  headRef: string | undefined,
  commitMessages: string[]
): boolean {
  if (headRef && TICKET_HANDLE.test(headRef)) return true;
  return commitMessages.some((m) => TICKET_HANDLE.test(m));
}

/**
 * Decide whether a PR is fork-sourced (external) from a PARSED GitHub PR event
 * payload — the reliable fork signal: head.repo.full_name != base.repo.full_name.
 * A missing/malformed payload (local or non-PR runs) is NOT external → false.
 *
 * Pure over the parsed payload so it is @unit-testable over an event-payload
 * fixture; the file read lives in `readIsExternalPr`. @SCN-SSM-003 (3F-1495).
 */
export function isExternalPrFromEvent(event: unknown): boolean {
  const pullRequest = (event as { pull_request?: unknown } | null | undefined)?.pull_request;
  const headRepo = (pullRequest as { head?: { repo?: { full_name?: unknown } } } | undefined)?.head
    ?.repo?.full_name;
  const baseRepo = (pullRequest as { base?: { repo?: { full_name?: unknown } } } | undefined)?.base
    ?.repo?.full_name;
  if (typeof headRepo !== "string" || typeof baseRepo !== "string") return false;
  return headRepo !== baseRepo;
}

/**
 * Read the fork signal live from the GitHub PR event payload: parse the JSON at
 * `eventPath` (`GITHUB_EVENT_PATH`) and delegate to `isExternalPrFromEvent`. An
 * absent path (local / non-PR runs) or an unreadable/malformed payload is NOT
 * external → false. @SCN-SSM-003 (3F-1495).
 */
export function readIsExternalPr(eventPath: string | undefined): boolean {
  if (eventPath === undefined || eventPath.trim() === "") return false;
  let event: unknown;
  try {
    event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  } catch {
    return false;
  }
  return isExternalPrFromEvent(event);
}

/** Compute `git diff <base>...HEAD` over the given pathspecs. */
function diffPaths(base: string, pathspecs: string[], label: string): string {
  try {
    return execFileSync("git", ["diff", `${base}...HEAD`, "--", ...pathspecs], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to compute the ${label} diff against base "${base}". ` +
        `Ensure the checkout has enough history (fetch-depth: 0). Cause: ${message}`
    );
  }
}

/**
 * The git pathspec the Gherkin-surface arm diffs over. spec-controller's REAL
 * feature files are FLAT in `features/` — git's `**` requires an intervening
 * directory to match, so `features/*.feature` is the live pathspec (an adopter's repository's 3F-950
 * lesson: `features/**\/*.feature` silently matched nothing against flat files).
 * Fixture feature files nested under the tests/fixtures target dirs are correctly
 * excluded — they are test data, not the tracked Gherkin surface.
 */
export const FEATURE_FILE_PATHSPEC = "features/*.feature";

/**
 * The production source pathspec, EXCLUDING test files — the unit-equivalent
 * anchor. spec-controller is a pnpm workspace: production source lives under the
 * packages' src directories (the pure core + the app), not a top-level src dir.
 */
export const SRC_FILE_PATHSPECS = ["packages/*/src/**", ":(exclude)**/*.test.ts"];

/** The feature-file diff of HEAD against the base ref (the Gherkin surface). */
function featureFileDiff(base: string): string {
  return diffPaths(base, [FEATURE_FILE_PATHSPEC], "feature-file");
}

/** The pathspec for the `*.test.ts` surface — the @unit test layer. */
const TEST_FILE_PATHSPEC = "**/*.test.ts";

/** The changed `*.test.ts` diff — the CHANGE-DETECTOR for the unit-equivalent surface. */
function testFileDiff(base: string): string {
  return diffPaths(base, [TEST_FILE_PATHSPEC], "test-file");
}

/** The `*.test.ts` files the PR touches, as repo-relative paths. */
function changedTestFiles(base: string): string[] {
  try {
    const out = execFileSync(
      "git",
      ["diff", "--name-only", `${base}...HEAD`, "--", TEST_FILE_PATHSPEC],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
    return out
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter((f) => f !== "");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to list the changed test files against base "${base}". ` +
        `Ensure the checkout has enough history (fetch-depth: 0). Cause: ${message}`
    );
  }
}

/**
 * The @SCN codes the changed test files CITE, read from their CHECKED-OUT content
 * (@SCN-SSM-004, 3F-1741) — NOT from the diff. A cite is a property of the file as
 * it now stands: a rename-shaped change churns an `it`-body while the cite on the
 * enclosing `describe` stays a diff CONTEXT line, and a diff-only scan would read
 * that live cite as absent and red a valid PR (lived: 3F-1725). The DIFF remains
 * the change-detector (see `isUnitEquivalentBehaviourBearing`); only this check
 * reads live state. Still hermetic — the checked-out tree, no Linear call.
 *
 * A test file DELETED by the PR has no live content to read; it contributes no
 * cites and is skipped.
 */
function citedCodesInChangedTestFiles(base: string, testDiff: string): ChangedBlockCites {
  const changedLines = changedLinesByFile(testDiff);

  const seenCodes = new Set<string>();
  const citedCodes: string[] = [];
  const uncitedBlocks: string[] = [];

  for (const file of changedTestFiles(base)) {
    let source: string;
    try {
      source = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const attributed = attributeChangedBlockCites(source, changedLines.get(file) ?? []);
    for (const code of attributed.citedCodes) {
      if (!seenCodes.has(code)) {
        seenCodes.add(code);
        citedCodes.push(code);
      }
    }
    // Name each uncited block by its file, so the engineer knows where to look.
    for (const block of attributed.uncitedBlocks) {
      uncitedBlocks.push(`${file}: ${block}`);
    }
  }

  return { citedCodes, uncitedBlocks };
}

/** The production packages-src diff EXCLUDING test files — the unit-equivalent anchor. */
function srcFileDiff(base: string): string {
  return diffPaths(base, SRC_FILE_PATHSPECS, "src-file");
}

/**
 * SCN-exempt DIRECTIVES parsed from the PR's commit messages + PR body. Each
 * `SCN-exempt: <SCN-code> (<reason>)` line yields a `{ code, reason }`; a missing
 * reason parses as `null` and an unrecognised reason as the raw string, so the
 * engine emits the `malformed-exemption` violation.
 */
export function parseExemptions(
  commitMessages: string[],
  prBody: string
): Exemption[] {
  const directive = /^\s*SCN-exempt:\s*(SCN-[A-Z0-9]+-\d+)\s*(?:\(([^)]*)\))?\s*$/;

  const exemptions: Exemption[] = [];
  for (const source of [...commitMessages, prBody]) {
    for (const rawLine of source.split(/\r?\n/)) {
      const m = directive.exec(rawLine);
      if (!m) continue;
      const code = m[1]!;
      const rawReason = m[2];
      const reason =
        rawReason !== undefined && rawReason.trim() !== "" ? rawReason.trim() : null;
      exemptions.push({ code, reason });
    }
  }
  return exemptions;
}

/** Record separator between commit-message bodies in the `git log` output. */
const COMMIT_SEP = "\x00";

/** The PR's commit messages over the diff range, for trailer + handle scanning. */
function commitMessagesSinceBase(base: string): string[] {
  try {
    const out = execFileSync("git", ["log", "--format=%B%x00", `${base}..HEAD`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return out
      .split(COMMIT_SEP)
      .map((m) => m.trim())
      .filter((m) => m !== "");
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const base = resolveBaseRef();
  const diff = featureFileDiff(base);
  const addedCodes = parseAddedCodes(diff);
  const updatedCodes = detectUpdatedCodes(diff);
  const deletedCodes = detectDeletedCodes(diff);

  const testDiff = testFileDiff(base);
  const srcDiff = srcFileDiff(base);
  const featureScnDelta =
    addedCodes.length > 0 || updatedCodes.length > 0 || deletedCodes.length > 0;
  // The DIFF detects WHICH BLOCKS changed; the CHECKED-OUT FILES carry their CITES
  // (@SCN-SSM-004), attributed per BLOCK, not per file (@SCN-SSM-005).
  const { citedCodes: unitEquivalentCitedCodes, uncitedBlocks: uncitedChangedTestBlocks } =
    citedCodesInChangedTestFiles(base, testDiff);
  const unitEquivalentBehaviourBearing = isUnitEquivalentBehaviourBearing(
    testDiff,
    srcDiff,
    featureScnDelta
  );

  const codesToCheck = [...new Set([...addedCodes, ...updatedCodes, ...deletedCodes])];

  if (codesToCheck.length === 0 && !unitEquivalentBehaviourBearing) {
    console.log(
      `scn-subissue lint: OK — the diff against ${base} adds, updates or deletes no @SCN scenario codes and carries no behaviour-bearing unit-equivalent change; nothing to check.`
    );
    process.exit(0);
  }

  const commitMessages = commitMessagesSinceBase(base);
  const renumberPairs = detectRenumberPairs(diff);
  const exemptions = parseExemptions(
    commitMessages,
    process.env["PR_BODY"] ?? ""
  );
  const hasTicketHandle = readTicketHandle(process.env["GITHUB_HEAD_REF"], commitMessages);

  // The live fork read (@SCN-SSM-003): a fork-sourced (external) PR —
  // head.repo.full_name != base.repo.full_name in the GitHub PR event payload —
  // is exempt. Absent/local runs default false (internal), keeping the teeth.
  const isExternalPr = readIsExternalPr(process.env["GITHUB_EVENT_PATH"]);

  console.log(
    `scn-subissue lint: ${addedCodes.length} added, ${updatedCodes.length} updated, ${deletedCodes.length} deleted @SCN code(s); unit-equivalent: ${unitEquivalentBehaviourBearing ? "behaviour-bearing" : "inert"}, cited [${unitEquivalentCitedCodes.join(", ")}]${uncitedChangedTestBlocks.length > 0 ? `, UNCITED changed block(s): ${uncitedChangedTestBlocks.join("; ")}` : ""}; ticket handle: ${hasTicketHandle ? "present" : "ABSENT"}${codesToCheck.length > 0 ? ` — checking: ${codesToCheck.join(", ")}` : ""}`
  );

  const result = decideScnGate({
    addedCodes,
    updatedCodes,
    deletedCodes,
    renumberPairs,
    exemptions,
    unitEquivalentBehaviourBearing,
    unitEquivalentCitedCodes,
    uncitedChangedTestBlocks,
    hasTicketHandle,
    isExternalPr,
  });

  if (result.ok) {
    console.log(
      "scn-subissue lint: OK — every behaviour-bearing change carries its @SCN cite and is on a ticketed PR (or a recognised exemption); verified hermetically, no Linear call."
    );
    process.exit(0);
  }

  console.error("scn-subissue lint: FAILED");
  for (const v of result.violations) {
    console.error(`  [${v.kind}] ${v.message}`);
  }
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) {
  main().catch((err) => {
    console.error("scn-subissue lint: ERROR");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
