/**
 * Unit test for the domain-purity static check (@SCN-DPG-001) — and the shape every check in this
 * tree is being cut to (3F-3218): the check, ONE arm that plants every violation it detects, and
 * the named run that exercises it over the real repository.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe string carries the @SCN-DPG-001 id
 * matching features/domain-purity.feature, so a grep of the id returns both halves of the pair.
 * `@unit`-only — Cucumber skips it; this Vitest test IS the observed evidence, mirroring
 * @SCN-EPG-001 exactly.
 *
 * ONE ASSERTION OVER THE WHOLE VERDICT, NOT ONE ARM PER RULE. Separate arms each saying "this kind
 * is detected" leave ORDER and COMPLETENESS unasserted — a checker reporting the same kinds plus a
 * spurious extra, or in another order, satisfies all of them. The single `toEqual` below closes
 * both, which is why one arm here is stronger than the three it replaces rather than a thinner
 * substitute. It is also the only form that can state this module's PRECEDENCE rule at all: the app
 * check runs first, so an escape into the app package carrying an adapter-named segment is
 * `app-import` — a claim about which of two branches fired, unassertable by an arm that only asks
 * "was something reported?".
 *
 * THE CLEAN FILE IS A NEGATIVE CONTROL COSTING A LINE RATHER THAN AN ARM. It is proven clean by its
 * ABSENCE from the pinned array, and it carries the three boundaries the real-tree arm below cannot
 * reach: no production domain file imports `@3f-consulting/spec-controller-core`, none imports a
 * specifier that merely CONTAINS an adapter word, and none names a `from` specifier inside a
 * comment — measured, not assumed. Comment-stripping in particular had NO arm before this one.
 *
 * WHY THE REAL-TREE ARM STAYS (3F-3218 Ruling B, measured at 3F-3220 rather than inherited). All 13
 * rows of package.json's specController.fitnessChecks were read: none runs `checkDomainPurity`, and
 * no `lint:` / `guard:` script invokes it either. `checkDomainPurity` is referenced from exactly one
 * file in the repository — this one. Unlike engine purity (whose checker sourcePopulation.test.ts
 * borrows as an instrument under @SCN-SRC-001), nothing else reaches this one at all, so the dogfood
 * arm below is not merely the better second half — it is the only contact this guard has with the
 * repository. It keeps its LOCAL floor: the domain subtree is a much smaller population than the
 * core-src one enginePurity and noParallelStore share, and adopting their floor of 10 would invent a
 * constraint that does not exist (3F-2266). The walk is shared three ways; the floor is not.
 */

import { describe, expect, it } from "vitest";

import { checkDomainPurity } from "./domainPurity.js";
import {
  collectSourceFiles,
  domainRoot,
  resolveRepositoryRoot,
  type CollectedFile,
} from "./sourceFiles.js";

/** The repository this guard is asked about, resolved ONCE and passed down (3F-3207). */
const REPOSITORY_ROOT = resolveRepositoryRoot();

describe("[SCN-DPG-001] a domain module imports only the domain layer and pure standard types", () => {
  it("reports every planted violation, in order, and nothing for the clean file beside them", () => {
    const planted: CollectedFile[] = [
      // adapter-import: all four layers the denylist names, together. A checker that recognised
      // only the first term of the alternation would be caught by the SHAPE of the array below,
      // which no per-kind arm could see.
      {
        path: "packages/core/src/domain/journal.ts",
        source: [
          `import { parseScenarios } from "../parse/scenarios.js";`,
          `import { renderMarkdown } from "../render/markdown.js";`,
          `import { assembleRenderInput } from "../assemble/renderInput.js";`,
          `import { evidenceObligations } from "../census/evidenceObligations.js";`,
        ].join("\n"),
      },
      // app-import, both spellings a domain file could reach the app package by: the bare
      // specifier, and a relative escape into it.
      {
        path: "packages/core/src/domain/ledger.ts",
        source: [
          `import { keptRun } from "spec-controller/run-management/keptRun.js";`,
          `import { REGISTRY } from "../../../spec-controller/static-checks/featureCodes.js";`,
        ].join("\n"),
      },
      // The PRECEDENCE the module documents: the app-layer test is applied first, so a specifier
      // that satisfies BOTH patterns is reported once, as `app-import`. The escape is the graver
      // fault and the reader is told that rather than the incidental one.
      {
        path: "packages/core/src/domain/posting.ts",
        source: `import { renderMarkdown } from "../../../spec-controller/render/markdown.js";`,
      },
      // Clean — the seam's real shape, plus the three boundaries the real tree cannot state.
      {
        path: "packages/core/src/domain/thresholds.ts",
        source: [
          // Sibling domain modules and the pure aggregation roots are the point of the layer.
          `import type { Outcome } from "./qualityCheckReconciliation.js";`,
          `import type { Model } from "../model.js";`,
          `import { bareTerm } from "../lib/bareTerm.js";`,
          `import { provenance } from "../provenance/provenance.js";`,
          // The core is not the app: the app pattern is bounded by a separator or the specifier's
          // end, so `spec-controller-core` is excluded where a bare `.includes` would refuse it.
          `import { reconcile } from "@3f-consulting/spec-controller-core";`,
          // An adapter word is refused as a path SEGMENT, never as a substring — `reassemble/`
          // contains `assemble` and is a legitimate neighbour.
          `import { reassemble } from "../lib/reassemble/parts.js";`,
          // A comment that merely NAMES a forbidden import is not an import. This module's own
          // header does exactly this, and nothing in the real domain does — so without this line
          // stripComments has no teeth anywhere in the tree.
          `/* import { renderMarkdown } from "../render/markdown.js"; */`,
        ].join("\n"),
      },
    ];

    expect(checkDomainPurity(planted)).toEqual([
      { path: "packages/core/src/domain/journal.ts", kind: "adapter-import", detail: "../parse/scenarios.js" },
      { path: "packages/core/src/domain/journal.ts", kind: "adapter-import", detail: "../render/markdown.js" },
      { path: "packages/core/src/domain/journal.ts", kind: "adapter-import", detail: "../assemble/renderInput.js" },
      { path: "packages/core/src/domain/journal.ts", kind: "adapter-import", detail: "../census/evidenceObligations.js" },
      { path: "packages/core/src/domain/ledger.ts", kind: "app-import", detail: "spec-controller/run-management/keptRun.js" },
      { path: "packages/core/src/domain/ledger.ts", kind: "app-import", detail: "../../../spec-controller/static-checks/featureCodes.js" },
      { path: "packages/core/src/domain/posting.ts", kind: "app-import", detail: "../../../spec-controller/render/markdown.js" },
    ]);
  });

  it("passes clean over the REAL packages/core/src/domain tree (the seam holds today)", () => {
    // The dogfood green, and this guard's only contact with the repository: any future stray
    // adapter or app import in a production domain file reds here.
    const domainFiles = collectSourceFiles(domainRoot(REPOSITORY_ROOT), REPOSITORY_ROOT);
    // Sanity: the tree was actually scanned, not an empty walk masquerading as green. This floor is
    // LOCAL and stays local — a different, much smaller population than the core-src one the other
    // two guards share, so their floor of 10 would be a constraint invented here (3F-2266).
    expect(domainFiles.length).toBeGreaterThan(0);
    expect(checkDomainPurity(domainFiles)).toEqual([]);
  });
});
