/**
 * Unit test for the domain-purity static check (@SCN-DPG-001).
 *
 * Bidirectional evidence (Evidence Manifesto §9 / the discipline): the
 * describe/it strings carry the @SCN-DPG-001 id matching features/domain-purity.feature,
 * so a grep of the id returns both halves of the pair. `@unit`-only — Cucumber skips it;
 * this Vitest test IS the observed evidence, mirroring @SCN-EPG-001 exactly.
 *
 * Teeth are proven two ways: over PLANTED violating sources (each arm reds — an import from
 * an adapter layer parse/render/assemble/census, and an import of the spec-controller app
 * package), so a no-op checker fails the planted cases; then GREEN over the REAL
 * packages/core/src/domain tree — the dogfood assertion that the domain seam holds today.
 * Removing either detection branch in domainPurity.ts reds the corresponding planted case
 * (local-mutation teeth).
 *
 * Parent: @SCN-DPG-001 — the domain-purity static check slice (3F-2001, DDD retrofit Slice A).
 */

import { describe, it, expect } from "vitest";
import { checkDomainPurity } from "./domainPurity.js";
import { collectSourceFiles, CORE_SRC_ROOT, DOMAIN_ROOT, type CollectedFile } from "./sourceFiles.js";

/**
 * The production domain population, as of 3F-2266. Asserted, not assumed — see the pin below.
 *
 * NOTE the floor below stays LOCAL at `> 0` and does NOT read the shared
 * `MIN_CORE_SRC_FILES_SCANNED`. This guard walks the domain subtree, a different and much smaller
 * population than the ~22 files `noParallelStore` and `enginePurity` share; adopting their floor of
 * 10 would invent a constraint that does not exist and red this guard the moment the domain had
 * fewer than ten modules. The WALK is shared three ways; the FLOOR is shared two ways. The
 * asymmetry is the point, not an oversight.
 *
 * 8 → 11 at 3F-2872: the coded-fault split — `qualityCheckFault.ts` (the enum + union),
 * `qualityCheckFaultMessages.ts` (the prose catalogue) and `qualityCheckReconciliationFault.ts`
 * (the Error). Three modules rather than one because the catalogue keys on the enum and the Error
 * indexes the catalogue, so housing them together would close a runtime import cycle.
 *
 * 11 → 12 at 3F-2996: `checkCharacteristics.ts`, the portfolio's check-characteristic roster
 * (@SCN-CHR-001) — pure data plus one predicate, importing nothing, so it lands in the domain
 * beside `checkRegistry.ts` and this walk collects one more file.
 */
const DOMAIN_FILE_COUNT = 12;

describe("[SCN-DPG-001] a domain module imports only the domain layer and pure standard types", () => {
  it("flags a domain file that imports from an adapter layer (parse/render/assemble/census)", () => {
    // Teeth (adapter-import arm): a domain file reaching into any of the core's adapter layers
    // must red — the concept parses/renders/assembles/censuses nothing.
    const planted: CollectedFile[] = [
      { path: "packages/core/src/domain/qualityCheckReconciliation.ts", source: `import { renderMarkdown } from "../render/markdown.js";` },
      { path: "packages/core/src/domain/ledger.ts", source: `import { evidenceObligations } from "../census/evidenceObligations.js";` },
      { path: "packages/core/src/domain/scenarioReconciliation.ts", source: `import { parseScenarios } from "../parse/scenarios.js";` },
      { path: "packages/core/src/domain/journal.ts", source: `import { assembleRenderInput } from "../assemble/renderInput.js";` },
    ];
    const violations = checkDomainPurity(planted);
    expect(violations.map((v) => v.kind)).toEqual([
      "adapter-import",
      "adapter-import",
      "adapter-import",
      "adapter-import",
    ]);
    expect(violations.map((v) => v.detail)).toEqual([
      "../render/markdown.js",
      "../census/evidenceObligations.js",
      "../parse/scenarios.js",
      "../assemble/renderInput.js",
    ]);
  });

  it("flags a domain file that imports the spec-controller app package", () => {
    // Teeth (app-import arm): a domain file reaching into the app layer must red — the same
    // package boundary the engine-purity guard enforces one level up.
    const planted: CollectedFile[] = [
      { path: "packages/core/src/domain/ledger.ts", source: `import { keptRun } from "spec-controller/run-management/keptRun.js";` },
      { path: "packages/core/src/domain/journal.ts", source: `import { REGISTRY } from "../../../spec-controller/static-checks/featureCodes.js";` },
    ];
    const violations = checkDomainPurity(planted);
    expect(violations.map((v) => v.kind)).toEqual(["app-import", "app-import"]);
    expect(violations[0]?.detail).toBe("spec-controller/run-management/keptRun.js");
  });

  it("does NOT flag a domain-internal import nor an import of the model / provenance / lib roots", () => {
    // The seam's real shape: a domain module imports its sibling domain modules (and the
    // pure aggregation roots — model.js, provenance, lib) freely. Only the ADAPTER layers and
    // the APP package are forbidden.
    const clean: CollectedFile[] = [
      {
        path: "packages/core/src/domain/ledger.ts",
        source: `import type { Outcome } from "./qualityCheckReconciliation.js";\nimport type { ScenarioReconciliation } from "./scenarioReconciliation.js";\nexport const y = 1;`,
      },
    ];
    expect(checkDomainPurity(clean)).toEqual([]);
  });

  it("passes clean over the REAL packages/core/src/domain tree (the seam holds today)", () => {
    // The dogfood green: the domain is pure; any future stray adapter or app import in a
    // production domain file reds this.
    const domainFiles = collectSourceFiles(DOMAIN_ROOT);
    // Sanity: we actually scanned the tree (not an empty walk masquerading as green). This floor is
    // LOCAL and stays local — a different population from the core-src one the other two guards
    // share (3F-2266).
    expect(domainFiles.length).toBeGreaterThan(0);
    expect(checkDomainPurity(domainFiles)).toEqual([]);
  });

  it("[SCN-DPG-001] the shared collector walks exactly the domain population, not the whole engine", () => {
    // The most plausible way this refactor could go wrong: pass the WRONG ROOT and collect all of
    // core/src instead of just domain/.
    //
    // The assertion above DOES catch that — verified by plant, not assumed: swapping DOMAIN_ROOT
    // for CORE_SRC_ROOT there reds it with 21 `adapter-import` violations. But look at what that
    // red SAYS. It reports "the domain imports adapters" — a false and alarming diagnosis — when
    // the truth is "the walk collected the wrong tree". That is the cries-wolf failure 3F-2201 was
    // raised about, one layer up: a red whose stated cause is not its actual cause sends the reader
    // hunting a purity violation that does not exist.
    //
    // This pin exists to name the real fault first and unambiguously.
    const domainFiles = collectSourceFiles(DOMAIN_ROOT);
    expect(domainFiles).toHaveLength(DOMAIN_FILE_COUNT);
    expect(domainFiles.every((f) => f.path.startsWith("packages/core/src/domain/"))).toBe(true);
    // Scoped, not the whole tree: the same collector over the engine root returns strictly more.
    expect(collectSourceFiles(CORE_SRC_ROOT).length).toBeGreaterThan(domainFiles.length);
  });
});
