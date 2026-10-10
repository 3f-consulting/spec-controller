import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { main } from "./main.js";

interface Answered {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
  runDir: string;
  storeMade: boolean;
  cwdEntries: string[];
}

let stdout: string[];
let stderr: string[];

beforeEach(() => {
  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

const TARGET = "demo-store";
const RUN_ID = "r1";

let balanceArgs: string[];

beforeEach(() => {
  const outOfBalance = fileURLToPath(new URL("../../../tests/fixtures/evidence-observation", import.meta.url));
  balanceArgs = [
    "--features", join(outOfBalance, "features"),
    "--vitest", join(outOfBalance, "vitest.json"),
    "--target", TARGET,
  ];
});

function ranIn(hostArgvAt: (storeRoot: string) => string[], inspect: (answered: Answered) => void): void {
  const cwd = mkdtempSync(join(tmpdir(), "main-stored-run-"));
  try {
    vi.spyOn(process, "cwd").mockReturnValue(cwd);
    const storeRoot = join(cwd, "store");
    main(hostArgvAt(storeRoot));
    inspect({
      stdout: stdout.join(""),
      stderr: stderr.join(""),
      exitCode: process.exitCode,
      runDir: join(storeRoot, TARGET, RUN_ID),
      storeMade: existsSync(storeRoot),
      cwdEntries: readdirSync(cwd),
    });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const STORED = (storeRoot: string): string[] => ["--store", storeRoot, "--run-id", RUN_ID, "balance", ...balanceArgs];
const UNSTORED = (): string[] => ["balance", ...balanceArgs];

describe("[SCN-RMG-004] `spec-controller --store <root> balance` writes a stored run the operator can reach", () => {
  describe("balance under the store modifier and the run-name modifier", () => {
    it("prints exactly the run directory named for the target and run-id under the run store", () => {
      ranIn(STORED, ({ stdout: printed, stderr: refused, runDir }) => {
        expect(printed).toBe(runDir + "\n");
        expect(refused).toBe("");
      });
    });

    it("ends on the out-of-balance verdict", () => {
      ranIn(STORED, ({ exitCode }) => {
        expect(exitCode).toBe(1);
      });
    });

    it("leaves the saved reconciliation, in markdown and in JSON, and the run manifest in that run directory", () => {
      ranIn(STORED, ({ runDir }) => {
        expect(readdirSync(runDir).sort()).toEqual(["run.yaml", "spec-reconciliation.json", "spec-reconciliation.md"]);
        expect(readFileSync(join(runDir, "spec-reconciliation.md"), "utf8")).toMatch(/^# Evidence Reconciliation\n/);
        expect(JSON.parse(readFileSync(join(runDir, "spec-reconciliation.json"), "utf8"))).toHaveProperty("runProvenance");
      });
    });

    it("stamps the run manifest with mode balance, the target and the run-id", () => {
      ranIn(STORED, ({ runDir }) => {
        const manifest = parse(readFileSync(join(runDir, "run.yaml"), "utf8")) as Record<string, unknown>;

        expect(manifest["mode"]).toBe("balance");
        expect(manifest["target"]).toBe(TARGET);
        expect(manifest["run_id"]).toBe(RUN_ID);
      });
    });
  });

  describe("the same balance with no store modifier", () => {
    it("prints the report alone, naming no run directory, and stores nothing", () => {
      ranIn(UNSTORED, ({ stdout: printed, exitCode, runDir, storeMade, cwdEntries }) => {
        expect(printed).toMatch(/^# Evidence Reconciliation\n/);
        expect(printed).not.toContain(runDir);
        expect(exitCode).toBe(1);
        expect(storeMade).toBe(false);
        expect(cwdEntries).toEqual([]);
      });
    });
  });
});
