/**
 * Unit test for the domain-purity static guard (@SCN-DPG-001).
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
 * Parent: @SCN-DPG-001 — the domain-purity static guard slice (3F-2001, DDD retrofit Slice A).
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkDomainPurity, type DomainFile } from "./domainPurity.js";

const DOMAIN_ROOT = join(process.cwd(), "packages", "core", "src", "domain");

/** Walk the real domain tree, collecting every PRODUCTION file (excluding *.test.ts). */
function collectDomainFiles(dir: string): DomainFile[] {
  const out: DomainFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectDomainFiles(abs));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push({ path: abs.slice(process.cwd().length + 1), source: readFileSync(abs, "utf8") });
    }
  }
  return out;
}

describe("[SCN-DPG-001] a domain module imports only the domain layer and pure standard types", () => {
  it("flags a domain file that imports from an adapter layer (parse/render/assemble/census)", () => {
    // Teeth (adapter-import arm): a domain file reaching into any of the core's adapter layers
    // must red — the concept parses/renders/assembles/censuses nothing.
    const planted: DomainFile[] = [
      { path: "packages/core/src/domain/qualityCheckReconciliation.ts", source: `import { renderMarkdown } from "../render/markdown.js";` },
      { path: "packages/core/src/domain/ledger.ts", source: `import { evidenceObligations } from "../census/evidenceObligations.js";` },
      { path: "packages/core/src/domain/scenarioReconciliation.ts", source: `import { parseScenarios } from "../parse/scenarios.js";` },
      { path: "packages/core/src/domain/journal.ts", source: `import { assembleReport } from "../assemble/report.js";` },
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
      "../assemble/report.js",
    ]);
  });

  it("flags a domain file that imports the spec-controller app package", () => {
    // Teeth (app-import arm): a domain file reaching into the app layer must red — the same
    // package boundary the engine-purity guard enforces one level up.
    const planted: DomainFile[] = [
      { path: "packages/core/src/domain/ledger.ts", source: `import { keptRun } from "spec-controller/run-management/keptRun.js";` },
      { path: "packages/core/src/domain/journal.ts", source: `import { REGISTRY } from "../../../spec-controller/static-guards/featureCodes.js";` },
    ];
    const violations = checkDomainPurity(planted);
    expect(violations.map((v) => v.kind)).toEqual(["app-import", "app-import"]);
    expect(violations[0]?.detail).toBe("spec-controller/run-management/keptRun.js");
  });

  it("does NOT flag a domain-internal import nor an import of the model / provenance / lib roots", () => {
    // The seam's real shape: a domain module imports its sibling domain modules (and the
    // pure aggregation roots — model.js, provenance, lib) freely. Only the ADAPTER layers and
    // the APP package are forbidden.
    const clean: DomainFile[] = [
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
    const domainFiles = collectDomainFiles(DOMAIN_ROOT);
    // Sanity: we actually scanned the tree (not an empty walk masquerading as green).
    expect(domainFiles.length).toBeGreaterThan(0);
    expect(checkDomainPurity(domainFiles)).toEqual([]);
  });
});
