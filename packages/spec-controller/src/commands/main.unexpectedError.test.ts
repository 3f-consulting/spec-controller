import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@3f-consulting/spec-controller-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExitCode } from "../runEnding/runEnding.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";

// The core function that throws when the run reaches it, if any; every other runs as written.
const BREAKING: { at?: string } = {};

vi.mock("@3f-consulting/spec-controller-core", async (original) => {
  const written = await original<typeof core>();
  const breakable =
    <Args extends unknown[], Returned>(name: string, run: (...args: Args) => Returned) =>
    (...args: Args): Returned => {
      if (BREAKING.at === name) throw new Error(`a bug in ${name}`);
      return run(...args);
    };
  return {
    ...written,
    whereResultsByFileBreak: breakable("whereResultsByFileBreak", written.whereResultsByFileBreak),
    resultsByFileFrom: breakable("resultsByFileFrom", written.resultsByFileFrom),
    featureAsWrittenFrom: breakable("featureAsWrittenFrom", written.featureAsWrittenFrom),
    workflowStepsFrom: breakable("workflowStepsFrom", written.workflowStepsFrom),
    featureCodeOfFile: breakable("featureCodeOfFile", written.featureCodeOfFile),
  };
});

afterEach(() => {
  delete BREAKING.at;
});

interface Ended {
  readonly exitCode: ExitCode;
  readonly output: string;
  readonly complaints: readonly string[];
}

// balance run, with the flags given, over a corpus of one claim with no evidence, so its run verdict is out of balance.
function balanceRun(throwing: { readonly inBalance?: unknown; readonly onOutput?: unknown }, flags: readonly string[] = []): Ended {
  const folder = temporaryDirectory("unexpected-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n");
  let output = "";
  let error = "";
  const exitCode = main(
    ["balance", ...flags],
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

const PASSING_VITEST_REPORT =
  '{"testResults":[{"name":"/work/one.test.ts","status":"passed","message":"","assertionResults":[{"title":"[CLM-ONE-001] one","fullName":"[CLM-ONE-001] one","status":"passed","ancestorTitles":[],"failureMessages":[]}]}]}';
const WORKFLOW = "jobs:\n  ci:\n    steps:\n      - run: pnpm test\n";

// The command run over valid inputs, in a folder outside git holding a feature file of one claim and the files given,
// with the core function named throwing as the run reaches it.
function ranBreaking(at: string, args: readonly string[], files: Readonly<Record<string, string>>): Ended {
  const folder = temporaryDirectory("unexpected-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n");
  Object.entries(files).forEach(([path, text]) => {
    mkdirSync(join(folder, path, ".."), { recursive: true });
    writeFileSync(join(folder, path), text);
  });
  BREAKING.at = at;
  let output = "";
  let error = "";
  const exitCode = main(args, folder, { output: { fd: 1, write: (text) => (output += text) }, error: { fd: 2, write: (text) => (error += text) } });
  return { exitCode, output, complaints: error.split("\n").filter((line) => line.startsWith("[")) };
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

    expect({ exitCode, output, complaints: complaints.map((line) => line.startsWith("[unexpected-error] ") && line.includes(shown)) }).toEqual({ exitCode: 4, output: "", complaints: [true] });
  });

  it.each([
    ["a report's shape check", "whereResultsByFileBreak", ["balance", "--vitest", "vitest.json"], { "vitest.json": PASSING_VITEST_REPORT }],
    ["a report's reader", "resultsByFileFrom", ["balance", "--vitest", "vitest.json"], { "vitest.json": PASSING_VITEST_REPORT }],
    ["the feature-file reader", "featureAsWrittenFrom", ["balance"], {}],
    ["the workflow reader", "workflowStepsFrom", ["balance", "--ci", "workflows"], { "workflows/ci.yml": WORKFLOW }],
    ["allocate reading a feature file's code", "featureCodeOfFile", ["allocate", "ONE"], {}],
  ] as const)("[CLM-CLI-176] an error nothing else handles, in %s while it reads a valid input: the run stops, no verdict, exit 4, and a complaint with the error, under its error code", (_place, at, args, files) => {
    const { exitCode, output, complaints } = ranBreaking(at, args, files);

    expect({ exitCode, output, complaints: complaints.map((line) => line.startsWith("[unexpected-error] ") && line.includes(`Error: a bug in ${at}`)) }).toEqual({
      exitCode: 4,
      output: "",
      complaints: [true],
    });
  });
});

describe("an unexpected error after the run verdict will leave its exit code alone", () => {
  it("[CLM-CLI-181] a run out of balance under --exit-zero whose report cannot be written exits 0, its verdict's code", () => {
    const { exitCode, complaints } = balanceRun({ onOutput: new Error("the report could not be written") }, ["--exit-zero"]);

    expect({ exitCode, complaints: complaints.length }).toEqual({ exitCode: 0, complaints: 1 });
  });
});
