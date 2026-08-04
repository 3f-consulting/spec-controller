/**
 * CLI entry point for the one-time closed-vocabulary audit. Run via
 * `pnpm audit:vocab` (report-only — NOT a CI gate, NOT in any lint aggregate;
 * operator ruling 2026-07-02). It asks GIT what the project is under a root
 * (default the cwd), scanning every file git returns except the audit's own
 * exclusions — lockfiles, and the audit's OWN detection machinery: the
 * meta-mention exemption in `SELF_EXEMPT_PATHS`, the files whose purpose is to
 * name the rejected vocabulary — runs the audit engine, and emits the two
 * artefacts for review:
 *
 *   --manifest <path>   the per-name manifest CSV
 *   --matrix <path>     the coverage matrix (markdown)
 *   --root <dir>        the tree to scan (default ".")
 *
 * With no output paths it prints a summary to stdout. Exit is always 0 for a
 * SUCCESSFUL scan, however many words it flags — the audit reports, it never
 * fails a build on a finding. The ONE non-zero exit is the PRECONDITION failure
 * of @SCN-VOC-009: outside a git work tree there is no honest file set, so the
 * audit refuses to scan, names the root it tried, and writes NOTHING — not an
 * empty artefact. A finding must never be made to share that exit code.
 *
 * @SCN-VOC-001 / @SCN-VOC-002 / @SCN-VOC-008 / @SCN-VOC-009 —
 * features/vocabulary-audit.feature.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { auditFiles, renderManifestCsv, renderCoverageMatrixMarkdown } from "./vocabAudit.js";

/** Lockfile names excluded from the scan. */
const EXCLUDED_FILES = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]);

/**
 * The audit's OWN detection machinery — the ONE meta-mention exemption (operator
 * ruling 2026-07-02). These files exist to ENUMERATE and EXERCISE the
 * rejected vocabulary: the word-set encoder literally lists the banned tokens, its
 * unit tests pass them to `classifyWords`, the feature documents them, the
 * integration step-defs drive them, and the `tests/fixtures/vocab/` corpus carries
 * them as detection fixtures. Auditing them for the very words they must name is a
 * guaranteed false positive, so the whole-repo scan skips them (matched by
 * repo-relative path — a narrower `--root` over the fixture corpus still scans them,
 * which is exactly what the integration arm needs). Everything else is swept to zero.
 *
 * `vocabWordSets.ts` joined the list when 3F-2311 split the word-sets out of
 * `vocabAudit.ts`. It is the ONE place that split is not transparent: the file IS
 * the enumeration of banned tokens, so an entry here is not housekeeping — leaving
 * it out floods the manifest with 65 guaranteed false-positive rows (measured, not
 * assumed). Any future file that names the rejected vocabulary belongs here too.
 *
 * `blockedVocabulary.md` is the sharpest case of that rule (3F-2330, @SCN-VOC-010): it IS
 * the retired-word table, so every row in it is a guaranteed false positive, and the
 * derivation reading it means the file is now the enumeration `vocabWordSets.ts` used to
 * be. Its parser and that parser's unit tests join it for the same reason they always
 * have — one discusses the retired terms, the other passes them to the classifier.
 *
 * `vocabTagGrammar.ts` (3F-2313, @SCN-VOC-013) is the narrowest case of all: it IS
 * `vocabAudit.ts`'s tag-grammar half, split out only because that file's `max-lines` exception
 * is frozen at 790 and buys no headroom. Its entry is a FILE BOUNDARY DRAWN THROUGH THE MIDDLE
 * OF LINE 1 OF THIS LIST, not a second policy. Left out it contributed 21 MEASURED rows: the
 * docblock quotes the retired tag `@ci-performance` to say what the module exists to catch, and
 * `authored` / `structural` / `trimmed` are its own API names. THE COST THIS LIST WARNS OF IS
 * PAID HERE — an adopted retired word in that file is now invisible — so it was swept BEFORE
 * the entry landed, and the one genuine hit (a banned `state` in a docblock) was REWORDED
 * rather than hidden behind the exemption.
 *
 * `vocabAuditTagLines.test.ts` (3F-2313, @SCN-VOC-013) joins on the ORIGINAL ground rather
 * than the narrower one below it: it feeds a banned-word corpus — the retired tag
 * `@ci-performance`, a planted `supply`, a bare `guard` handle — straight to the classifier,
 * exactly as `vocabAudit.test.ts` does. It is a SEPARATE FILE only because `vocabAudit.test.ts`
 * carries a `max-lines` exception frozen at 801 and an exception buys no headroom, so the new
 * arm could not be appended there; the file boundary is the complexity ratchet's, not a
 * second policy.
 *
 * `vocabAuditCli.test.ts` (3F-2327) is the ONE entry that earns its place on a DIFFERENT
 * ground, and the difference is stated rather than left to be inferred from the company it
 * keeps. It holds no banned-word corpus at all — it is a pure unit test over `filesInScope`,
 * `insideWorkTree` and `notAWorkTreeMessage`, over injected path lists, and it never reaches
 * `classifyWords`. What it names is the SUBJECT UNDER TEST, whose own module is two lines up
 * this list: without the entry the audit could not see `insideWorkTree` where it is DEFINED
 * and counted it 24 times where it is REFERENCED — a file boundary drawn through the middle
 * of one exemption, not a second policy. Measured before the entry landed: 56 rows, 55 of
 * them `review` (generic-technical candidates) and exactly 1 `rename`, itself a mention of
 * the already-exempt fixture corpus. Relocating that content to `tests/fixtures/vocab/` was
 * the alternative and the numbers rejected it: at most 5 of the 56 rows could move, and the
 * headline would still shift on every edit.
 *
 * The two `adopted-vocabulary` entries (3F-2343, @SCN-VOC-014) join on the ORIGINAL ground,
 * and the split between what was exempted and what was NOT is the judgement this list asks
 * for. The @unit test asserts the exact adopted term set — it must write `demand`,
 * `undemanded` and `budget` to say which words the gate enforces — and the step definitions
 * plant those same words in fixture trees to drive the gate. Both are `vocabAudit.test.ts`'s
 * case exactly: a banned-word corpus fed to the machinery under test.
 *
 * The gate's OWN module, `lintAdoptedVocabularyCli.ts`, is deliberately ABSENT. Its single
 * hit was one retired word in a docblock, and it was REWORDED rather than exempted — the
 * same call `vocabTagGrammar.ts` records above, and for the same reason: the module that
 * enforces the vocabulary is the last file that should be invisible to it. Measured before
 * the entries landed: 21 occurrences, 20 in the two exempted files as fixture data and
 * prose about them, 1 in the module, now gone.
 *
 * ═══ WHAT AN ENTRY HERE COSTS, SAID OUT LOUD ═══
 *
 * An exemption is a BLIND SPOT, and this codebase has been bitten by one: 3F-2300's rename
 * of `undemanded` looked complete because the audit reported nothing, when in truth all six
 * files naming the word were already on this list — the sweep was unmeasured, not clean. So
 * every entry here also hides an ADOPTED retired word appearing in that file, and nothing
 * else catches it (`lint:blocked-vocabulary` validates the TABLE, not the tree). The trade is
 * taken because the measured cost is ZERO adopted words hidden today, and because permanent
 * false positives that move on every edit train a reader to stop reading the headline — a
 * signal nobody reads is not a safeguard. Sweeping THIS SET for adopted words is the
 * mechanism that closes the gap properly and has its own ticket (3F-2345); until it lands,
 * a new entry here is a judgement, not a formality.
 *
 * Every entry is PINNED by `vocabAuditCli.test.ts`'s exact-path case, which feeds the list
 * through `filesInScope` — so deleting one from this set reds `pnpm test` instead of quietly
 * widening the blind spot.
 */
const SELF_EXEMPT_PATHS = new Set([
  "packages/spec-controller/static-checks/vocabAudit.ts",
  "packages/spec-controller/static-checks/vocabTagGrammar.ts",
  "packages/spec-controller/static-checks/vocabWordSets.ts",
  "packages/spec-controller/static-checks/vocabAudit.test.ts",
  "packages/spec-controller/static-checks/vocabAuditTagLines.test.ts",
  "packages/spec-controller/static-checks/vocabAuditCli.ts",
  "packages/spec-controller/static-checks/vocabAuditCli.test.ts",
  "packages/spec-controller/static-checks/blockedVocabulary.md",
  "packages/spec-controller/static-checks/blockedVocabulary.ts",
  "packages/spec-controller/static-checks/blockedVocabulary.test.ts",
  "features/vocabulary-audit.feature",
  "tests/steps/vocabularyAudit.steps.ts",
  "packages/spec-controller/static-checks/lintAdoptedVocabularyCli.test.ts",
  "tests/steps/adoptedVocabulary.steps.ts",
]);
const SELF_EXEMPT_PREFIX = "tests/fixtures/vocab/";

/**
 * The question put to git: what is the project under this root? (@SCN-VOC-008, 3F-2324)
 *
 * `--others --exclude-standard` IS THE POINT, and it is invisible to any run. Plain `--cached`
 * returns the same 244 paths on this tree, so no green could tell the two apart — but tracked-only
 * would make a NEW, UNCOMMITTED source file invisible to the audit: a banned word could be
 * introduced and go unseen until after commit. That trades a coverage hole for a noise fix, which
 * is a bad trade (operator-ruled). Exported so the @unit arm can pin the form, since nothing else
 * can.
 *
 * `-z` is an output-format flag, not a scope one: git otherwise C-quotes paths containing non-ASCII
 * or control characters, and a quoted path would be read back as a file that does not exist. NUL
 * separation removes the ambiguity rather than parsing around it.
 *
 * WHAT IS DELIBERATELY ABSENT: any re-implementation of `.gitignore`. Negations, nested ignore
 * files and glob precedence are subtle enough that a second implementation agrees with git by
 * COINCIDENCE and then drifts — the agreeing-by-copy this codebase has spent several slices
 * removing. Git is the authority on git. The old `EXCLUDED_DIRS` set (`.git`, `node_modules`) went
 * with the walk for the same reason: git never lists `.git`, and `node_modules` is ignored, so
 * keeping the set would be this module asserting an answer git already owns.
 */
export const GIT_LS_FILES_ARGS = [
  "ls-files",
  "-z",
  "--cached",
  "--others",
  "--exclude-standard",
] as const;

/**
 * The question put to git BEFORE the file set: is this a work tree at all? (@SCN-VOC-009, 3F-2325)
 *
 * Asking git what the project is buys an honest headline, and it buys a PRECONDITION the audit never
 * used to have — git must have an answer. This is how its absence is detected, and the form is the
 * whole ruling: `rev-parse --is-inside-work-tree`, NEVER a `.git` path probe. A `.git` FILE is a
 * valid work tree (git worktrees — this repository is driven from one — and submodules) and a probe
 * for a DIRECTORY would miss it; a `.git` directory further up may not be the right one and would be
 * a false pass. Both mistakes are invisible on an ordinary clone, so the argv is pinned by the @unit
 * arm rather than by any run. Git answers questions about git, here as everywhere else in this file.
 */
export const GIT_REV_PARSE_ARGS = ["rev-parse", "--is-inside-work-tree"] as const;

/**
 * The ruling over git's answer, pure: git's stdout, or `undefined` when the command itself failed.
 *
 * ONLY an explicit `true` scans. The two other answers each look like success from the wrong angle:
 *
 *  - `false` — what a path INSIDE a `.git` directory returns. It is a repository, but not a work
 *    tree, and git EXITS 0 to say so, so a caller reading the status alone would go on to scan.
 *  - a failure — no output at all. Read as consent, an unavailable or broken `git` would scan.
 *
 * Neither is reachable from a run inside this repository, which is exactly why they are pinned.
 */
export function insideWorkTree(gitAnswer: string | undefined): boolean {
  return gitAnswer?.trim() === "true";
}

/**
 * What the operator is told when the precondition fails, pure — and it is the DELIVERABLE, not
 * decoration: the exit code says something went wrong, the message says what and where.
 *
 * It names the ACTUAL problem (the project's file set could not be determined) and the ROOT IT
 * TRIED, resolved, so the operator knows which path is not in a work tree. A bare "scan failed"
 * would satisfy the exit code and tell them nothing. It also states that NOTHING was written, so an
 * absent manifest is never read as a clean scan.
 */
export function notAWorkTreeMessage(root: string): string {
  return (
    `vocab audit: cannot determine the project's file set — ${resolve(root)} is not inside a ` +
    `git work tree.\n` +
    `  The audit asks git which files make up the project, so its headline never counts gitignored ` +
    `build output.\n` +
    `  Outside a work tree git has no answer, and falling back to a recursive walk would emit a ` +
    `manifest whose meaning\n` +
    `  depends on an unstated scanning mode — the exact fault this tool was changed to remove. ` +
    `Refusing is honest; guessing is not.\n` +
    `  No manifest and no coverage matrix were written.`
  );
}

/**
 * Git's answer for `root`, or `undefined` when the query failed — git's own noise stays off
 * stderr. Exported so the adopted-vocabulary gate (@SCN-VOC-014) reuses this precondition
 * rather than asking git the same question a second, drifting way.
 */
export function gitWorkTreeAnswer(root: string): string | undefined {
  const probe = spawnSync("git", [...GIT_REV_PARSE_ARGS], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return probe.status === 0 ? probe.stdout : undefined;
}

/**
 * SELECTION — the audit's own exclusions over git's answer, pure and injectable (@SCN-VOC-008).
 *
 * Separated from the walking and the reading deliberately: this is the half whose rules are ours
 * rather than git's, and it is the half whose failure modes CANNOT be observed on this tree. There
 * are zero deleted-but-tracked paths today and the lockfile is a single file among 244, so a green
 * run is consistent with both filters being broken. Against an injected list, with no fs and no
 * git, they are provable.
 *
 * Three rules, each surviving the substitution for its own reason:
 *
 *  1. LOCKFILES. `pnpm-lock.yaml` is TRACKED, so git hands it back where the old walk excluded it
 *     by name. Drop the filter and the manifest gains a large file of pure noise.
 *  2. THE SELF-EXEMPTION, unchanged and still repo-relative — matching when the root IS the repo,
 *     and deliberately NOT matching when a narrower `--root` makes the corpus files top-level,
 *     which is what @SCN-VOC-001/002 need in order to read them.
 *  3. DELETED-BUT-TRACKED. `--cached` lists files deleted from the working tree; reading one throws
 *     ENOENT and takes the whole run down. Filtered by construction via the injected predicate, not
 *     by the luck of there being none today.
 *
 * The result is SORTED, which git's own output is not: `--cached --others` prints the index first
 * and the untracked files after, each sorted within itself but not across the join, so an
 * uncommitted file would land mid-list and the manifest's row order would depend on what happened
 * to be uncommitted at the time.
 */
export function filesInScope(
  paths: readonly string[],
  isFile: (path: string) => boolean
): string[] {
  const selected = paths.filter((path) => {
    const name = path.slice(path.lastIndexOf("/") + 1);
    if (EXCLUDED_FILES.has(name)) return false;
    if (SELF_EXEMPT_PATHS.has(path) || path.startsWith(SELF_EXEMPT_PREFIX)) return false;
    return isFile(path);
  });
  return selected.sort();
}

/** True when `abs` is a file on disk — false for a deleted path, and for a directory (a submodule). */
function isExistingFile(abs: string): boolean {
  try {
    return statSync(abs).isFile();
  } catch {
    return false;
  }
}

/**
 * Every scannable file under `root`, relative to `root` — git's answer, filtered.
 *
 * `cwd` is the resolved root, so git returns root-relative paths exactly as the old recursive walk
 * produced them, and everything downstream — `scanFile`, `auditSegments`, both renderers — is
 * untouched. There is still NO SILENT FALLBACK to a recursive walk here — a number whose meaning
 * depends on an unstated scanning mode is the exact fault this change removes — but the ruling on
 * that is no longer this function's bare throw: `refusesToScan` gates the run before `main` ever
 * reaches here (@SCN-VOC-009, 3F-2325), so the operator gets a sentence naming the root instead of
 * git's stack. Called directly outside a work tree this still throws, which is the honest default
 * for a helper whose precondition its one caller checks.
 */
export function scanFiles(root: string): string[] {
  const out = execFileSync("git", [...GIT_LS_FILES_ARGS], { cwd: root, encoding: "utf8" });
  const paths = out.split("\0").filter((path) => path !== "");
  return filesInScope(paths, (path) => isExistingFile(join(root, path)));
}

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}

/**
 * The precondition gate (@SCN-VOC-009, 3F-2325) — true when the audit must NOT scan `root`.
 *
 * Called FIRST, before a single file is read and long before either artefact could be opened.
 * Position is the mechanism: "no manifest, not even an empty one" holds by CONSTRUCTION rather than
 * by a cleanup, because there is no path from here to a write. An empty CSV sitting at the path the
 * operator asked for is indistinguishable from a clean scan to anything that reads the file
 * afterwards, and the caller must not be left to tidy that up.
 *
 * The exit code set here is THE ONLY NON-ZERO EXIT IN THIS TOOL, and it signals a PRECONDITION
 * FAILURE, not a finding. A successful scan stays exit 0 however many words it flags — the audit is
 * a report, not a gate (operator ruling 2026-07-02, unchanged). Do not unify the two.
 */
function refusesToScan(root: string): boolean {
  if (insideWorkTree(gitWorkTreeAnswer(root))) return false;
  console.error(notAWorkTreeMessage(root));
  process.exitCode = 1;
  return true;
}

/**
 * The headline, which now names its own authority (3F-2310, non-negotiable 2 — the scan mode is
 * never silent).
 *
 * With no fallback there is only one scanning mode, so that rule is satisfied structurally — but a
 * bare count still leaves the reader to infer WHICH files were counted, and having to infer that is
 * exactly what made the old 735 unreadable. Prose on an existing line, no behaviour: a number read
 * months from now carries its scope with it.
 */
function summarise(scanned: number, root: string, flagged: number, distinct: number): string {
  return (
    `vocab audit: scanned ${scanned} file(s) under ${root} — the file set git reports for ` +
    `the project, gitignored paths excluded; ` +
    `${flagged} flagged name(s), ${distinct} distinct flagged word(s).`
  );
}

function main(): void {
  const argv = process.argv.slice(2);
  const root = argValue(argv, "--root") ?? ".";
  const manifestPath = argValue(argv, "--manifest");
  const matrixPath = argValue(argv, "--matrix");

  if (refusesToScan(root)) return;

  const relPaths = scanFiles(root);
  const files = relPaths.map((path) => ({ path, content: readFileSync(join(root, path), "utf8") }));
  const { manifest, matrix } = auditFiles(files);

  const csv = renderManifestCsv(manifest);
  const md = renderCoverageMatrixMarkdown(matrix);

  if (manifestPath) writeFileSync(manifestPath, csv);
  if (matrixPath) writeFileSync(matrixPath, md);

  const distinct = new Set(manifest.map((r) => r.current));
  console.log(summarise(files.length, root, manifest.length, distinct.size));
  if (manifestPath) console.log(`  manifest → ${manifestPath}`);
  if (matrixPath) console.log(`  coverage matrix → ${matrixPath}`);
  if (!manifestPath && !matrixPath) {
    console.log("\n" + md);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) main();
