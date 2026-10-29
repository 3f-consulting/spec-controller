import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runBalanceCaptured } from "../../test-support/runBalance.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

// A whole balance run takes longer than Vitest's default limit.
const wholeRun = { timeout: 30_000 };

describe("[SCN-CLI-093] runBalance over a duplicated @SCN exits 1 with the report in full, never refusing the corpus", () => {
  function duplicateTarget(withDuplicate = true): string {
    const dir = temporaryDirectory("scn-stg-018-unit-");
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
    const rows = JSON.parse(stdout).ledger.claimReconciliations as { scnId: string }[];
    return rows.find((r) => r.scnId === "SCN-DUP-002");
  }

  it("emits the whole report, reconciles the other account, and sets process.exitCode = 1", wholeRun, () => {
    const dir = duplicateTarget();
    const { stdout, stderr, exitCode } = runBalanceCaptured([
      "--features", join(dir, "features"),
      "--vitest", join(dir, "vitest.json"),
      "--ci", join(dir, "ci.yml"),
      "--package-json", join(dir, "package.json"),
      "--format", "json",
    ]);
    const report = JSON.parse(stdout);
    const rows = report.ledger.claimReconciliations as { scnId: string; verdict: string }[];
    expect(rows.filter((r) => r.scnId === "SCN-DUP-001")).toHaveLength(1);
    expect(rows.find((r) => r.scnId === "SCN-DUP-002")?.verdict).toBe("balanced");
    expect(exitCode).toBe(1);
    expect(stderr).not.toMatch(/names the same @SCN on more than one scenario/);
    expect(ownRowOf(dir)).toEqual(ownRowOf(duplicateTarget(false)));
  });
});

describe("[SCN-CLI-094] a prose mention of a feature part outside two to five characters is not an @SCN seen in non-tag context", () => {
  it("counts the two- and five-character prose mentions as excluded, and lists no scenario code error", wholeRun, () => {
    const dir = temporaryDirectory("scn-stg-028-unit-");
    mkdirSync(join(dir, "features"));
    writeFileSync(
      join(dir, "features", "own.feature"),
      "@OWN\nFeature: own\n\n  @unit @SCN-OWN-001\n  Scenario: own scenario\n" +
        "    Given the prose mentions @SCN-A-001 and @SCN-AB-001\n" +
        "    # and a comment mentions @SCN-FIVEC-001 and @SCN-SIXCHR-001\n    And a thing\n"
    );
    const { stdout } = runBalanceCaptured(["--features", join(dir, "features"), "--format", "json"]);
    const report = JSON.parse(stdout);
    expect(report.scenarioCodes.excludedOccurrences).toBe(2);
    expect(report.errors).toBeUndefined();
  });
});

describe("[SCN-CLI-095] a scenario tagged with two scenario codes raises no evidence obligation under either, and is listed as a scenario code error naming both", () => {
  function target(ids: string): string {
    const dir = temporaryDirectory("scn-stg-029-unit-");
    mkdirSync(join(dir, "features"));
    writeFileSync(
      join(dir, "features", "two.feature"),
      "@TWO\nFeature: two\n\n  @unit @SCN-TWO-001\n  Scenario: its own\n    Given a thing\n\n" +
        `  @unit ${ids}\n  Scenario: carries codes\n    Given a thing\n`
    );
    writeFileSync(
      join(dir, "vitest.json"),
      JSON.stringify({
        testResults: [
          {
            name: "two.test.ts",
            assertionResults: [
              { fullName: "[SCN-TWO-001] proven", status: "passed" },
              { fullName: "[SCN-TWO-002] proven", status: "passed" },
            ],
          },
        ],
      })
    );
    writeFileSync(join(dir, "ci.yml"), "jobs: {}\n");
    writeFileSync(join(dir, "package.json"), "{}\n");
    return dir;
  }

  function balance(dir: string, format: "json" | "md") {
    return runBalanceCaptured([
      "--features", join(dir, "features"),
      "--vitest", join(dir, "vitest.json"),
      "--ci", join(dir, "ci.yml"),
      "--package-json", join(dir, "package.json"),
      "--format", format,
    ]);
  }

  type Row = { scnId: string; kind: string; verdict: string };

  it("opens no account under either code, so a test citing one reads as citing an unknown scenario, and counts nothing untagged", wholeRun, () => {
    const report = JSON.parse(balance(target("@SCN-TWO-002 @SCN-TWO-003"), "json").stdout);
    const rows = report.ledger.claimReconciliations as Row[];
    expect(rows.filter((r) => r.kind === "scenario").map((r) => r.scnId)).toEqual(["SCN-TWO-001"]);
    expect(rows.find((r) => r.scnId === "SCN-TWO-002")?.kind).toBe("phantom-claim");
    expect(rows.find((r) => r.scnId === "SCN-TWO-003")).toBeUndefined();
    expect(report.scenarioCodes.untaggedScenarios).toEqual([]);
  });

  it("lists several-scn-codes in the JSON and under Scenario code errors, naming the file, the scenario and both codes, and exits 1", wholeRun, () => {
    const dir = target("@SCN-TWO-002 @SCN-TWO-003");
    const json = balance(dir, "json");
    expect(JSON.parse(json.stdout).errors.scenarioCodes).toEqual([
      expect.objectContaining({
        kind: "several-scn-codes",
        files: ["two.feature"],
        scenario: "carries codes",
        codes: ["SCN-TWO-002", "SCN-TWO-003"],
      }),
    ]);
    expect(json.exitCode).toBe(1);

    const md = balance(dir, "md");
    const section = md.stdout.split("## Scenario code errors")[1]?.split("\n## ")[0] ?? "";
    const lines = section.split("\n").filter((line) => line.startsWith("- `several-scn-codes` — "));
    expect(lines).toHaveLength(1);
    for (const named of ["two.feature", "carries codes", "SCN-TWO-002", "SCN-TWO-003"]) {
      expect(lines[0]).toContain(named);
    }
    expect(md.exitCode).toBe(1);
  });

  it("reconciles a scenario with one code as today, listing no scenario code error", wholeRun, () => {
    const json = balance(target("@SCN-TWO-002"), "json");
    const report = JSON.parse(json.stdout);
    const row = (report.ledger.claimReconciliations as Row[]).find((r) => r.scnId === "SCN-TWO-002");
    expect(row).toMatchObject({ kind: "scenario", verdict: "balanced" });
    expect(report.errors).toBeUndefined();
    expect(json.exitCode).toBe(0);
  });
});
