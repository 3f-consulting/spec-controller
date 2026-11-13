import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { complainerTo, loadGuarded } from "../runEnding/crashGuards.js";
import type { ExitCode } from "../runEnding/runEnding.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";

interface Ended {
  // Or what escaped main, if anything did.
  readonly exitCode: ExitCode | string;
  readonly output: string;
  readonly complaints: readonly string[];
}

// balance run over a corpus of one claim with no evidence, so its run verdict is out of balance.
function balanceRun(throwing: { readonly inBalance?: unknown; readonly onOutput?: unknown }): Ended {
  const folder = temporaryDirectory("unexpected-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n");
  let output = "";
  let error = "";
  const run = (): ExitCode =>
    main(
    ["balance"],
    folder,
    {
      output: {
        fd: 1,
        write: (text) => {
          if ("onOutput" in throwing) throw throwing.onOutput;
          output += text;
        },
      },
      error: { fd: 2, write: (text) => (error += text) },
    },
    "inBalance" in throwing
      ? {
          balance: () => {
            throw throwing.inBalance;
          },
        }
      : {},
  );
  let exitCode: ExitCode | string;
  try {
    exitCode = run();
  } catch {
    exitCode = "an error escaped main";
  }
  return { exitCode, output, complaints: error.split("\n").filter((line) => line.includes("unexpected error")) };
}

const UNSHOWABLE = {
  toString: () => {
    throw new Error("it cannot be shown");
  },
};

describe("the run will give no verdict, and will exit 4", () => {
  it.each([
    ["CLM-CLI-176", "an error nothing else handles", new Error("nothing handles this"), "nothing handles this"],
    ["CLM-CLI-177", "an error that cannot be formatted", UNSHOWABLE, "could not be shown"],
    ["CLM-CLI-178", "an error before the run reached its verdict", new RangeError("before the verdict"), "RangeError: before the verdict"],
  ] as const)("[%s] %s: no verdict, exit 4, and a complaint with the error", (_clm, _error, thrown, shown) => {
    const { exitCode, output, complaints } = balanceRun({ inBalance: thrown });

    expect({ exitCode, output, complaints: complaints.map((line) => line.includes(shown)) }).toEqual({ exitCode: 4, output: "", complaints: [true] });
  });

  it("[CLM-CLI-179] an error while the program loads: no verdict, exit 4, and a complaint with the error", async () => {
    let complained = "";
    const ended: ExitCode[] = [];

    const loaded = await loadGuarded(
      () => Promise.reject(new Error("a module could not load")),
      complainerTo((text) => (complained += text)),
      (exitCode) => ended.push(exitCode),
    ).catch(() => "the load's error escaped");

    expect({ loaded, ended, complained: complained.includes("a module could not load") }).toEqual({ loaded: undefined, ended: [4], complained: true });
  });
});

describe("an unexpected error after the run verdict will leave its exit code alone", () => {
  it("[CLM-CLI-181] a run out of balance whose report cannot be written exits 1, its verdict's code", () => {
    const { exitCode, complaints } = balanceRun({ onOutput: new Error("the report could not be written") });

    expect({ exitCode, complaints: complaints.length }).toEqual({ exitCode: 1, complaints: 1 });
  });
});

describe("a run will complain about only one unexpected error", () => {
  it("[CLM-CLI-182] a run that met two unexpected errors complains about one of them", () => {
    let complained = "";
    const complain = complainerTo((text) => (complained += text));

    complain(new Error("the first"));
    complain(new Error("the second"));

    expect(complained.split("\n").filter((line) => line !== "").length).toBe(1);
  });
});
