/**
 * CLI entry point for the scenario ⟷ sub-issue match static check — ported HERMETICALLY
 * into spec-controller (from an earlier internal tool, itself ported from an adopter's repository 3F-834):
 * verifies the binding from the diff + the PR ticket handle alone, NO Linear call.
 *
 * Run via `pnpm lint:scn-subissues` in a PR-only CI step. It:
 *   1. resolves the PR base ref (GITHUB_BASE_SHA, falling back to origin/main);
 *   2. computes the feature-file diff and the src/test diffs;
 *   3. parses the ADDED and DELETED @SCN codes (and the unit-equivalent
 *      discriminator) from the DIFF; reads the UPDATED codes by comparing each
 *      changed feature file's BASE source against its HEAD source (@SCN-SSM-010,
 *      3F-3044: which scenario a change belongs to is a question for the FILES,
 *      and answering it from the diff named the neighbouring scenario whenever the
 *      change fell on a scenario's last step); and reads the unit-equivalent CITES
 *      from the CHECKED-OUT content of the changed test files — the diff detects the
 *      change, live file state carries the cite (@SCN-SSM-004, 3F-1741: a cite on an
 *      unchanged line is invisible to a diff scan, which false-positived a valid
 *      rename-shaped PR on 3F-1725);
 *   4. auto-detects renumber pairs and reads SCN-exempt trailers;
 *   5. reads the PR TICKET HANDLE from CI metadata — GITHUB_HEAD_REF and/or a
 *      "[3F-NNN]" commit-message prefix — NO Linear call;
 *   6. runs decideScnGate and answers with ONE OF THREE exit codes.
 *
 * THREE ANSWERS, NOT TWO (@SCN-SSM-018). 0 is a pass; 1 is a violation; NOT_EXAMINED_EXIT_CODE
 * says the run had no pull request body to read, so whether an exemption was claimed for an
 * unbound code had nowhere to be answered from. That case exits neither 0 nor 1 on purpose:
 * exiting 0 having examined nothing is the silence fault this repository is named for, and
 * exiting 1 would red honest work for the fact that it ran off a pull request. It is narrow —
 * the decision passes a code the moment a `[3F-NNN]` commit subject binds it, ahead of every
 * exemption — but the residual case is the one that must not lie.
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
  isUnitEquivalentBehaviourBearing,
  NOT_EXAMINED_EXIT_CODE,
  parseAddedCodes,
  type ChangedBlockCites,
  type Exemption,
  type RenumberPair,
  type ScnGateResult,
} from "./scnSubIssueGate.js";
import { readScenarioChanges } from "./scenarioTextChanges.js";

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

/** The files the PR touches under one pathspec, as repo-relative paths. */
function changedFiles(base: string, pathspec: string, label: string): string[] {
  try {
    const out = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`, "--", pathspec], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return out
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter((f) => f !== "");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to list the changed ${label} files against base "${base}". ` +
        `Ensure the checkout has enough history (fetch-depth: 0). Cause: ${message}`
    );
  }
}

/** The `*.test.ts` files the PR touches, as repo-relative paths. */
function changedTestFiles(base: string): string[] {
  return changedFiles(base, TEST_FILE_PATHSPEC, "test");
}

/**
 * The commit the source comparison reads its BASE side at. Resolved EXPLICITLY rather than reusing
 * `base` directly: every diff above is three-dot (`base...HEAD`), which is already the merge base,
 * and a source read taken at `base` itself would disagree with them about which commit is "before"
 * whenever main moved on. A base ref with no common ancestor (a shallow checkout) falls back to
 * `base`, which is the honest reading of what the caller named.
 */
function resolveMergeBase(base: string): string {
  try {
    return execFileSync("git", ["merge-base", base, "HEAD"], {
      encoding: "utf8",
      // git's own stderr is DISCARDED, not inherited: the failure here is an EXPECTED
      // reading (no common ancestor), and an inherited `fatal:` would print it into a
      // green gate's log. A check whose passing output contains the word "fatal" is a
      // check people learn to read past, which is the first step to switching it off.
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return base;
  }
}

/**
 * One tracked file's content AT A COMMIT. A file the PR ADDS does not exist there, so `git show`
 * fails and the source reads EMPTY — correct, since an absent scenario cannot have been updated.
 */
function sourceAtCommit(commit: string, file: string): string {
  try {
    return execFileSync("git", ["show", `${commit}:${file}`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      // stderr discarded for the reason `resolveMergeBase` gives: a PR that ADDS a feature
      // file takes this path on every run, so an inherited `fatal: path … exists on disk,
      // but not in <sha>` would be routine output of a passing gate.
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

/**
 * The @SCN codes whose SCENARIO TEXT differs between the base and the head (@SCN-SSM-010, 3F-3044).
 *
 * The DIFF is not consulted for this beyond naming which feature files moved: attribution by
 * position is what named the neighbouring scenario whenever a change fell on a scenario's last step,
 * and every proposed cure for that — a wider context window, mapping changed line numbers back to
 * scenario extents — keeps a position in the question. Two SOURCES in, a set of codes out.
 *
 * A file the PR DELETES has no checked-out content, so its head source reads empty and it
 * contributes no updates — the deletion itself is `detectDeletedCodes`' to report.
 *
 * THE RENUMBER PAIRS COME BACK ON THE SAME READ (@SCN-SSM-015, 3F-3057). They used to be detected
 * per HUNK, from this same diff, and a hunk holding anything else that changed — an unrelated edit
 * to a neighbouring scenario's step, a second renumber — threw the pair away. Hunk boundaries are a
 * function of git's context setting and of what else changed nearby, so that answer moved to the
 * two sources beside the updated one; the diff keeps naming which feature files moved, and nothing
 * else about them.
 *
 * The third half of the reading is `outsideEveryScenarioFiles` (@SCN-SSM-013, 3F-3054): the changed
 * feature files whose change lies inside NO scenario. A correct attribution can legitimately name
 * nothing, so the empty updated set has to be readable as "no scenario contains this change" rather
 * than "nothing changed" — see `outsideEveryScenarioReport`. Still hermetic: local git and the
 * checked-out tree, no Linear call.
 */
function readFeatureFileChanges(base: string): {
  updatedCodes: string[];
  renumberPairs: RenumberPair[];
  outsideEveryScenarioFiles: string[];
} {
  const mergeBase = resolveMergeBase(base);
  const seen = new Set<string>();
  const seenPairs = new Set<string>();
  const updatedCodes: string[] = [];
  const renumberPairs: RenumberPair[] = [];
  const outsideEveryScenarioFiles: string[] = [];

  for (const file of changedFiles(base, FEATURE_FILE_PATHSPEC, "feature")) {
    const headSource = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    const changes = readScenarioChanges(sourceAtCommit(mergeBase, file), headSource);
    if (changes.changedOutsideEveryScenario) outsideEveryScenarioFiles.push(file);
    for (const code of changes.updatedCodes) {
      if (seen.has(code)) continue;
      seen.add(code);
      updatedCodes.push(code);
    }
    for (const pair of changes.renumberPairs) {
      const key = `${pair.removed} ${pair.added}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      renumberPairs.push(pair);
    }
  }

  return { updatedCodes, renumberPairs, outsideEveryScenarioFiles };
}

/**
 * The line that says an empty updated set is SILENCE, not ABSENCE (@SCN-SSM-013, 3F-3054) — `null`
 * when no changed feature file has a change outside every scenario, so nothing is printed and the
 * no-feature-file-changed run keeps the output it always had, byte for byte.
 *
 * WHY THE FACT HAS TO BE SAID. A `Rule:` preamble, a `Feature:` preamble, a comment between two
 * scenarios: ordinary places to edit, inside no scenario, so no `@SCN` code accounts for them and the
 * updated set is correctly empty. But the inert message below reports the OTHER empty answer — that
 * no feature file changed at all — and left alone the two are indistinguishable in the output. That
 * is this repository's own `missing`-versus-unreached confusion arriving in a third place: the
 * honest answer reading as the inert one.
 *
 * IT IS A REPORT, NOT A VIOLATION. Nothing here reds the gate, nothing is exempted, and
 * `decideScnGate` is handed exactly the code sets it was handed before. The whole of it is silence in
 * the code set plus the fact stated out loud — and the file named, because a fact the engineer
 * cannot locate is a fact they cannot act on.
 */
function outsideEveryScenarioReport(files: readonly string[]): string | null {
  if (files.length === 0) return null;
  return (
    `scn-subissue lint: ${files.join(", ")} changed OUTSIDE every scenario — no @SCN code ` +
    `accounts for that change. An empty updated set here means "no scenario contains this change", ` +
    `never "nothing changed". Reported, not a violation.`
  );
}

/** Print the outside-every-scenario fact, if there is one. The shell over the line above. */
function reportOutsideEveryScenario(files: readonly string[]): void {
  const line = outsideEveryScenarioReport(files);
  if (line !== null) console.log(line);
}

/**
 * The run with nothing to check — no `@SCN` code moved and no behaviour-bearing unit-equivalent
 * change — reported and exited 0. On a PR touching no behaviour-bearing surface this is the whole
 * output: a no-op that smoke-tests the wiring (git diff + handle read) live over the real source.
 *
 * IT IS THE OTHER EMPTY ANSWER, and the pairing is why it is named rather than inlined. This message
 * says NO FEATURE FILE CHANGED AT ALL; `outsideEveryScenarioReport` says A FEATURE FILE CHANGED AND
 * NO SCENARIO CONTAINS THE CHANGE. Both leave the code set empty and they are not the same fact, so
 * the two lines are printed independently and neither stands in for the other (@SCN-SSM-013,
 * 3F-3054). The wording here is untouched by that slice: it was always the honest report of its own
 * case, and the fault was that it was the only thing said.
 */
function exitWithNothingToCheck(base: string): never {
  console.log(
    `scn-subissue lint: OK — the diff against ${base} adds, updates or deletes no @SCN scenario codes and carries no behaviour-bearing unit-equivalent change; nothing to check.`
  );
  process.exit(0);
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

/** The summary line's uncited-blocks clause, present only when there are any. */
function uncited(blocks: readonly string[]): string {
  return blocks.length > 0 ? `, UNCITED changed block(s): ${blocks.join("; ")}` : "";
}

/** The summary line's checking clause, present only when a code set reached the decision. */
function checking(codes: readonly string[]): string {
  return codes.length > 0 ? ` — checking: ${codes.join(", ")}` : "";
}

/**
 * Say what the decision answered, and leave with the code that says it (@SCN-SSM-018).
 *
 * THREE EXITS, AND THE ORDER OF THE PRINTING IS NOT THE ORDER OF THE VERDICT. What could not be
 * examined is printed BEFORE the failure arm, so a run that both found something and could not
 * answer for something else says both: the exit code carries the finding, and the reader still
 * learns what went unasked. Folding the two would make the louder answer swallow the quieter one.
 */
function reportAndExit(result: ScnGateResult): never {
  if (result.verdict === "pass") {
    console.log(
      "scn-subissue lint: OK — every behaviour-bearing change carries its @SCN cite and is on a ticketed PR (or a recognised exemption); verified hermetically, no Linear call."
    );
    process.exit(0);
  }

  if (result.unexamined.length > 0) {
    console.error("scn-subissue lint: NOT EXAMINED");
    for (const u of result.unexamined) console.error(`  [not-examined] ${u.message}`);
  }

  // NOT `process.exit(0)`, AND THAT IS THE WHOLE POINT. Exiting 0 having examined nothing is the
  // silence fault, in the repository named for it: every caller would read it as a pass and none
  // would be told. NOT 1 either — there is no violation to report, and an absent pull request
  // body is the ordinary state off a pull request rather than a fault.
  if (result.verdict === "not-examined") process.exit(NOT_EXAMINED_EXIT_CODE);

  console.error("scn-subissue lint: FAILED");
  for (const v of result.violations) console.error(`  [${v.kind}] ${v.message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const base = resolveBaseRef();
  const diff = featureFileDiff(base);
  const addedCodes = parseAddedCodes(diff);
  const { updatedCodes, renumberPairs, outsideEveryScenarioFiles } = readFeatureFileChanges(base);
  const renumberRemoved = renumberPairs.map((pair) => pair.removed);
  const deletedCodes = detectDeletedCodes(diff, updatedCodes, renumberRemoved);
  reportOutsideEveryScenario(outsideEveryScenarioFiles);

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

  if (codesToCheck.length === 0 && !unitEquivalentBehaviourBearing) exitWithNothingToCheck(base);

  const commitMessages = commitMessagesSinceBase(base);
  // THE ABSENT VARIABLE AND THE EMPTY ONE ARE DIFFERENT FACTS, AND THE `?? ""` USED TO ERASE THAT
  // (@SCN-SSM-018). CI always supplies PR_BODY — `${{ github.event.pull_request.body }}` resolves
  // to the empty string for a pull request whose author wrote nothing — so a body that is PRESENT
  // and empty was read and carried no exemption, and an unclaimed exemption there still reds. It
  // is UNSET that says there was no pull request body at all, which off a pull request is not a
  // fault but the ordinary state. The parse still gets a string; the decision gets the fact.
  const prBody = process.env["PR_BODY"];
  const prBodyReadable = prBody !== undefined;
  const exemptions = parseExemptions(commitMessages, prBody ?? "");
  const hasTicketHandle = readTicketHandle(process.env["GITHUB_HEAD_REF"], commitMessages);

  // The live fork read (@SCN-SSM-003): a fork-sourced (external) PR —
  // head.repo.full_name != base.repo.full_name in the GitHub PR event payload —
  // is exempt. Absent/local runs default false (internal), keeping the teeth.
  const isExternalPr = readIsExternalPr(process.env["GITHUB_EVENT_PATH"]);

  console.log(
    `scn-subissue lint: ${addedCodes.length} added, ${updatedCodes.length} updated, ${deletedCodes.length} deleted @SCN code(s); unit-equivalent: ${unitEquivalentBehaviourBearing ? "behaviour-bearing" : "inert"}, cited [${unitEquivalentCitedCodes.join(", ")}]${uncited(uncitedChangedTestBlocks)}; ticket handle: ${hasTicketHandle ? "present" : "ABSENT"}; pull request body: ${prBodyReadable ? "readable" : "NONE TO READ"}${checking(codesToCheck)}`
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
    prBodyReadable,
  });

  reportAndExit(result);
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
