/**
 * Unit test for the engine-purity static check (@SCN-EPG-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9 / the discipline): the
 * describe/it strings carry the @SCN-EPG-001 id matching features/engine-purity.feature,
 * so a grep of the id returns both halves of the pair. `@unit`-only — Cucumber skips it;
 * this Vitest test IS the observed evidence.
 *
 * Teeth are proven two ways: over PLANTED violating sources (each arm reds — an
 * impure-layer import, a node IO import, a `process.` reference), so a no-op checker
 * fails the planted cases; then GREEN over the REAL `packages/core/src` tree —
 * the dogfood assertion that the seam holds today. Removing either detection branch in
 * enginePurity.ts reds the corresponding planted case (local-mutation teeth).
 *
 * Parent: @SCN-EPG-001 — the engine-purity static check slice.
 */

import { describe, it, expect } from "vitest";
import { checkEnginePurity } from "./enginePurity.js";
import {
  collectSourceFiles,
  CORE_SRC_ROOT,
  DOMAIN_ROOT,
  MIN_CORE_SRC_FILES_SCANNED,
  type CollectedFile,
} from "./sourceFiles.js";

/**
 * The production core-src population, as of 3F-2368 (lib/scnCitation.ts). Asserted, not assumed — see the pin below.
 *
 * The engine root IS `CORE_SRC_ROOT`: this guard and `noParallelStore` walk the SAME population,
 * which is exactly why they may share a floor. `domainPurity` walks a smaller subtree and keeps its
 * own floor; the asymmetry is deliberate.
 */
const CORE_SRC_FILE_COUNT = 23;

describe("[SCN-EPG-001] the reconciliation engine imports nothing impure and references no IO", () => {
  it("flags an engine file that imports from an impure sibling layer", () => {
    // Teeth (impure-import arm): an engine file reaching into the app layer must red.
    const planted: CollectedFile[] = [
      { path: "packages/core/src/render/markdown.ts", source: `import { readEvidenceObligations } from "spec-controller/ingest/ingestQualityChecks.js";` },
      { path: "packages/core/src/assemble/report.ts", source: `import { keptRun } from "spec-controller/run-management/keptRun.js";` },
      { path: "packages/core/src/lib/featureCode.ts", source: `import { REGISTRY } from "../../../spec-controller/static-checks/featureCodes.js";` },
    ];
    const violations = checkEnginePurity(planted);
    expect(violations.map((v) => v.kind)).toEqual(["impure-import", "impure-import", "impure-import"]);
    expect(violations[0]?.detail).toBe("spec-controller/ingest/ingestQualityChecks.js");
  });

  it("flags an engine file that imports a node IO builtin", () => {
    // Teeth (io-import arm): fs / child_process / process imports drag IO into the engine.
    const planted: CollectedFile[] = [
      { path: "a.ts", source: `import { readFileSync } from "node:fs";` },
      { path: "b.ts", source: `import { execFileSync } from "node:child_process";` },
      { path: "c.ts", source: `import process from "node:process";` },
    ];
    expect(checkEnginePurity(planted).map((v) => v.kind)).toEqual(["io-import", "io-import", "io-import"]);
  });

  it("flags an engine file that references the process global", () => {
    // Teeth (io-global arm): `process.cwd()` is IO with no import to catch.
    const planted: CollectedFile[] = [{ path: "d.ts", source: `export const root = process.cwd();` }];
    const violations = checkEnginePurity(planted);
    expect(violations).toEqual([{ path: "d.ts", kind: "io-global", detail: "process" }]);
  });

  it("does NOT flag a doc-comment that merely names an IO token, nor an engine-internal import", () => {
    // The seam's real shape: engine-internal relative imports are fine, and a comment
    // naming process.cwd() (portablePath.ts does exactly this) must not false-positive.
    const clean: CollectedFile[] = [
      {
        path: "packages/core/src/lib/portablePath.ts",
        source: `/* No IO: the caller provides the run root (the IO — process.cwd() — stays at\n * the caller). */\nimport { x } from "../model.js";\nimport { featureCodeOf } from "./featureCode.js";\nexport const y = 1;`,
      },
    ];
    expect(checkEnginePurity(clean)).toEqual([]);
  });

  it("passes clean over the REAL packages/core/src tree (the seam holds today)", () => {
    // The dogfood green: the engine is pure; any future stray import or IO
    // reference in a production engine file reds this.
    const engineFiles = collectSourceFiles(CORE_SRC_ROOT);
    // Sanity: we actually scanned the tree (not an empty walk masquerading as green). The floor is
    // the SHARED one — this guard and noParallelStore walk the same population, so a bare literal
    // here would be a second copy of the same rule, drifting the moment either is retuned (3F-2266).
    expect(engineFiles.length).toBeGreaterThan(MIN_CORE_SRC_FILES_SCANNED);
    expect(checkEnginePurity(engineFiles)).toEqual([]);
  });

  it("[SCN-EPG-001] the shared collector walks exactly the core-src production population", () => {
    // Pinned because the purity claim is only as wide as the set it was checked over: a walk that
    // silently collected fewer files would leave this guard green while proving less than it says,
    // and nothing else in this file would notice. The count was NOT asserted here before 3F-2266.
    //
    // Green on both sides of that change — it is a characterisation pin, not the driver of the
    // refactor, and its teeth come from a plant rather than from having once been red.
    const engineFiles = collectSourceFiles(CORE_SRC_ROOT);
    expect(engineFiles).toHaveLength(CORE_SRC_FILE_COUNT);
    // It DISCRIMINATES by root: the same collector over the domain subtree returns strictly fewer.
    // A collector that ignored its argument would satisfy every other assertion in this file.
    expect(collectSourceFiles(DOMAIN_ROOT).length).toBeLessThan(engineFiles.length);
  });
});
