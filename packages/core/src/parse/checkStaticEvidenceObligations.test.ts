/**
 * Unit tests for the ingest/guard reader (src/ingest/guard.ts) — the DEMANDED-obligation
 * observer (the watermelon input). The running-guard observer (`runningStaticGuards`) is
 * pinned in src/ingest/ciGuards.test.ts; the shared CI-parse primitive both use lives in
 * src/ingest/ciCommands.ts.
 *
 * These pin the CORRECTNESS-critical parse: a mis-read could itself hide a
 * watermelon (read a wired guard as unwired, or the reverse). So the reader must
 * parse the CI YAML structurally (jobs → steps →
 * run), handling block-scalar `run:`, package-manager invocation forms, and
 * `if:`-gated / matrix steps without crashing — NOT line-scan.
 *
 * Helper-level coverage for the seam this sub-issue carries (alongside the
 * @SCN-LNT-001 reconcile test); not @SCN-tagged.
 */

import { describe, it, expect } from "vitest";
import { checkStaticEvidenceObligations } from "./checkStaticEvidenceObligations.js";
import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";

const pkg: PackageJsonScripts = {
  scripts: {
    "lint:feature-codes": "tsx src/spec/lintFeatureCodesCli.ts",
    "lint:scn-subissues": "tsx src/spec/lintScnSubIssuesCli.ts",
    test: "vitest run",
  },
};

describe("checkStaticEvidenceObligations — the static-guard enforcement reader", () => {
  it("reports a guard whose command is a CI run step as enforced over real source", () => {
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Lint feature codes",
      "        run: pnpm lint:feature-codes",
    ].join("\n");

    expect(checkStaticEvidenceObligations(["lint:feature-codes"], ci, pkg)).toEqual([
      {
        qualityCheck: "lint",
        staticGuard: "lint:feature-codes",
        exists: true,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("reports a guard that exists as a script but is NOT a CI run step as exists-but-unenforced (the watermelon precursor)", () => {
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Test",
      "        run: pnpm test",
    ].join("\n");

    expect(checkStaticEvidenceObligations(["lint:feature-codes"], ci, pkg)).toEqual([
      {
        qualityCheck: "lint",
        staticGuard: "lint:feature-codes",
        exists: true,
        enforcedOverRealSource: false,
      },
    ]);
  });

  it("reports a guard with no matching package.json script as not existing", () => {
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - run: pnpm lint:nonexistent",
    ].join("\n");

    expect(checkStaticEvidenceObligations(["lint:nonexistent"], ci, pkg)).toEqual([
      {
        qualityCheck: "lint",
        staticGuard: "lint:nonexistent",
        exists: false,
        enforcedOverRealSource: true,
      },
    ]);
  });

  it("finds the guard's command inside a multi-line block-scalar run step (structural parse, not line-scan)", () => {
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Combined checks",
      "        run: |",
      "          pnpm typecheck",
      "          pnpm lint:feature-codes",
      "          pnpm test",
    ].join("\n");

    expect(checkStaticEvidenceObligations(["lint:feature-codes"], ci, pkg)[0]?.enforcedOverRealSource).toBe(
      true
    );
  });

  it("recognises the `npm run <guard>` invocation form", () => {
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - run: npm run lint:feature-codes",
    ].join("\n");

    expect(checkStaticEvidenceObligations(["lint:feature-codes"], ci, pkg)[0]?.enforcedOverRealSource).toBe(
      true
    );
  });

  it("parses if-gated and matrix steps without crashing", () => {
    const ci = [
      "jobs:",
      "  ci:",
      "    strategy:",
      "      matrix:",
      "        node: [20, 22]",
      "    steps:",
      "      - name: Conditional",
      "        if: github.event_name == 'pull_request'",
      "        run: pnpm lint:scn-subissues",
      "      - name: Lint feature codes",
      "        run: pnpm lint:feature-codes",
    ].join("\n");

    expect(checkStaticEvidenceObligations(["lint:feature-codes"], ci, pkg)[0]?.enforcedOverRealSource).toBe(
      true
    );
  });

  it("does not confuse one guard for another (exact script-name match, no fuzzy substring)", () => {
    const ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - run: pnpm lint:scn-subissues",
    ].join("\n");

    // lint:feature-codes is NOT wired here (only lint:scn-subissues is); a fuzzy
    // "contains lint" match would falsely enforce it and hide a watermelon.
    expect(checkStaticEvidenceObligations(["lint:feature-codes"], ci, pkg)[0]?.enforcedOverRealSource).toBe(
      false
    );
  });
});
