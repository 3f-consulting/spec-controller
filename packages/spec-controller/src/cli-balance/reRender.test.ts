import { describe, it, expect, vi, afterAll } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBalance } from "./cli.js";
import { cliRegistry } from "../cli-registry.js";

function runPinned(argv: readonly string[]): { stdout: string; exitCode: number } {
  const savedExitCode = process.exitCode;
  process.exitCode = 0;
  const chunks: string[] = [];
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array): boolean => {
    chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  });
  const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-27T12:00:00.000Z"));
  try {
    runBalance([...argv]);
    return { stdout: chunks.join(""), exitCode: Number(process.exitCode ?? 0) };
  } finally {
    vi.useRealTimers();
    errSpy.mockRestore();
    writeSpy.mockRestore();
    process.exitCode = savedExitCode;
  }
}

const scratch = mkdtempSync(join(tmpdir(), "spec-controller-rerender-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function saveLive(name: string, argv: readonly string[]): { json: string; md: string; exitCode: number } {
  const json = join(scratch, `${name}.json`);
  const md = join(scratch, `${name}.md`);
  const live = runPinned([...argv, "--format", `md:${md}`, "--format", `json:${json}`]);
  return { json, md, exitCode: live.exitCode };
}

describe("[SCN-RMD-007] the markdown regenerates from a saved report byte-identical to the direct render, and exits the code its saved verdict names", () => {
  it("regenerates the out-of-balance roundtrip report and exits the 1 the live run exited", () => {
    const saved = saveLive("roundtrip", [
      "--features", "tests/fixtures/roundtrip/features",
      "--vitest", "tests/fixtures/roundtrip/vitest.json",
    ]);
    expect(saved.exitCode).toBe(1);

    const regenerated = runPinned(["--render-from-json", saved.json]);
    expect(regenerated.stdout).toBe(readFileSync(saved.md, "utf8"));
    expect(regenerated.exitCode).toBe(saved.exitCode);
  });
});

function fixtureArgv(fixture: string): string[] {
  const dir = `tests/fixtures/${fixture}`;
  const argv = ["--features", `${dir}/features`, "--ci", dir];
  for (const [flag, file] of [["--vitest", "vitest.json"], ["--cucumber", "cucumber.json"], ["--package-json", "package.json"]] as const) {
    if (existsSync(`${dir}/${file}`)) argv.push(flag, `${dir}/${file}`);
  }
  return argv;
}

function headlineExit(stdout: string): number | undefined {
  const after = stdout.split("### Run verdict")[1] ?? "";
  const line = after.split("\n").find((l) => l.trim() !== "") ?? "";
  const match = /\(exit (\d)\)$/.exec(line);
  return match ? Number(match[1]) : undefined;
}

describe("[SCN-CLI-069] a re-render of a saved reconciliation exits the code its verdict names, and its headline names the same code", () => {
  const VERDICTS = [
    { verdict: "all-balanced", fixture: "balanced", code: 0 },
    { verdict: "out-of-balance", fixture: "evidence-observation", code: 1 },
    { verdict: "balanced-with-scenario-code-errors", fixture: "scenario-code-error", code: 1 },
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
  const PENDING_ONLY = fixtureArgv("pending-only");

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
      const saved = saveLive(`pending${row.liveFlags.join("")}`, [...PENDING_ONLY, ...row.liveFlags]);
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
    const savedExitCode = process.exitCode;
    process.exitCode = 0;
    const out: string[] = [];
    const err: string[] = [];
    const text = (chunk: string | Uint8Array): string => (typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    const outSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => out.push(text(chunk)) > 0);
    const errSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => err.push(text(chunk)) > 0);
    try {
      runBalance([...argv]);
      return { exitCode: Number(process.exitCode ?? 0), stdout: out.join(""), stderr: err.join("") };
    } finally {
      errSpy.mockRestore();
      outSpy.mockRestore();
      process.exitCode = savedExitCode;
    }
  }

  const READ_BY_A_RE_RENDER = new Set(["--render-from-json", "--strict", "--exit-zero", "--help"]);
  const balance = cliRegistry.commands.find((command) => command.name === "balance");
  const refused = (balance?.flags ?? []).filter((flag) => !READ_BY_A_RE_RENDER.has(flag.name));

  it("the registry leaves at least the nine flags the acceptance names", () => {
    expect(refused.length).toBeGreaterThanOrEqual(9);
  });

  for (const flag of refused) {
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
