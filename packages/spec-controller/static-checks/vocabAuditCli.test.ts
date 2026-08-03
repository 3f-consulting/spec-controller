/**
 * Unit test for the audit's FILE SELECTION — the scope fix (@SCN-VOC-008, 3F-2324).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the @SCN-VOC-008 id
 * matching features/vocabulary-audit.feature, so a grep of the id returns both halves.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT. Answering "what is the project" is GIT's behaviour, proven
 * over a real repository with a real `.gitignore` by the @integration arm — re-implementing
 * `.gitignore` here to check git's answer would be the agreeing-by-copy the whole slice exists to
 * avoid. What is OURS is the SELECTION applied to git's answer, and that is what this file pins: the
 * filters that must survive the substitution (lockfiles, the self-exemption) plus the one git's
 * answer introduces (a tracked path with no file on disk). All three are pure over an injected list —
 * no fs, no git — which is the separation that makes the @unit tag on @SCN-VOC-008 mean something.
 *
 * TWO OF THESE CASES CANNOT BE PROVEN BY RUNNING ANYTHING, which is precisely why they are here:
 * this tree has ZERO deleted-but-tracked paths, and plain `--cached` returns the same 244 paths as
 * `--cached --others --exclude-standard`. A green run over this repository is consistent with both
 * bugs. Injected lists and an asserted argv are the only teeth available.
 *
 * THE MODULE IS IMPORTED THROUGH A NAMESPACE, DELIBERATELY — the convention
 * `complexityExceptionsReconciliation.test.ts` sets: a named import of a missing export is an ESM
 * link error that takes this whole file, and with it @SCN-VOC-008's unit evidence, down before a
 * single assertion runs. Through the namespace, a missing export is a failing assertion with a
 * sentence.
 *
 * Parent: @SCN-VOC-008 (3F-2324) — the audit scans the project git tracks (3F-2310).
 */

import { describe, it, expect } from "vitest";
import * as cli from "./vocabAuditCli.js";

/** The selection function's shape: git's answer plus an on-disk predicate, in; the read set, out. */
type FilesInScope = (paths: readonly string[], isFile: (path: string) => boolean) => string[];

/** Every injected path has a file behind it — the default for cases not about deletion. */
const allPresent = (): boolean => true;

/**
 * One runtime export, asserted PRESENT with a sentence. The lookup goes through `unknown` so a module
 * missing the export still type-checks here — the absence must surface as a red assertion naming what
 * is missing, not as a compile error.
 */
function exported(name: string): unknown {
  const value = (cli as unknown as Record<string, unknown>)[name];
  expect(
    value,
    `vocabAuditCli must export \`${name}\` — the selection rules and the git query are separated from ` +
      `the reading precisely so they can be proven here, with no fs and no git`
  ).toBeDefined();
  return value;
}

/** The selection function under test. */
function select(paths: readonly string[], isFile: (path: string) => boolean = allPresent): string[] {
  return (exported("filesInScope") as FilesInScope)(paths, isFile);
}

describe("[SCN-VOC-008] the audit reads what git says the project is, minus its own exclusions", () => {
  it("keeps an ordinary tracked source file", () => {
    expect(select(["packages/core/src/domain/ledger.ts"])).toEqual([
      "packages/core/src/domain/ledger.ts",
    ]);
  });

  it("drops lockfiles, which the old walk excluded by name and git hands straight back", () => {
    // `pnpm-lock.yaml` is TRACKED, so the substitution re-admits it unless the filter survives —
    // a single file large enough to swamp the manifest with pure noise.
    expect(select(["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "src/a.ts"])).toEqual([
      "src/a.ts",
    ]);
  });

  it("drops the audit's own detection machinery by exact path", () => {
    const machinery = [
      "packages/spec-controller/static-checks/vocabAudit.ts",
      "packages/spec-controller/static-checks/vocabWordSets.ts",
      "packages/spec-controller/static-checks/vocabAudit.test.ts",
      "packages/spec-controller/static-checks/vocabAuditCli.ts",
      "features/vocabulary-audit.feature",
      "tests/steps/vocabularyAudit.steps.ts",
    ];
    expect(select([...machinery, "src/a.ts"])).toEqual(["src/a.ts"]);
  });

  it("drops the fixture corpus by prefix, and only under that prefix", () => {
    // Repo-relative, unchanged: it matches when the root IS the repo, and deliberately does not
    // when a narrower `--root` makes the corpus files top-level (@SCN-VOC-001/002 need them read).
    expect(
      select(["tests/fixtures/vocab/buildSupply.ts", "tests/fixtures/vocabulary/keep.ts"])
    ).toEqual(["tests/fixtures/vocabulary/keep.ts"]);
  });

  it("drops a tracked path with no file behind it, rather than throwing on the read", () => {
    // `--cached` lists files deleted from the working tree; reading one throws ENOENT and takes the
    // whole run down. ZERO exist in this tree today, so only an injected list can prove this.
    const onDisk = (path: string): boolean => path !== "src/removed.ts";
    expect(select(["src/kept.ts", "src/removed.ts"], onDisk)).toEqual(["src/kept.ts"]);
  });

  it("returns the set in a deterministic order, which git's own output is not", () => {
    // `git ls-files --cached --others` prints the index first and the untracked files after, each
    // sorted within itself but not across the join — so an untracked file lands mid-list and the
    // manifest's row order would depend on what happened to be uncommitted.
    expect(select(["src/z.ts", "cucumber.js", "src/a.ts"])).toEqual([
      "cucumber.js",
      "src/a.ts",
      "src/z.ts",
    ]);
  });

  it("asks git for untracked-but-not-ignored files too, never plain --cached", () => {
    // Operator-ruled: tracked-only would make a NEW, UNCOMMITTED source file invisible to the audit,
    // so a banned word would go unseen until after commit. Both forms return the same 244 paths on
    // this tree, so NO run can distinguish them — the argv is the only place this can be pinned.
    const args = exported("GIT_LS_FILES_ARGS") as readonly string[];
    expect(args).toContain("--cached");
    expect(args).toContain("--others");
    expect(args).toContain("--exclude-standard");
  });
});
