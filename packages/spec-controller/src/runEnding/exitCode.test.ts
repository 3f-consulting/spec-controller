import type { RunVerdict } from "@3f-consulting/spec-controller-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "../commands/main.js";
import { exitCodeOf } from "./exitCode.js";
import exitCodeVariants from "./exitCode.variants.json" with { type: "json" };

const NOT_RECONCILED_BECAUSE: Readonly<Record<string, RunVerdict>> = {
  unsound: { verdict: "not-reconciled", why: "unsound" },
  "claim code errors": { verdict: "not-reconciled", why: "claim-code-errors" },
  "nothing to reconcile": { verdict: "not-reconciled", why: "nothing-to-reconcile" },
};

describe("each run verdict will have its exit code", () => {
  it("[CLM-CLI-166] a run reached the run verdict balanced: when it ends, it will exit 0", () => {
    expect(exitCodeOf({ verdict: "balanced" }, { exitZero: false })).toBe(0);
  });

  it.each(exitCodeVariants["CLM-CLI-168"].variants)("[CLM-CLI-168] a run reached the run verdict not reconciled, because %s: when it ends, it will exit 3", (why) => {
    const runVerdict = NOT_RECONCILED_BECAUSE[why];
    if (runVerdict === undefined) throw new Error(`no run verdict for the variant ${why}`);

    expect(exitCodeOf(runVerdict, { exitZero: false })).toBe(3);
  });
});

const quiet = { output: { fd: 1, write: () => {} }, error: { fd: 2, write: () => {} } };

// Each exit code --exit-zero leaves alone, as a run under --exit-zero reaches it.
const EXIT_UNDER_EXIT_ZERO: Readonly<Record<string, { readonly code: number; readonly exitCode: () => number }>> = {
  "2 (a usage error)": { code: 2, exitCode: () => main(["balance", "--exit-zero", "--bogus"], temporaryDirectory("exit-zero-"), quiet) },
  "3 (not reconciled)": { code: 3, exitCode: () => exitCodeOf({ verdict: "not-reconciled", why: "unsound" }, { exitZero: true }) },
  "4 (an unexpected error)": {
    code: 4,
    exitCode: () =>
      main(["balance", "--exit-zero"], temporaryDirectory("exit-zero-"), quiet, {
        balance: () => {
          throw new Error("an error before the verdict");
        },
      }),
  },
};

describe("--exit-zero will change exit 1 to 0 and leave exit 3 alone", () => {
  it("[CLM-CLI-172] a run's evidence was out of balance: when it runs under --exit-zero, it will exit 0", () => {
    const folder = temporaryDirectory("exit-zero-");
    mkdirSync(join(folder, "features"));
    writeFileSync(join(folder, "features", "one.feature"), "@ONE\nFeature: one\n\n  @unit @CLM-ONE-001\n  Scenario: one\n");
    const balanced = (args: readonly string[]) => main(["balance", "--features", join(folder, "features"), ...args], folder, quiet);

    expect([balanced([]), balanced(["--exit-zero"])]).toEqual([1, 0]);
  });

  it.each(exitCodeVariants["CLM-CLI-173"].variants)("[CLM-CLI-173] a run's evidence ended on %s: when it runs under --exit-zero, it will exit that code", (ending) => {
    const run = EXIT_UNDER_EXIT_ZERO[ending];
    if (run === undefined) throw new Error(`no run for the variant ${ending}`);

    expect(run.exitCode()).toBe(run.code);
  });
});
