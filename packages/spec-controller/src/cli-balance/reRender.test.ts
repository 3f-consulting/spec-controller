import { beforeEach, describe, it, expect } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { allocateCommand, balanceCommand, cliRegistry, renderCommandHelp, renderTopLevelHelp } from "../cliRegistry.js";
import { headlineExit } from "./balanceRun.test-utils.js";
import { liveSaver, runPinned } from "./savedRun.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { errorCodesShown } from "../shownText.test-utils.js";

let scratch: string;
let saveLive: ReturnType<typeof liveSaver>;

beforeEach(() => {
  scratch = temporaryDirectory("spec-controller-rerender-");
  saveLive = liveSaver(scratch);
});

function fixtureArgv(fixture: string): string[] {
  const dir = `tests/fixtures/${fixture}`;
  const argv = ["--features", `${dir}/features`, "--ci", dir];
  for (const [flag, file] of [["--vitest", "vitest.json"], ["--cucumber", "cucumber.json"], ["--package-json", "package.json"]] as const) {
    if (existsSync(`${dir}/${file}`)) argv.push(flag, `${dir}/${file}`);
  }
  return argv;
}

describe("[SCN-CLI-069] a re-render of a saved reconciliation exits the code its verdict names, and its headline names the same code", () => {
  const VERDICTS = [
    { verdict: "all-balanced", fixture: "balanced", code: 0 },
    { verdict: "out-of-balance", fixture: "evidence-observation", code: 1 },
    { verdict: "balanced-with-claim-code-errors", fixture: "scenario-code-error", code: 1 },
    { verdict: "unsound", fixture: "broken", code: 4 },
    { verdict: "nothing to reconcile", fixture: "nothing-to-reconcile", code: 5 },
  ] as const;

  for (const { verdict, fixture, code } of VERDICTS) {
    it(`${verdict}: the re-render exits ${code}, the code the live run exited, and its headline names it`, () => {
      const saved = saveLive(`verdict-${fixture}`, fixtureArgv(fixture));
      expect(saved.exitCode).toBe(code);

      const regenerated = runPinned(["--render-from-json", saved.json]);
      expect(regenerated.exitCode).toBe(code);
      expect(headlineExit(regenerated.stdout)).toBe(code);
    });
  }
});

describe("[SCN-CLI-070] a re-render is strict when the saved run was strict or the re-render is given --strict", () => {
  function unrecorded(path: string): string {
    const report = JSON.parse(readFileSync(path, "utf8")) as { runProvenance: Record<string, unknown> };
    delete report.runProvenance["strict"];
    const older = path.replace(/\.json$/, "-unrecorded.json");
    writeFileSync(older, JSON.stringify(report));
    return older;
  }

  const ROWS = [
    { saved: "under --strict", liveFlags: ["--strict"], older: false, given: [], code: 3 },
    { saved: "without --strict", liveFlags: [], older: false, given: ["--strict"], code: 3 },
    { saved: "without --strict", liveFlags: [], older: false, given: [], code: 0 },
    { saved: "before strictness was recorded", liveFlags: [], older: true, given: [], code: 0 },
  ] as const;

  for (const row of ROWS) {
    it(`saved ${row.saved}, re-rendered ${row.given.length > 0 ? "with --strict" : "bare"}: exits ${row.code} and its headline names it`, () => {
      const saved = saveLive(`pending${row.liveFlags.join("")}`, [...fixtureArgv("pending-only"), ...row.liveFlags]);
      const path = row.older ? unrecorded(saved.json) : saved.json;
      const regenerated = runPinned(["--render-from-json", path, ...row.given]);
      expect(regenerated.exitCode).toBe(row.code);
      expect(headlineExit(regenerated.stdout)).toBe(row.code);
    });
  }
});

describe("[SCN-CLI-071] under --exit-zero a re-render moves 1 and 3 to 0 and never 4 or 5, printing the same report", () => {
  const ROWS = [
    { verdict: "out-of-balance", fixture: "evidence-observation", liveFlags: [], code: 1, zeroed: 0 },
    { verdict: "only-Pending-Items under --strict", fixture: "pending-only", liveFlags: ["--strict"], code: 3, zeroed: 0 },
    { verdict: "unsound", fixture: "broken", liveFlags: [], code: 4, zeroed: 4 },
    { verdict: "nothing to reconcile", fixture: "nothing-to-reconcile", liveFlags: [], code: 5, zeroed: 5 },
  ] as const;

  for (const row of ROWS) {
    it(`${row.verdict}: exits ${row.code} without the flag and ${row.zeroed} with it, printing the same bytes`, () => {
      const saved = saveLive(`zero-${row.fixture}`, [...fixtureArgv(row.fixture), ...row.liveFlags]);
      const without = runPinned(["--render-from-json", saved.json]);
      const withFlag = runPinned(["--render-from-json", saved.json, "--exit-zero"]);
      expect(without.exitCode).toBe(row.code);
      expect(withFlag.exitCode).toBe(row.zeroed);
      expect(withFlag.stdout).toBe(without.stdout);
    });
  }
});

describe("[SCN-CLI-072] a flag given beside --render-from-json that the re-render does not read exits 2 naming the flag, and nothing is rendered", () => {
  function runRefusable(argv: readonly string[]): { exitCode: number; stdout: string; stderr: string } {
    const { exitCode, stdout, stderr } = runBalanceCaptured(argv);
    return { exitCode, stdout, stderr };
  }

  const READ_BY_A_RE_RENDER = new Set(["--render-from-json", "--strict", "--exit-zero", "--help"]);

  for (const flag of balanceCommand.flags) {
    if (READ_BY_A_RE_RENDER.has(flag.name)) continue;
    it(`${flag.name}: exits 2, names the flag on stderr, and prints nothing`, () => {
      const saved = saveLive("refusal-source", fixtureArgv("evidence-observation"));
      const value = flag.name === "--format" ? `json:${join(scratch, "refused-out.json")}` : "/nonexistent";
      const args = flag.arg !== undefined ? [flag.name, value] : [flag.name];
      const run = runRefusable(["--render-from-json", saved.json, ...args]);
      expect(run.exitCode).toBe(2);
      expect(run.stderr).toContain(flag.name);
      expect(run.stdout).toBe("");
      expect(existsSync(join(scratch, "refused-out.json"))).toBe(false);
    });
  }
});

describe("[SCN-MSG-011] a balanced run shows no error code", () => {
  const NONE = { opening: [], after: [] };
  const VERDICTS = [
    { verdict: "balanced", fixture: "balanced", code: 0 },
    { verdict: "out-of-balance", fixture: "evidence-observation", code: 1 },
    { verdict: "unsound", fixture: "broken", code: 4 },
  ] as const;

  for (const { verdict, fixture, code } of VERDICTS) {
    it(`the live ${verdict} report, and what the run writes beside it, shows no error code`, () => {
      const live = runBalanceCaptured(fixtureArgv(fixture));
      expect(live.exitCode).toBe(code);
      expect(live.stdout).not.toBe("");
      expect(errorCodesShown(live.stdout)).toEqual(NONE);
      expect(errorCodesShown(live.stderr)).toEqual(NONE);
    });

    it(`the ${verdict} report re-rendered, and what the re-render writes beside it, shows no error code`, () => {
      const saved = saveLive(`no-code-${fixture}`, fixtureArgv(fixture));
      const regenerated = runBalanceCaptured(["--render-from-json", saved.json]);
      expect(regenerated.exitCode).toBe(code);
      expect(regenerated.stdout).not.toBe("");
      expect(errorCodesShown(regenerated.stdout)).toEqual(NONE);
      expect(errorCodesShown(regenerated.stderr)).toEqual(NONE);
    });
  }

  it("the tool's help, and each command's, shows no error code", () => {
    for (const help of [renderTopLevelHelp(cliRegistry), renderCommandHelp(balanceCommand), renderCommandHelp(allocateCommand)]) {
      expect(errorCodesShown(help)).toEqual(NONE);
    }
  });
});
