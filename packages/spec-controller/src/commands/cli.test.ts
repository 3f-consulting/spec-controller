import type { EventEmitter } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import crashGuardsVariants from "../runEnding/crashGuards.variants.json" with { type: "json" };
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

type Guard = (error: unknown) => void;

interface BinRun {
  readonly exitCode: string | number | undefined;
  readonly output: string;
  readonly error: string;
  readonly complaints: () => readonly string[];
  // The guards the bin put in place, to meet an error nothing else handles.
  readonly uncaught: Guard;
  readonly rejected: Guard;
}

// The variant the bin meets, run here through the bin itself.
const WHILE_THE_PROGRAM_LOADS = "one while the program loads";

const EVENTS = ["uncaughtException", "unhandledRejection"] as const;
const exitCodeBefore = process.exitCode;
const events: EventEmitter = process;
const guardsOn = (event: string): readonly Guard[] => events.listeners(event) as Guard[];
let guardsBefore: readonly (readonly Guard[])[] = [];

// The guards on each event that were not there before the bin ran.
const guardsAdded = (): Guard[][] => EVENTS.map((event, at) => guardsOn(event).filter((guard) => !guardsBefore[at]?.includes(guard)));

afterEach(() => {
  guardsAdded().forEach((added, at) => added.forEach((guard) => events.off(EVENTS[at]!, guard)));
  vi.restoreAllMocks();
  vi.doUnmock("./main.js");
  process.exitCode = exitCodeBefore;
});

// A folder outside git with one feature file of one claim and no evidence, so balance run in it is out of balance.
function folderOutOfBalance(): string {
  const folder = temporaryDirectory("bin-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n");
  return folder;
}

// The bin run with the arguments in the folder, as the shell starts it, with what it wrote to each stream.
async function binRun(args: readonly string[], folder: string, output: (text: string) => void = () => {}): Promise<BinRun> {
  guardsBefore = EVENTS.map(guardsOn);
  const written = { output: "", error: "" };
  vi.spyOn(process.stdout, "write").mockImplementation((text) => {
    output(String(text));
    written.output += String(text);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((text) => {
    written.error += String(text);
    return true;
  });
  vi.spyOn(process, "cwd").mockReturnValue(folder);
  const argv = process.argv;
  process.argv = [process.execPath, "spec-controller", ...args];
  process.exitCode = undefined;
  vi.resetModules();
  try {
    await import("./cli.js");
  } catch {
    written.output += "an error escaped the bin";
  } finally {
    process.argv = argv;
  }
  const [uncaught = [], rejected = []] = guardsAdded();
  return {
    exitCode: process.exitCode,
    output: written.output,
    error: written.error,
    complaints: () => written.error.split("\n").filter((line) => line.startsWith("[unexpected-error]")),
    uncaught: (error) => uncaught.forEach((guard) => guard(error)),
    rejected: (error) => rejected.forEach((guard) => guard(error)),
  };
}

describe("each run verdict will have its exit code", () => {
  it("[CLM-CLI-167] a run reached the run verdict out of balance, run from the command line: when it ends, it will exit 1", async () => {
    const run = await binRun(["balance", "--format", "json"], folderOutOfBalance());

    expect({ exitCode: run.exitCode, reported: run.output.includes('"out-of-balance"') }).toEqual({ exitCode: 1, reported: true });
  });
});

describe("the run reports an error it did not expect, rather than crashing silently", () => {
  it(`[CLM-CLI-176] when the run meets an unexpected error, ${WHILE_THE_PROGRAM_LOADS}: the run will stop, give no verdict and exit 4, and it will complain, naming the error`, async () => {
    expect(crashGuardsVariants["CLM-CLI-176"].variants).toContain(WHILE_THE_PROGRAM_LOADS);
    // A module whose evaluation throws, met as the bin reads what it exports.
    vi.doMock("./main.js", () => ({
      get main(): never {
        throw new Error("a module could not load");
      },
    }));

    const run = await binRun(["balance"], folderOutOfBalance());

    expect({ exitCode: run.exitCode, output: run.output, complaints: run.complaints().map((line) => line.includes("Error: a module could not load")) }).toEqual({
      exitCode: 4,
      output: "",
      complaints: [true],
    });
  });
});

describe("an unexpected error after the run verdict will leave its exit code alone", () => {
  it.each([
    ["an error nothing caught", (run: BinRun) => run.uncaught],
    ["a rejection nothing handled", (run: BinRun) => run.rejected],
  ] as const)("[CLM-CLI-181] a run reached its run verdict, out of balance, run from the command line: when it meets an unexpected error, %s, it will exit with its run verdict's code, 1", async (_error, guard) => {
    const run = await binRun(["balance"], folderOutOfBalance());

    guard(run)(new Error("after the verdict"));

    expect({ exitCode: process.exitCode, complaints: run.complaints().length }).toEqual({ exitCode: 1, complaints: 1 });
  });
});

describe("a run will complain about only one unexpected error", () => {
  it("[CLM-CLI-182] a run from the command line meets two unexpected errors, its report not written and an error nothing caught: it will complain about only one of them", async () => {
    const run = await binRun(["balance"], folderOutOfBalance(), () => {
      throw new Error("the report could not be written");
    });

    run.uncaught(new Error("after the verdict"));

    expect(run.complaints()).toEqual([expect.stringContaining("the report could not be written")]);
  });
});
