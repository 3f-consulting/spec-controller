import { afterAll, describe, it, expect } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBalance, sourceTarget } from "./cli.js";
import { runBalanceCaptured } from "../../test-support/runBalance.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("[SCN-RPT-001] sourceTarget sources the provenance target from --target verbatim", () => {
  it("returns the --target value verbatim when given", () => {
    expect(sourceTarget({ target: "an-adopters-repository" })).toBe("an-adopters-repository");
    expect(sourceTarget({ target: "some/scoped-name" })).toBe("some/scoped-name");
  });

  it("defaults to unknown-target when --target is omitted", () => {
    expect(sourceTarget({})).toBe("unknown-target");
  });
});

describe("[SCN-RPT-002] the JSON report carries a provenance object", () => {
  it("runBalance's written JSON states the Cucumber report and the CI step record among its inputs, and reads the Cucumber report's scenario as an integration evidence observation", () => {
    const dir = mkdtempSync(join(tmpdir(), "scn-rpt-002-unit-"));
    made.push(dir);
    cpSync("tests/fixtures/evidence-observation/features", join(dir, "features"), { recursive: true });
    cpSync("tests/fixtures/evidence-observation/cucumber.json", join(dir, "cucumber.json"));
    cpSync("tests/fixtures/rpt-streams/ci-steps.json", join(dir, "ci-steps.json"));
    mkdirSync(join(dir, "workflows"));
    writeFileSync(join(dir, "workflows", "ci.yml"), "jobs: {}\n");
    const reportPath = join(dir, "spec-reconciliation.json");
    const savedExitCode = process.exitCode;
    try {
      runBalance([
        "--features", join(dir, "features"),
        "--ci", join(dir, "workflows"),
        "--cucumber", join(dir, "cucumber.json"),
        "--ci-steps", join(dir, "ci-steps.json"),
        "--format", `json:${reportPath}`,
      ]);
    } finally {
      process.exitCode = savedExitCode;
    }

    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    const integrationRow = report.ledger.scenarioReconciliations.find(
      (row: { scnId: string }) => row.scnId === "SCN-TGT-002",
    );
    expect({ inputs: report.runProvenance.inputs, observations: integrationRow?.evidenceObservations }).toEqual({
      inputs: { features: "features", cucumber: "cucumber.json", ci: "workflows", ciSteps: "ci-steps.json" },
      observations: [
        { qualityCheck: "integration", scnId: "SCN-TGT-002", status: "passed", locator: "features/widget.feature" },
      ],
    });
  });
});

describe("[SCN-RPT-031] a feature file's scenarios carrying no @SCN code count together on one row named by that file", () => {
  function byFeatureRows(md: string): string[][] {
    const section = md.slice(md.indexOf("### Out-of-balance by feature"));
    const end = section.indexOf("\n#", 1);
    return (end > 0 ? section.slice(0, end) : section)
      .split("\n")
      .filter((line) => line.startsWith("| ") && !line.startsWith("| Feature ") && !line.startsWith("| ---"))
      .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  }

  function stdoutOf(argv: string[]): string {
    return runBalanceCaptured(argv).stdout;
  }

  it("writes one row named by the file read off the feature files, and renders it again the same from the saved JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "scn-rpt-031-unit-"));
    made.push(dir);
    mkdirSync(join(dir, "features"));
    writeFileSync(
      join(dir, "features", "checkout.feature"),
      "Feature: checkout\n\n  Scenario: pay by card\n    Given a basket\n\n" +
        "  Scenario: pay by voucher\n    Given a basket\n\n  Scenario: pay on account\n    Given a basket\n"
    );
    const saved = join(dir, "report.json");
    const written = stdoutOf(["--features", join(dir, "features"), "--format", "md", "--format", `json:${saved}`]);
    expect(byFeatureRows(written)).toEqual([["checkout.feature", "3", "3 with no `@SCN` code"]]);
    expect(stdoutOf(["--render-from-json", saved])).toEqual(written);
  });
});
