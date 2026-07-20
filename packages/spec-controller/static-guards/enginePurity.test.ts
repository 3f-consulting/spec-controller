/**
 * Unit test for the engine-purity static guard (@SCN-EPG-001).
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
 * Parent: @SCN-EPG-001 — the engine-purity static guard slice.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkEnginePurity, type EngineFile } from "./enginePurity.js";

const ENGINE_ROOT = join(process.cwd(), "packages", "core", "src");

/** Walk the real engine tree, collecting every PRODUCTION file (excluding *.test.ts). */
function collectEngineFiles(dir: string): EngineFile[] {
  const out: EngineFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectEngineFiles(abs));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push({ path: abs.slice(process.cwd().length + 1), source: readFileSync(abs, "utf8") });
    }
  }
  return out;
}

describe("[SCN-EPG-001] the reconciliation engine imports nothing impure and references no IO", () => {
  it("flags an engine file that imports from an impure sibling layer", () => {
    // Teeth (impure-import arm): an engine file reaching into the app layer must red.
    const planted: EngineFile[] = [
      { path: "packages/core/src/render/markdown.ts", source: `import { readEvidenceObligations } from "spec-controller/ingest/ingestQualityChecks.js";` },
      { path: "packages/core/src/assemble/report.ts", source: `import { keptRun } from "spec-controller/run-management/keptRun.js";` },
      { path: "packages/core/src/lib/featureCode.ts", source: `import { REGISTRY } from "../../../spec-controller/static-guards/featureCodes.js";` },
    ];
    const violations = checkEnginePurity(planted);
    expect(violations.map((v) => v.kind)).toEqual(["impure-import", "impure-import", "impure-import"]);
    expect(violations[0]?.detail).toBe("spec-controller/ingest/ingestQualityChecks.js");
  });

  it("flags an engine file that imports a node IO builtin", () => {
    // Teeth (io-import arm): fs / child_process / process imports drag IO into the engine.
    const planted: EngineFile[] = [
      { path: "a.ts", source: `import { readFileSync } from "node:fs";` },
      { path: "b.ts", source: `import { execFileSync } from "node:child_process";` },
      { path: "c.ts", source: `import process from "node:process";` },
    ];
    expect(checkEnginePurity(planted).map((v) => v.kind)).toEqual(["io-import", "io-import", "io-import"]);
  });

  it("flags an engine file that references the process global", () => {
    // Teeth (io-global arm): `process.cwd()` is IO with no import to catch.
    const planted: EngineFile[] = [{ path: "d.ts", source: `export const root = process.cwd();` }];
    const violations = checkEnginePurity(planted);
    expect(violations).toEqual([{ path: "d.ts", kind: "io-global", detail: "process" }]);
  });

  it("does NOT flag a doc-comment that merely names an IO token, nor an engine-internal import", () => {
    // The seam's real shape: engine-internal relative imports are fine, and a comment
    // naming process.cwd() (portablePath.ts does exactly this) must not false-positive.
    const clean: EngineFile[] = [
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
    const engineFiles = collectEngineFiles(ENGINE_ROOT);
    // Sanity: we actually scanned the tree (not an empty walk masquerading as green).
    expect(engineFiles.length).toBeGreaterThan(10);
    expect(checkEnginePurity(engineFiles)).toEqual([]);
  });
});
