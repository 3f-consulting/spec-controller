import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ExitCode } from "../runEnding/runEnding.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";

interface Ended {
  readonly exitCode: ExitCode;
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
  const exitCode = main(
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
  return { exitCode, output, complaints: error.split("\n").filter((line) => line.includes("unexpected error")) };
}

const UNSHOWABLE = {
  toString: () => {
    throw new Error("it cannot be shown");
  },
};

describe("an unexpected error will stop the run with no verdict and exit 4, naming the error", () => {
  it.each([
    ["CLM-CLI-176", "an error nothing else handles", new Error("nothing handles this"), "nothing handles this"],
    ["CLM-CLI-177", "an error that cannot be formatted", UNSHOWABLE, "could not be shown"],
    ["CLM-CLI-178", "an error before the run reached its verdict", new RangeError("before the verdict"), "RangeError: before the verdict"],
  ] as const)("[%s] %s: the run stops, no verdict, exit 4, and a complaint with the error, under its error code", (_clm, _error, thrown, shown) => {
    const { exitCode, output, complaints } = balanceRun({ inBalance: thrown });

    expect({ exitCode, output, complaints: complaints.map((line) => line.includes(shown)) }).toEqual({ exitCode: 4, output: "", complaints: [true] });
  });
});

describe("an unexpected error after the run verdict will leave its exit code alone", () => {
  it("[CLM-CLI-181] a run out of balance whose report cannot be written exits 1, its verdict's code", () => {
    expect(balanceRun({ onOutput: new Error("the report could not be written") }).exitCode).toBe(1);
  });
});
