import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runBalanceCaptured } from "../../test-support/runBalance.js";
import { captured } from "./balanceRun.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

const block = { runners: { unit: "vitest" }, notChecks: ["ci.yml:ci:Checkout"], deferralTags: ["deferred"] };

function targetOf(specController: unknown): string {
  const dir = temporaryDirectory("scn-usg-config-");
  mkdirSync(join(dir, "features"));
  writeFileSync(join(dir, "features", "own.feature"), "@OWN\nFeature: own\n\n  @unit @SCN-OWN-001\n  Scenario: own\n");
  writeFileSync(
    join(dir, "vitest.json"),
    JSON.stringify({ testResults: [{ name: "own.test.ts", assertionResults: [{ fullName: "[SCN-OWN-001] own", status: "passed" }] }] })
  );
  writeFileSync(
    join(dir, "ci.yml"),
    "jobs:\n  ci:\n    steps:\n      - name: Checkout\n        uses: actions/checkout@v4\n      - name: Unit tests\n        run: pnpm test\n"
  );
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "vitest run" }, specController }));
  return dir;
}

function inputsOf(dir: string): string[] {
  return [
    "--features", join(dir, "features"),
    "--vitest", join(dir, "vitest.json"),
    "--ci", join(dir, "ci.yml"),
    "--package-json", join(dir, "package.json"),
  ];
}

function balanceOf(specController: unknown): { report: string; stderr: string; exitCode: unknown } {
  return captured([...inputsOf(targetOf(specController)), "--format", "md"]);
}

describe("[SCN-CFG-004] a specController entry of a kind its reader does not take is named on the report with the kind it is and the kind that is read, and every other entry takes effect as without it", () => {
  const examples: ReadonlyArray<readonly [string, unknown, unknown]> = [
    ["specController", "x", undefined],
    ["specController.runners", { ...block, runners: ["vitest"] }, { ...block, runners: undefined }],
    ["specController.runners.unit", { ...block, runners: { unit: 5 } }, { ...block, runners: {} }],
    ["specController.notChecks", { ...block, notChecks: "ci.yml:ci:Checkout" }, { ...block, notChecks: undefined }],
    ["specController.notChecks[1]", { ...block, notChecks: ["ci.yml:ci:Checkout", { a: 1 }] }, block],
    ["specController.deferralTags", { ...block, deferralTags: { a: 1 } }, { ...block, deferralTags: undefined }],
    ["specController.deferralTags[0]", { ...block, deferralTags: [null] }, { ...block, deferralTags: [] }],
  ];

  it.each(examples)("reconciles a target holding %s, writing nothing to stderr and exiting as the target without it does", (entry, written, without) => {
    const run = balanceOf(written);
    expect(run.report).toContain(`- \`${entry}\` is `);
    expect(run.stderr).toBe("");
    expect(run.exitCode).toBe(balanceOf(without).exitCode);
  });
});

describe("[SCN-CFG-006] a specController block whose every entry is a kind its reader takes names nothing as the wrong kind", () => {
  it.each([
    ["a null runner", { ...block, runners: { unit: "vitest", e2e: null } }],
    ["an empty notChecks", { ...block, notChecks: [] }],
    ["an empty deferralTags", { ...block, deferralTags: [] }],
  ])("reconciles a target holding %s, naming no entry it could not use and writing nothing to stderr", (_, specController) => {
    const run = balanceOf(specController);
    expect(run.report).toContain("## Run provenance");
    expect(run.report).not.toContain("## Configuration not read");
    expect(run.stderr).toBe("");
  });

  it("reconciles a target holding a runners key that is not a layer, given a number, naming no entry as the wrong kind and writing nothing to stderr", () => {
    const run = balanceOf({ ...block, runners: { unit: "vitest", lint: 5 } });
    expect(run.report).toContain("## Run provenance");
    expect(run.report.split("\n").filter((line) => /^- `[^`]+` is /.test(line))).toEqual([]);
    expect(run.stderr).toBe("");
  });
});

describe("[SCN-CFG-007] a saved run re-rendered names the same specController entries its live report named", () => {
  it("re-renders a saved run of a target holding a wrong kind and an unread key, naming both as the live report did and writing nothing to stderr", () => {
    const dir = targetOf({ ...block, notChecks: "ci.yml:ci:Checkout", fitnessChecks: [{ scn: "SCN-OWN-001" }] });
    const saved = join(dir, "saved.json");
    const live = captured([...inputsOf(dir), "--format", "md", "--format", `json:${saved}`]);
    const again = captured(["--render-from-json", saved]);
    const named = (report: string): string[] => report.split("\n").filter((line) => line.startsWith("- `specController."));
    expect(named(live.report)).toHaveLength(2);
    expect(named(again.report)).toEqual(named(live.report));
    expect(again.stderr).toBe("");
  });
});

describe("[SCN-CFG-005] a key the specController block does not read, a retired one included, is named on the report as unknown in the same words as any other, and the run is not refused over it", () => {
  const accounts = (report: string): string => report.slice(report.indexOf("## Summary views"));

  it.each(["notCheck", "fitnessChecks", "zzz"])("reconciles a target also holding %s as the target without it, naming the key in the one sentence every unread key gets", (key) => {
    const dir = targetOf(block);
    const without = captured([...inputsOf(dir), "--format", "md"]);
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "vitest run" }, specController: { ...block, [key]: ["x"] } }));
    const run = captured([...inputsOf(dir), "--format", "md"]);
    expect(run.report.split("\n").filter((line) => line.startsWith("- `specController."))).toEqual([
      `- \`specController.${key}\` is not a key the specController block reads, so this run read nothing from it.`,
    ]);
    expect(run.stderr).toBe("");
    expect(run.exitCode).toBe(without.exitCode);
    expect(accounts(run.report)).toMatch(/^## Summary views\n/);
    expect(accounts(run.report)).toBe(accounts(without.report));
  });
});

describe("[SCN-CLI-092] a target with no runners block reports every step of its pipeline but GitHub's plumbing as a candidate", () => {
  it("writes nothing to stderr for a target whose configuration names no runners and no non-checks", () => {
    const dir = temporaryDirectory("scn-usg-017-unit-");
    mkdirSync(join(dir, "features"));
    writeFileSync(join(dir, "features", "own.feature"), "@OWN\nFeature: own\n\n  @unit @SCN-OWN-001\n  Scenario: own\n");
    writeFileSync(
      join(dir, "ci.yml"),
      "jobs:\n  ci:\n    steps:\n      - uses: actions/checkout@v4\n      - name: Unit tests\n        run: pnpm test\n"
    );
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "vitest run" }, specController: {} }));
    const { stderr } = runBalanceCaptured([
      "--features", join(dir, "features"),
      "--ci", join(dir, "ci.yml"),
      "--package-json", join(dir, "package.json"),
      "--format", "md",
    ]);
    expect(stderr).toBe("");
  });
});
