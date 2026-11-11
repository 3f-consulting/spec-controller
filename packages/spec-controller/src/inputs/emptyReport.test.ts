import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runBalanceCaptured } from "../commands/runBalance.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe("an empty evidence report will count as no evidence, not as a broken file", () => {
  it("[CLM-CLI-146] a Vitest evidence report written well formed, listing no tests", () => {
    const dir = temporaryDirectory("empty-vitest-report-");
    const features = join(dir, "features");
    mkdirSync(features);
    writeFileSync(join(features, "a.feature"), "Feature: a\n\n  Rule: r\n    @unit @CLM-ABC-001\n    Scenario: a claim\n      Given a step\n");
    const ci = join(dir, "ci.yml");
    writeFileSync(ci, "jobs: {}\n");
    const vitest = join(dir, "vitest.json");
    writeFileSync(vitest, '{"testResults":[]}');

    const withEmptyReport = runBalanceCaptured(["--features", features, "--ci", ci, "--vitest", vitest, "--format", "json"]);
    const withNoReport = runBalanceCaptured(["--features", features, "--ci", ci, "--format", "json"]);

    expect(withEmptyReport.stderr).toBe("");
    expect(withEmptyReport.exitCode).not.toBe(2);
    expect(withEmptyReport.exitCode).toBe(withNoReport.exitCode);
    const reconciliationsOf = (stdout: string): unknown => (JSON.parse(stdout) as { claimReconciliations: unknown }).claimReconciliations;
    expect(reconciliationsOf(withEmptyReport.stdout)).toEqual(reconciliationsOf(withNoReport.stdout));
  });
});
