import { afterAll, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBalanceCaptured } from "../../test-support/runBalance.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-STG-018] runBalance over a duplicated @SCN exits 1 with the report in full, never refusing the corpus", () => {
  function duplicateTarget(withDuplicate = true): string {
    const dir = mkdtempSync(join(tmpdir(), "scn-stg-018-unit-"));
    made.push(dir);
    mkdirSync(join(dir, "features"));
    writeFileSync(
      join(dir, "features", "dup.feature"),
      "@DUP\nFeature: dup\n\n  @unit @SCN-DUP-001\n  Scenario: first\n    Given a thing\n\n" +
        (withDuplicate ? "  @unit @SCN-DUP-001\n  Scenario: second\n    Given a thing\n\n" : "") +
        "  @unit @SCN-DUP-002\n  Scenario: its own\n    Given a thing\n"
    );
    writeFileSync(
      join(dir, "vitest.json"),
      JSON.stringify({
        testResults: [
          {
            name: "dup.test.ts",
            assertionResults: [
              { fullName: "[SCN-DUP-001] proven", status: "passed" },
              { fullName: "[SCN-DUP-002] proven", status: "passed" },
            ],
          },
        ],
      })
    );
    writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
    writeFileSync(join(dir, "package.json"), "{}\n");
    return dir;
  }

  function ownRowOf(dir: string): unknown {
    const { stdout } = runBalanceCaptured(["--features", join(dir, "features"), "--vitest", join(dir, "vitest.json"), "--format", "json"]);
    const rows = JSON.parse(stdout).ledger.scenarioReconciliations as { scnId: string }[];
    return rows.find((r) => r.scnId === "SCN-DUP-002");
  }

  it("emits the whole report, reconciles the other account, and sets process.exitCode = 1", () => {
    const dir = duplicateTarget();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", join(dir, "features"),
      "--vitest", join(dir, "vitest.json"),
      "--ci", join(dir, "ci.yml"),
      "--package-json", join(dir, "package.json"),
      "--format", "json",
    ]);
    const report = JSON.parse(stdout);
    const rows = report.ledger.scenarioReconciliations as { scnId: string; verdict: string }[];
    expect(rows.filter((r) => r.scnId === "SCN-DUP-001")).toHaveLength(1);
    expect(rows.find((r) => r.scnId === "SCN-DUP-002")?.verdict).toBe("balanced");
    expect(exitCode).toBe(1);
    expect(stderr).not.toMatch(/names the same @SCN on more than one scenario/);
    expect(ownRowOf(dir)).toEqual(ownRowOf(duplicateTarget(false)));
  });
});

describe("[SCN-STG-028] a prose mention of a feature part outside two to five characters is not an @SCN seen in non-tag context", () => {
  it("counts the two- and five-character prose mentions as excluded, and lists no scenario code error", () => {
    const dir = mkdtempSync(join(tmpdir(), "scn-stg-028-unit-"));
    made.push(dir);
    mkdirSync(join(dir, "features"));
    writeFileSync(
      join(dir, "features", "own.feature"),
      "@OWN\nFeature: own\n\n  @unit @SCN-OWN-001\n  Scenario: own scenario\n" +
        "    Given the prose mentions @SCN-A-001 and @SCN-AB-001\n" +
        "    # and a comment mentions @SCN-FIVEC-001 and @SCN-SIXCHR-001\n    And a thing\n"
    );
    const { stdout } = runBalanceCaptured(["--features", join(dir, "features"), "--format", "json"]);
    const report = JSON.parse(stdout);
    expect(report.evidenceObligations.excludedOccurrences).toBe(2);
    expect(report.scenarioCodeErrors ?? []).toEqual([]);
  });
});
