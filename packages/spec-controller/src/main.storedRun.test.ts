import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { CoreMessage, coreMessage, markdownHeading } from "@3f-consulting/spec-controller-core/internal";
import { main } from "./main.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "./programOutput.test-utils.js";

interface Answered extends Written {
  runDir: string;
  storeMade: boolean;
  cwdEntries: string[];
}

recordWhatTheProgramWrites();

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
  const cwd = temporaryDirectory("main-stored-run-");
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  const storeRoot = join(cwd, "store");
  main(hostArgvAt(storeRoot));
  inspect({
    ...whatTheProgramWrote(),
    runDir: join(storeRoot, TARGET, RUN_ID),
    storeMade: existsSync(storeRoot),
    cwdEntries: readdirSync(cwd),
  });
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
        expect(readFileSync(join(runDir, "spec-reconciliation.md"), "utf8").slice(0, markdownHeading(1, coreMessage(CoreMessage.ReportTitle)).length + 1)).toBe(`${markdownHeading(1, coreMessage(CoreMessage.ReportTitle))}\n`);
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
        expect(printed.slice(0, markdownHeading(1, coreMessage(CoreMessage.ReportTitle)).length + 1)).toBe(`${markdownHeading(1, coreMessage(CoreMessage.ReportTitle))}\n`);
        expect(printed).not.toContain(runDir);
        expect(exitCode).toBe(1);
        expect(storeMade).toBe(false);
        expect(cwdEntries).toEqual([]);
      });
    });
  });
});
