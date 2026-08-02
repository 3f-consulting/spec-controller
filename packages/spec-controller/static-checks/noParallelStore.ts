/**
 * The no-parallel-store static check (@SCN-NPS-001) — makes "the Ledger is the ONE source of
 * truth; nothing re-represents its entries in a parallel store" executable. The capstone lock of
 * the DDD retrofit (Slice 8): the census modules that once counted evidence into their own
 * `attributed[]`/section shapes are RETIRED (their counting folded onto the Ledger as the
 * `runtimeObservationTally` / `staticObservationTally` domain folds); this guard reds the build if
 * any of them — by file, by declared type/value, or by a re-added parallel credit-list field —
 * creeps back into the pure core.
 *
 * PURE: `checkNoParallelStore` takes the core's production source files as data and returns the
 * violations; the impure file-read (walking `packages/core/src`) lives in the `@unit` test that
 * drives this over the real tree. The guard lives in `static-checks/` (product-not-app) precisely
 * because it reads the tree via `fs` — it cannot live inside the pure core it checks. Mirrors
 * `domainPurity` / `enginePurity` exactly (a pure `check…()` over `{ path, source }` files).
 *
 * Three violation arms — the three shapes a resurrected parallel store would take:
 *   - **retired-module-file** — a source file whose basename is `evidenceObservations.ts` or
 *     `staticEvidenceObservations.ts` (the retired runtime/static evidence-observation census
 *     modules, 3F-2104 / 3F-2119). They stay deleted; re-adding either reds here.
 *   - **retired-declaration** — a DECLARATION (interface/type/class/enum/const/let/var/function)
 *     of a retired credit-list/section symbol: `AttributedCount`, `EvidenceObservationsSection`,
 *     `RuntimeEvidenceObservationKindCounts`, `StaticEvidenceObservationKindCounts`, or
 *     `countStaticEvidenceObservationKinds`. Comment-stripped first, so the retirement
 *     doc-comments in `assemble/report.ts` / `index.ts` (which NAME these symbols) never self-trip.
 *   - **parallel-store-field** — a field/property named `attributed` (the retired per-`(scnId,
 *     quality-check)` credit-list the section re-represented). The posted credits live ON the
 *     Ledger rows (`ledger.scenarioReconciliations[].evidenceObservations`, @SCN-LDG-022) — the
 *     ONE source; a parallel `attributed[]` re-representing them reds here. The legitimate
 *     Ledger-row field is `evidenceObservations`, NOT `attributed`, so this arm never touches it.
 *
 * By-hand residual (the manifesto call): this guard catches the KNOWN retired names + the
 * `attributed` field shape. A future parallel store smuggled in under a FRESH name is not
 * name-matchable and remains a driver's-eye judgement at review — stated in the feature prose.
 */

import type { CollectedFile } from "./sourceFiles.js";

/** A single no-parallel-store violation. */
export interface NoParallelStoreViolation {
  /** The offending file, as given by the caller (repo-relative in the guard test). */
  path: string;
  kind: "retired-module-file" | "retired-declaration" | "parallel-store-field";
  /** The file basename, declared symbol, or field name that tripped the static check. */
  detail: string;
}

/**
 * The retired census-module basenames. These files are deleted (their counting folded onto the
 * Ledger); a source file with either basename is a resurrected parallel store, wherever it sits.
 */
const RETIRED_MODULE_BASENAME = /(?:^|\/)(evidenceObservations|staticEvidenceObservations)\.ts$/;

/**
 * A DECLARATION of a retired credit-list/section symbol — the `interface`/`type`/`class`/`enum`/
 * `const`/`let`/`var`/`function` keyword immediately before the retired name. A bare MENTION (a
 * comment, an import specifier's tail) does not match: this fires only on a real declaration, and
 * comments are stripped before the scan.
 */
const RETIRED_DECLARATION =
  /\b(?:interface|type|class|enum|const|let|var|function)\s+(AttributedCount|EvidenceObservationsSection|RuntimeEvidenceObservationKindCounts|StaticEvidenceObservationKindCounts|countStaticEvidenceObservationKinds)\b/g;

/**
 * The retired parallel credit-list FIELD — a property/key named `attributed` (optional `?`, then
 * `:`), the per-`(scnId, quality-check)` list the section re-represented. The Ledger-row field is
 * `evidenceObservations`, so this whole-word `attributed:` match never touches the real source.
 */
const PARALLEL_STORE_FIELD = /\battributed\s*\??\s*:/g;

/**
 * Strip `//` line comments and block comments so a doc-comment that merely NAMES a retired symbol
 * (the retirement notes in `assemble/report.ts` / `index.ts` do) is not a false positive. Over-
 * stripping the odd string literal is harmless here — the static check only cares about real
 * declarations and real field keys, never string contents. (Mirrors domainPurity / enginePurity.)
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Check every core source file for a resurrected parallel store. Returns one
 * `NoParallelStoreViolation` per offending file/declaration/field, in file-then-source order; an
 * empty array means the lock holds — the Ledger is the ONE store. The file-basename arm reads the
 * path (not the source); the declaration and field arms read the comment-stripped source.
 */
export function checkNoParallelStore(files: readonly CollectedFile[]): NoParallelStoreViolation[] {
  const violations: NoParallelStoreViolation[] = [];
  for (const file of files) {
    const moduleMatch = RETIRED_MODULE_BASENAME.exec(file.path);
    if (moduleMatch) {
      violations.push({ path: file.path, kind: "retired-module-file", detail: `${moduleMatch[1]!}.ts` });
    }

    const code = stripComments(file.source);

    for (const match of code.matchAll(RETIRED_DECLARATION)) {
      violations.push({ path: file.path, kind: "retired-declaration", detail: match[1]! });
    }

    for (const _match of code.matchAll(PARALLEL_STORE_FIELD)) {
      violations.push({ path: file.path, kind: "parallel-store-field", detail: "attributed" });
    }
  }
  return violations;
}
