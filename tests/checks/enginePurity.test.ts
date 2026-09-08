/**
 * Unit test for the engine-purity static check (@SCN-EPG-001) — and the shape every check in this
 * tree is being cut to (3F-3218): the check, ONE arm that plants every violation it detects, and
 * the named run that exercises it over the real repository.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the @SCN-EPG-001 id
 * matching features/engine-purity.feature, so a grep of the id returns both halves of the pair.
 * `@unit`-only — Cucumber skips it; this Vitest test IS the observed evidence.
 *
 * ONE ASSERTION OVER THE WHOLE VERDICT, NOT ONE ARM PER RULE. Six arms each saying "this kind is
 * detected" leave ORDER and COMPLETENESS unasserted — a checker reporting the six plus a seventh,
 * or in another order, satisfies all six. The single `toEqual` below closes both, which is why one
 * arm here is stronger than the six it replaces rather than a thinner substitute for them. The
 * clean file sitting among the planted ones is proven clean by its ABSENCE from that array: a
 * negative control costing a line rather than an arm.
 *
 * WHY THE REAL-TREE ARM STAYS (3F-3218 Ruling B, measured at 3F-3219 rather than inherited). No
 * fitness row runs `checkEnginePurity` and no `lint:` script invokes it. One other arm does reach
 * it over the real tree — sourcePopulation.test.ts's @SCN-SRC-001 — but it borrows this checker as
 * an INSTRUMENT for a claim about the enumerator's subject, cites SCN-SRC-001, and carries no
 * anti-vacuity floor. Leaning on it would make this guard's only contact with the repository a
 * side effect of someone else's scenario, revocable without notice. So the dogfood arm below is
 * this check's second half, and it keeps the floor.
 */

import { describe, expect, it } from "vitest";

import { checkEnginePurity } from "./enginePurity.js";
import {
  collectSourceFiles,
  coreSrcRoot,
  MIN_CORE_SRC_FILES_SCANNED,
  resolveRepositoryRoot,
  type CollectedFile,
} from "./sourceFiles.js";

/** The repository this guard is asked about, resolved ONCE and passed down (3F-3207). */
const REPOSITORY_ROOT = resolveRepositoryRoot();

describe("[SCN-EPG-001] the reconciliation engine imports nothing impure and references no IO", () => {
  it("reports every planted violation, in order, and nothing for the clean file beside them", () => {
    const planted: CollectedFile[] = [
      // impure-import, first term: the `spec-controller` app package.
      {
        path: "packages/core/src/render/markdown.ts",
        source: `import { readEvidenceObligations } from "spec-controller/ingest/ingestQualityChecks.js";`,
      },
      // impure-import, second term: the check tree at tests/checks/, which left the app package at
      // 3F-3187 and so stopped being covered by the first (3F-3188).
      {
        path: "packages/core/src/lib/featureCode.ts",
        source: `import { checkAnemicDomain } from "../../../../tests/checks/anemicDomain.js";`,
      },
      // Clean, and the boundary the check-tree pattern buys: `tests/checks` is refused where a path
      // separator or the specifier's end brackets it, never as a substring. The real-tree arm below
      // cannot cover this — no core file imports anything of the shape — so a `.includes` spelling
      // would pass everything else in this file.
      {
        path: "packages/core/src/model.ts",
        source: `import { x } from "../my-tests/checks-ui/panel.js";`,
      },
      // io-import: node:fs stands for the family (child_process, process, and their subpaths).
      {
        path: "packages/core/src/parse/targetManifest.ts",
        source: `import { readFileSync } from "node:fs";`,
      },
      // io-global: `process.` is IO with no import to catch.
      {
        path: "packages/core/src/render/measuredItem.ts",
        source: `export const root = process.cwd();`,
      },
    ];

    expect(checkEnginePurity(planted)).toEqual([
      {
        path: "packages/core/src/render/markdown.ts",
        kind: "impure-import",
        detail: "spec-controller/ingest/ingestQualityChecks.js",
      },
      {
        path: "packages/core/src/lib/featureCode.ts",
        kind: "impure-import",
        detail: "../../../../tests/checks/anemicDomain.js",
      },
      { path: "packages/core/src/parse/targetManifest.ts", kind: "io-import", detail: "node:fs" },
      { path: "packages/core/src/render/measuredItem.ts", kind: "io-global", detail: "process" },
    ]);
  });

  it("passes clean over the REAL packages/core/src tree (the seam holds today)", () => {
    // The dogfood green: any future stray import or IO reference in a production engine file reds
    // this. It is also where comment-stripping is exercised for real — three production files under
    // this root name `process.` inside a doc comment and nowhere else, so a checker that stopped
    // stripping comments reds HERE, which is why no hand-written doc-comment fixture is kept above.
    const engineFiles = collectSourceFiles(coreSrcRoot(REPOSITORY_ROOT), REPOSITORY_ROOT);
    // Sanity: the tree was actually scanned, not an empty walk masquerading as green. The floor is
    // the SHARED one — this guard and noParallelStore walk the same population, so a bare literal
    // here would be a second copy of the same rule, drifting the moment either is retuned (3F-2266).
    expect(engineFiles.length).toBeGreaterThan(MIN_CORE_SRC_FILES_SCANNED);
    expect(checkEnginePurity(engineFiles)).toEqual([]);
  });
});
