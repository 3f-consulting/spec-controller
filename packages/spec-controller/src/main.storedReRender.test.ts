import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runBalance } from "./cli-balance/cli.js";
import { balanceCommand, cliRegistry, renderCommandHelp, renderTopLevelHelp } from "./cliRegistry.js";
import { answerUnknownCommand } from "./host.js";
import { main } from "./main.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "./programOutput.test-utils.js";

interface Answered extends Written {
  storeMade: boolean;
}

let savedDir: string;
let savedReport: string;

beforeEach(() => {
  const outOfBalance = fileURLToPath(new URL("../../../tests/fixtures/evidence-observation", import.meta.url));
  savedDir = temporaryDirectory("main-stored-re-render-saved-");
  savedReport = join(savedDir, "saved.json");
  const quiet = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    runBalance([
      "--features", join(outOfBalance, "features"),
      "--vitest", join(outOfBalance, "vitest.json"),
      "--ci", outOfBalance,
      "--format", `json:${savedReport}`,
    ]);
  } finally {
    quiet.mockRestore();
    process.exitCode = undefined;
  }
  if (!existsSync(savedReport)) throw new Error("the out-of-balance target saved no report to re-render");
});

recordWhatTheProgramWrites();

function underAStoreNotYetMade(argvAt: (storeRoot: string) => string[]): Answered {
  const cwd = temporaryDirectory("main-stored-re-render-");
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  const storeRoot = join(cwd, "store");
  main(argvAt(storeRoot));
  return {
    ...whatTheProgramWrote(),
    storeMade: existsSync(storeRoot),
  };
}

function refusalNaming(modifiers: string, closing: string): string {
  return `spec-controller: usage error — ${APP_MESSAGES[AppMessage.ReRenderNotStored](modifiers)}\n${closing}\n`;
}

const NAMING_THE_STORE = (): string => refusalNaming("--store", APP_MESSAGES[AppMessage.ReRenderWithoutIt]());
const NAMING_BOTH = (): string => refusalNaming("--store, --run-id", APP_MESSAGES[AppMessage.ReRenderWithoutThem]());

const missingFromSavedDir = (): string[] => ["--render-from-json", join(savedDir, "missing.json")];

const EXAMPLES: { saved: string; beside: string; reRender: () => string[] }[] = [
  { saved: "of an out-of-balance run", beside: "with nothing else", reRender: () => ["--render-from-json", savedReport] },
  { saved: "of an out-of-balance run", beside: "strictly", reRender: () => ["--render-from-json", savedReport, "--strict"] },
  {
    saved: "of an out-of-balance run",
    beside: "with a failing verdict zeroed",
    reRender: () => ["--render-from-json", savedReport, "--exit-zero"],
  },
  {
    saved: "at a path that is missing",
    beside: "with nothing else",
    reRender: missingFromSavedDir,
  },
];

describe("[SCN-RMG-007] main refuses a stored --render-from-json re-render naming --store, never a flag the operator did not give, and stores nothing", () => {
  describe.each(EXAMPLES)("a saved reconciliation $saved, re-rendered under a run store $beside", ({ reRender }) => {
    const argvAt = (store: string): string[] => ["--store", store, "balance", ...reRender()];

    it("refuses on stderr with exactly the refusal naming --store as what a re-render cannot take", () => {
      expect(underAStoreNotYetMade(argvAt).stderr).toBe(NAMING_THE_STORE());
    });
  });

  describe("under a run store and a run name", () => {
    const argvAt = (store: string): string[] => ["--store", store, "--run-id", "r1", "balance", "--render-from-json", savedReport];

    it("refuses naming both modifiers, closing with the way to run it without them", () => {
      const answered = underAStoreNotYetMade(argvAt);

      expect(answered.stderr).toBe(NAMING_BOTH());
      expect(answered.exitCode).toBe(2);
      expect(answered.stdout).toBe("");
      expect(answered.storeMade).toBe(false);
    });
  });

  describe("when balance's help is asked for alongside the re-render", () => {
    for (const help of ["--help", "-h"]) {
      it(`answers balance's help for ${help}, refusing nothing and making no run store`, () => {
        const answered = underAStoreNotYetMade((store) => ["--store", store, "balance", "--render-from-json", savedReport, help]);

        expect(answered.stdout).toBe(renderCommandHelp(balanceCommand) + "\n");
        expect(answered.stderr).toBe("");
        expect(answered.exitCode).toBeUndefined();
        expect(answered.storeMade).toBe(false);
      });
    }
  });

  describe("a command that is not balance, given --render-from-json under a run store", () => {
    it("allocate is refused for taking no host modifier, not as a stored re-render", () => {
      const answered = underAStoreNotYetMade((store) => ["--store", store, "allocate", "--render-from-json", savedReport]);

      expect(answered.stderr).toContain(APP_MESSAGES[AppMessage.RunWithoutModifiers]("allocate"));
      expect(answered.stderr).not.toContain(APP_MESSAGES[AppMessage.ReRenderNotStored]("--store"));
      expect(answered.exitCode).toBe(2);
    });

    it("an unknown command is answered as unknown, not as a stored re-render", () => {
      const answered = underAStoreNotYetMade((store) => ["--store", store, "blance", "--render-from-json", savedReport]);

      expect(answered.stderr).toBe(answerUnknownCommand("blance", renderTopLevelHelp(cliRegistry)).stderr);
      expect(answered.exitCode).toBe(2);
    });
  });
});
