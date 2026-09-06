/**
 * Unit test for the engine-purity static check (@SCN-EPG-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9 / the discipline): the
 * describe/it strings carry the @SCN-EPG-001 id matching features/engine-purity.feature,
 * so a grep of the id returns both halves of the pair. `@unit`-only — Cucumber skips it;
 * this Vitest test IS the observed evidence.
 *
 * Teeth are proven two ways: over PLANTED violating sources (each arm reds — an
 * impure-layer import, an import of the relocated check tree, a node IO import, a `process.`
 * reference), so a no-op checker fails the planted cases; then GREEN over the REAL
 * `packages/core/src` tree — the dogfood assertion that the seam holds today. Removing either
 * detection branch in enginePurity.ts reds the corresponding planted case (local-mutation teeth).
 *
 * THE CHECK-TREE CASE IS THE ONE THAT WAS MISSING, AND IT WAS MISSING BECAUSE IT COULD NOT EXIST
 * (3F-3188). Every check module used to live under the `spec-controller` app package, so the
 * package match refused them without naming them; 3F-3187 moved them to `tests/checks/` and took
 * them out of that name. The planted case below is the fault demonstrated rather than argued —
 * it passed against the pre-3F-3188 checker, which is the whole reason this scenario is an Update.
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
 * The production core-src population, as of 3F-2689 (render/measuredItem.ts; 3F-2683's parse/measurements.ts, 3F-2682's domain/thresholds.ts — the measured fitness
 * check's ceiling registry).
 * Asserted, not assumed — see the pin below.
 *
 * The engine root IS `CORE_SRC_ROOT`: this guard and `noParallelStore` walk the SAME population,
 * which is exactly why they may share a floor. `domainPurity` walks a smaller subtree and keeps its
 * own floor; the asymmetry is deliberate.
 *
 * 28 → 31 at 3F-2872: the domain's three coded-fault modules (`qualityCheckFault.ts`,
 * `qualityCheckFaultMessages.ts`, `qualityCheckReconciliationFault.ts`).
 *
 * 31 → 32 at 3F-2976: `lib/bareTerm.ts`, the ONE reading of what a term bare is, lifted out of the
 * seven files that each spelled it for themselves (@SCN-TRM-001). The floor moves because the
 * population did — the walk collects one more production file, which is the fact this count exists
 * to make loud.
 *
 * 32 → 33 at 3F-2996: `domain/checkCharacteristics.ts`, the portfolio's check-characteristic roster
 * — the vendored export naming the words the portfolio carries. The floor moves because the
 * population did. The file stays; what left at 3F-3167 is the GATE that read it, so the
 * scenario this line used to cite is gone and the ticket handle is what remains citable.
 *
 * 33 → 34 at 3F-3087: `parse/targetManifest.ts`, the `resolve*` family that reads a target's
 * `specController.*` configuration into the registries the reconciler takes — moved in from the
 * app's ingest edge, where it was the reason a PUBLISHED module imported core's unpublished
 * `/internal` subpath (3F-3086). The floor moves because the population did.
 *
 * 34 → 35 at 3F-3088: `parse/targetCorpus.ts`, the corpus read that composes a target's feature
 * sources into the obligations they raise and the `@SCN` each check run cites — moved in from the
 * same ingest edge and for the same reason, carrying five more of that subpath's symbols off the
 * published path. The floor moves because the population did.
 *
 * 35 → 36 at 3F-3089: `assemble/evidenceReconciliationFromSources.ts`, the reconcile composition
 * itself — the ONE entry point the frozen v1 barrel gains (@SCN-API-001), which is what takes the
 * last `/internal` import off the published path and makes the installed binary start. The floor
 * moves because the population did.
 *
 * 36 → 37 at 3F-3140: `domain/fitnessChecks.ts`, the CONFIGURED ROWS a converted fitness check is
 * read from (@SCN-LNT-018) — the debit side's third injected registry, beside the check registry
 * and the authored ceilings. The floor moves because the population did.
 */
const CORE_SRC_FILE_COUNT = 38;

describe("[SCN-EPG-001] the reconciliation engine imports nothing impure and references no IO", () => {
  it("flags an engine file that imports from an impure sibling layer", () => {
    // Teeth (impure-import arm): an engine file reaching into the app layer must red.
    const planted: CollectedFile[] = [
      { path: "packages/core/src/render/markdown.ts", source: `import { readEvidenceObligations } from "spec-controller/ingest/ingestQualityChecks.js";` },
      { path: "packages/core/src/assemble/report.ts", source: `import { keptRun } from "spec-controller/run-management/keptRun.js";` },
      { path: "packages/core/src/lib/featureCode.ts", source: `import { runBalance } from "../../../spec-controller/src/cli-balance/cli.js";` },
    ];
    const violations = checkEnginePurity(planted);
    expect(violations.map((v) => v.kind)).toEqual(["impure-import", "impure-import", "impure-import"]);
    expect(violations[0]?.detail).toBe("spec-controller/ingest/ingestQualityChecks.js");
  });

  it("flags an engine file that imports the relocated check tree", () => {
    // Teeth (impure-import arm, second term): check code left the app package at 3F-3187, so the
    // package match no longer reaches it. THIS CASE PASSED before 3F-3188 widened the rule — the
    // engine could have imported a check module with the scenario staying green, and this arm is
    // what makes that impossible again. Both spellings a core file could reach it by are planted:
    // the relative escape a real import would use, and the bare repo-relative form.
    const planted: CollectedFile[] = [
      { path: "packages/core/src/lib/featureCode.ts", source: `import { checkAnemicDomain } from "../../../../tests/checks/anemicDomain.js";` },
      { path: "packages/core/src/parse/targetManifest.ts", source: `export { deriveLocalLadder } from "tests/checks/localLadder.js";` },
    ];
    const violations = checkEnginePurity(planted);
    expect(violations.map((v) => v.kind)).toEqual(["impure-import", "impure-import"]);
    expect(violations[0]?.detail).toBe("../../../../tests/checks/anemicDomain.js");
  });

  it("does NOT flag a specifier that merely CONTAINS the check tree's words", () => {
    // The boundary the pattern buys, asserted rather than assumed: `tests/checks` is refused where
    // a path separator or the specifier's end brackets it, never as a substring. Without this the
    // arm above would be satisfied by a bare `.includes`, which would red a legitimate neighbour.
    const clean: CollectedFile[] = [
      { path: "packages/core/src/model.ts", source: `import { x } from "../my-tests/checks-ui/panel.js";` },
    ];
    expect(checkEnginePurity(clean)).toEqual([]);
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
