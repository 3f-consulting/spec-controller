import type { EventEmitter } from "node:events";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import catalogue from "../messages/messages.en.json" with { type: "json" };
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
  // The working directory is the folder, and cannot be found while the folder does not exist, as the system says.
  vi.spyOn(process, "cwd").mockImplementation(() => {
    if (!existsSync(folder)) throw Object.assign(new Error("ENOENT: no such file or directory, uv_cwd"), { code: "ENOENT" });
    return folder;
  });
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
  it("[CLM-CLI-167] balance run from the command line, out of balance, writes its report and exits 1", async () => {
    const run = await binRun(["balance", "--format", "json"], folderOutOfBalance());

    expect({ exitCode: run.exitCode, reported: run.output.includes('"out-of-balance"') }).toEqual({ exitCode: 1, reported: true });
  });
});

describe("a default that cannot be read will stop the run", () => {
  it("[CLM-CLI-145] balance run from the command line in a working directory that has been removed: the run stops, no verdict, exit 2, and a complaint naming the corpus read by default and what is wrong", async () => {
    const removed = join(temporaryDirectory("removed-"), "work");
    mkdirSync(join(removed, "features"), { recursive: true });
    rmSync(removed, { recursive: true });

    const run = await binRun(["balance"], removed);

    const complaint = run.error.split("\n").find((line) => line.startsWith(`[input-default-unreadable] ${catalogue["input-features"]} features,`));

    expect({ exitCode: run.exitCode, output: run.output, whatIsWrong: complaint?.endsWith(catalogue["working-folder-removed"]) }).toEqual({ exitCode: 2, output: "", whatIsWrong: true });
  });
});

describe("an unexpected error will stop the run with no verdict and exit 4, naming the error", () => {
  it("[CLM-CLI-179] an error while the program loads, run from the command line: the run stops, no verdict, exit 4, and a complaint with the error", async () => {
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
  ] as const)("[CLM-CLI-181] a run out of balance, run from the command line, that meets %s afterwards exits 1, its verdict's code", async (_error, guard) => {
    const run = await binRun(["balance"], folderOutOfBalance());

    guard(run)(new Error("after the verdict"));

    expect({ exitCode: process.exitCode, complaints: run.complaints().length }).toEqual({ exitCode: 1, complaints: 1 });
  });
});

describe("a run will complain about only one unexpected error", () => {
  it("[CLM-CLI-182] a run from the command line whose report could not be written, and that meets an error nothing caught afterwards, complains about only one of them", async () => {
    const run = await binRun(["balance"], folderOutOfBalance(), () => {
      throw new Error("the report could not be written");
    });

    run.uncaught(new Error("after the verdict"));

    expect(run.complaints()).toEqual([expect.stringContaining("the report could not be written")]);
  });
});
