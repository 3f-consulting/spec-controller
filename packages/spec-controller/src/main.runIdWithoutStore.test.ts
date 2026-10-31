import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runBalance } from "./cli-balance/cli.js";
import { modifiersNotTakenRefusal, parseHostInvocation } from "./host.js";
import { main } from "./main.js";
import { APP_MESSAGES, AppMessage } from "./messages.js";
import { storedReRenderRefusal, unstoredRunIdRefusal } from "./storedRun.js";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "./programOutput.test-utils.js";

interface Answered extends Written {
  expectedStderr: string | undefined;
  workingEntries: string[];
}

let target: string[];
let savedDir: string;
let savedReport: string;

beforeEach(() => {
  const outOfBalance = fileURLToPath(new URL("../../../tests/fixtures/evidence-observation", import.meta.url));
  target = [
    "--features", join(outOfBalance, "features"),
    "--vitest", join(outOfBalance, "vitest.json"),
    "--ci", outOfBalance,
  ];
  savedDir = temporaryDirectory("main-run-id-without-store-saved-");
  savedReport = join(savedDir, "saved.json");
  const quiet = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    runBalance([...target, "--format", `json:${savedReport}`]);
  } finally {
    quiet.mockRestore();
    process.exitCode = undefined;
  }
  if (!existsSync(savedReport)) throw new Error("the out-of-balance target saved no report to re-render");
});

recordWhatTheProgramWrites();

type Refusal = (argv: string[]) => string | undefined;

const refusedAsUnstored: Refusal = (argv) => unstoredRunIdRefusal(parseHostInvocation(argv));
const refusedAsReRender: Refusal = (argv) => storedReRenderRefusal(parseHostInvocation(argv));
const refusedAsModifiersNotTaken: Refusal = (argv) => modifiersNotTakenRefusal(parseHostInvocation(argv));

function inTemporaryWorkingDirectory(argvAt: (cwd: string) => string[], refusal: Refusal): Answered {
  const cwd = temporaryDirectory("main-run-id-without-store-");
  vi.spyOn(process, "cwd").mockReturnValue(cwd);
  const argv = argvAt(cwd);
  main(argv);
  const expected = refusal(argv);
  return {
    ...whatTheProgramWrote(),
    expectedStderr: expected === undefined ? undefined : expected + "\n",
    workingEntries: readdirSync(cwd),
  };
}

const balance = (): string[] => ["balance", ...target];

const KEEP_UNDER_NAME = (): string => APP_MESSAGES[AppMessage.KeepRunUnderName]("balance");
const RE_RENDER_WITHOUT_IT = (): string => APP_MESSAGES[AppMessage.ReRenderWithoutIt]();

const liveBalance = (): string[] => ["--run-id", "r1", ...balance()];
const liveBalanceReportOnly = (): string[] => ["--run-id", "r1", ...balance(), "--exit-zero"];
const liveBalanceStrict = (): string[] => ["--run-id", "r1", ...balance(), "--strict"];
const liveBalanceToAFile = (cwd: string): string[] => ["--run-id", "r1", ...balance(), "--format", `json:${join(cwd, "report.json")}`];

const SHAPES: { shape: string; argvAt: (cwd: string) => string[]; refusal: Refusal; closing: () => string }[] = [
  {
    shape: "before a live balance run",
    argvAt: liveBalance,
    refusal: refusedAsUnstored,
    closing: KEEP_UNDER_NAME,
  },
  {
    shape: "before a live balance run, under the report-only option",
    argvAt: liveBalanceReportOnly,
    refusal: refusedAsUnstored,
    closing: KEEP_UNDER_NAME,
  },
  {
    shape: "before a live balance run, under the strict option",
    argvAt: liveBalanceStrict,
    refusal: refusedAsUnstored,
    closing: KEEP_UNDER_NAME,
  },
  {
    shape: "before a live balance run that writes its report to a file",
    argvAt: liveBalanceToAFile,
    refusal: refusedAsUnstored,
    closing: KEEP_UNDER_NAME,
  },
  {
    shape: "before a balance re-render of a saved report",
    argvAt: () => ["--run-id", "r1", "balance", "--render-from-json", savedReport],
    refusal: refusedAsReRender,
    closing: RE_RENDER_WITHOUT_IT,
  },
];

describe("[SCN-CLI-083] the host refuses --run-id given without --store as a usage fault, naming it", () => {
  describe.each(SHAPES)("$shape", ({ argvAt, refusal, closing }) => {
    it("refuses on stderr with exactly the refusal naming --run-id as naming a run that is not kept", () => {
      const answered = inTemporaryWorkingDirectory(argvAt, refusal);

      expect(answered.expectedStderr).toContain("--run-id");
      expect(answered.stderr).toBe(answered.expectedStderr);
    });

    it("closes the refusal with the way to run it that applies to this shape", () => {
      expect(inTemporaryWorkingDirectory(argvAt, refusal).stderr.split("\n").slice(-2)).toEqual([closing(), ""]);
    });
  });

  describe("before a command that takes no host modifier", () => {
    const argvAt = (): string[] => ["--run-id", "r1", "allocate", "CLI"];

    it("refuses with the modifiers-not-taken refusal, not the unkept-run one", () => {
      const answered = inTemporaryWorkingDirectory(argvAt, refusedAsModifiersNotTaken);

      expect(answered.stderr).toBe(answered.expectedStderr);
      expect(answered.stderr).not.toBe(`${refusedAsUnstored(argvAt()) ?? ""}\n`);
      expect(answered.exitCode).toBe(2);
      expect(answered.stdout).toBe("");
    });
  });
});
