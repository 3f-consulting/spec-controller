import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import crashGuardsVariants from "../runEnding/crashGuards.variants.json" with { type: "json" };
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

// balance run, with the flags given, over a corpus of one claim with no evidence, so its run verdict is out of balance.
function balanceRun(throwing: { readonly inBalance?: unknown; readonly onOutput?: unknown }, flags: readonly string[] = []): Ended {
  const folder = temporaryDirectory("unexpected-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n");
  let output = "";
  let error = "";
  const run = (): ExitCode =>
    main(
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

// The error is thrown where the bin loads the program, under the guards the bin loads it with.
async function programLoadFailing(thrown: unknown): Promise<Ended> {
  let error = "";
  let exitCode: ExitCode | string = "the run did not end";
  await loadGuarded(
    () => Promise.reject(thrown),
    complainerTo((text) => (error += text)),
    (code) => (exitCode = code),
  );
  return { exitCode, output: "", complaints: error.split("\n").filter((line) => line.includes("unexpected error")) };
}

// Each unexpected error, where the run meets it, and how its complaint shows it.
const MET: Readonly<Record<string, { readonly ended: () => Ended | Promise<Ended>; readonly shown: string }>> = {
  "one nothing else handles": { ended: () => balanceRun({ inBalance: new Error("nothing handles this") }), shown: "nothing handles this" },
  "one that cannot be formatted": { ended: () => balanceRun({ inBalance: UNSHOWABLE }), shown: "could not be shown" },
  "one before the run reached its verdict": { ended: () => balanceRun({ inBalance: new RangeError("before the verdict") }), shown: "RangeError: before the verdict" },
  "one while the program loads": { ended: () => programLoadFailing(new Error("a module could not load")), shown: "Error: a module could not load" },
};

describe("the run reports an error it did not expect, rather than crashing silently", () => {
  it.each(crashGuardsVariants["CLM-CLI-176"].variants)(
    "[CLM-CLI-176] when the run meets an unexpected error, %s: the run will stop, give no verdict and exit 4, and it will complain, naming the error",
    async (variant) => {
      const met = MET[variant];
      if (met === undefined) throw new Error(`no unexpected error for the variant ${variant}`);

      const { exitCode, output, complaints } = await met.ended();

      expect({ exitCode, output, complaints: complaints.map((line) => line.startsWith("[unexpected-error] ") && line.includes(met.shown)) }).toEqual({ exitCode: 4, output: "", complaints: [true] });
    },
  );
});

describe("an unexpected error after the run verdict will leave its exit code alone", () => {
  it("[CLM-CLI-181] a run reached its run verdict, out of balance under --exit-zero: when it meets an unexpected error, writing its report, it will exit with its run verdict's code, 0", () => {
    const { exitCode, complaints } = balanceRun({ onOutput: new Error("the report could not be written") }, ["--exit-zero"]);

    expect({ exitCode, complaints: complaints.length }).toEqual({ exitCode: 0, complaints: 1 });
  });
});
