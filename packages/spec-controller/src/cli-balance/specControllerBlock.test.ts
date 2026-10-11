import { afterAll, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBalanceCaptured } from "../../test-support/runBalance.js";
import { captured } from "./balanceRun.test-utils.js";

const made: string[] = [];

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const block = { runners: { unit: "vitest" }, notChecks: ["ci.yml:ci:Checkout"], deferralTags: ["deferred"] };

function targetOf(specController: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "scn-usg-config-"));
  made.push(dir);
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

describe("[SCN-USG-025] a specController entry of a kind its reader does not take is named on the report with the kind it is and the kind that is read, and every other entry takes effect as without it", () => {
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

describe("[SCN-USG-026] a specController block whose every entry is a kind its reader takes names nothing as the wrong kind", () => {
  it.each([
    ["a null runner", { ...block, runners: { unit: "vitest", e2e: null } }],
    ["an empty notChecks", { ...block, notChecks: [] }],
    ["an empty deferralTags", { ...block, deferralTags: [] }],
    ["a runners key that is not a tier, given a number", { ...block, runners: { unit: "vitest", lint: 5 } }],
  ])("reconciles a target holding %s, naming no entry it could not use and writing nothing to stderr", (_, specController) => {
    const run = balanceOf(specController);
    expect(run.report).toContain("## Run provenance");
    expect(run.report).not.toContain("## Configuration not read");
    expect(run.stderr).toBe("");
  });
});

describe("[SCN-USG-027] a saved run re-rendered names the same specController entries its live report named", () => {
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

describe("[SCN-USG-028] a key the specController block does not read, a retired one included, is named on the report as unknown in the same words as any other, and the run is not refused over it", () => {
  const SECTION = "## Configuration not read";
  const withoutSection = (report: string): string => {
    const lines = report.split("\n");
    const start = lines.indexOf(SECTION);
    const end = start === -1 ? -1 : lines.findIndex((line, i) => i > start && line.startsWith("## "));
    return (start === -1 ? lines : [...lines.slice(0, start), ...lines.slice(end)])
      .filter((line) => !line.startsWith("- Run timestamp"))
      .join("\n");
  };

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
    expect(withoutSection(run.report)).toBe(withoutSection(without.report));
  });
});

describe("[SCN-USG-017] a target with no runners block reports every step of its pipeline as a candidate", () => {
  it("writes nothing to stderr for a target whose configuration names no runners and no non-checks", () => {
    const dir = mkdtempSync(join(tmpdir(), "scn-usg-017-unit-"));
    made.push(dir);
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
