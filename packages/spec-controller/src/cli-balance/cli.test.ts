import { describe, it, expect } from "vitest";
import { CORE_MESSAGES, CoreMessage } from "@3f-consulting/spec-controller-core/internal";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkInputsExist, checkInputsParse } from "./cli.js";
import { jsonInputsOf, readReports } from "./unreadableInputs.js";
import { cliRegistry } from "../cliRegistry.js";
import { checkUnknownFlags, parseArgs } from "../cliArgs.js";
import { APP_MESSAGES, AppError, AppMessage } from "../messages.js";
import { message } from "../appText.js";
import { resolveToolIdentity } from "../run-management/resolveRunInputs.js";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { captured } from "./balanceRun.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { errorCodesShown, printedRefusal, shownText } from "../shownText.test-utils.js";

describe("[SCN-CLI-002] checkInputsExist rejects a supplied input path that does not exist", () => {
  const flags = ["vitest", "pytest", "jest", "junit", "rspec", "cucumber", "features", "ci", "package-json"] as const;

  it.each(flags)(
    "returns a typed error naming --%s and the missing path when that flag's path is absent",
    (flag) => {
      const missing = `does/not/exist/${flag}.missing`;
      const error = checkInputsExist({ [flag]: missing }, () => false);
      expect(error).not.toBeNull();
      expect(error).toContain(`--${flag}`);
      expect(error).toContain(missing);
    },
  );
});

describe("[SCN-CLI-014] checkInputsParse rejects a supplied report that exists but cannot be parsed", () => {
  const jsonInputs = [
    ["vitest", AppMessage.FlaggedReport],
    ["cucumber", AppMessage.FlaggedReport],
    ["package-json", AppMessage.FlaggedManifest],
    ["ci-steps", AppMessage.FlaggedRecord],
  ] as const;

  function reasonOf(text: string): string {
    try {
      JSON.parse(text);
    } catch (err) {
      return (err as Error).message;
    }
    throw new Error("the text parsed");
  }

  it("runBalance refuses a --vitest report that exists but is not JSON at exit 2, with the parse refusal alone naming it and the parser's own reason, reconciling nothing", () => {
    const dir = temporaryDirectory("vitest-unparseable-");
    const path = join(dir, "vitest.json");
    const text = "not valid json at all {{{";
    writeFileSync(path, text);
    let reason = "";
    try {
      JSON.parse(text);
    } catch (err) {
      reason = (err as Error).message;
    }
    expect(reason).not.toBe("");

    expect(captured(["--features", "tests/fixtures/evidence-observation/features", "--vitest", path])).toEqual({
      report: "",
      stderr: APP_MESSAGES[AppMessage.NotValidJson](APP_MESSAGES[AppMessage.FlaggedReport]("--vitest"), path, reason) + "\n",
      exitCode: 2,
    });
  });

  it.each(jsonInputs)(
    "names --%s as its declaration names it, with the path and the parser's reason, when it is not valid JSON",
    (flag, subject) => {
      const path = `reports/${flag}.json`;
      const error = checkInputsParse(readReports(jsonInputsOf({ [flag]: path }, () => false), () => "not valid json at all {{{"));

      expect(error).toBe(APP_MESSAGES[AppMessage.NotValidJson](APP_MESSAGES[subject](`--${flag}`), path, reasonOf("not valid json at all {{{")));
    },
  );
});

describe("[SCN-CLI-015] balance rejects a saved report the tool cannot read", () => {
  function failureOf(act: () => unknown): string {
    try {
      act();
    } catch (err) {
      return (err as Error).message;
    }
    throw new Error("expected the act to fail");
  }

  function refusalFor(path: string, reason: string): string {
    return (
      APP_MESSAGES[AppMessage.CouldNotBeReadAt](
        APP_MESSAGES[AppMessage.FlaggedSavedReport]("--render-from-json"),
        path,
        reason,
      ) + "\n"
    );
  }

  it("runBalance refuses a MISSING saved report at exit 2, naming it and the file system's reason, rendering nothing", () => {
    const dir = temporaryDirectory("render-missing-");
    const missing = join(dir, "does-not-exist.json");
    const reason = failureOf(() => readFileSync(missing, "utf8"));

    expect(captured(["--render-from-json", missing])).toEqual({
      report: "",
      stderr: refusalFor(missing, reason),
      exitCode: 2,
    });
  });
});

describe("[SCN-CLI-004] runBalance sets the out-of-balance exit code AFTER emitting the report in full, never a truncating process.exit", () => {
  it("emits the whole Evidence Reconciliation to stdout AND sets process.exitCode = 1, returning normally", () => {
    const { stdout: emitted, exitCode } = runBalanceCaptured([
      "--features",
      "tests/fixtures/evidence-observation/features",
      "--vitest",
      "tests/fixtures/evidence-observation/vitest.json",
    ]);

    expect(`\n${emitted}`).toContain(`\n${CORE_MESSAGES[CoreMessage.ReportTitle]}`);
    expect(emitted).toMatch(/out-of-balance/);
    expect(exitCode).toBe(1);
  });
});

describe("[SCN-CLI-012] runBalance exits 4 for a run carrying broken evidence, PRE-EMPTING the out-of-balance verdict", () => {
  it("emits the report in full AND sets process.exitCode = 4 — not the 1 the same run's out-of-balance verdict would otherwise give", () => {
    const { stdout: emitted, exitCode } = runBalanceCaptured([
      "--features",
      "tests/fixtures/broken/features",
      "--vitest",
      "tests/fixtures/broken/vitest.json",
      "--package-json",
      "tests/fixtures/broken/package.json",
    ]);

    expect(`\n${emitted}`).toContain(`\n${CORE_MESSAGES[CoreMessage.ReportTitle]}`);
    expect(emitted).toMatch(/out-of-balance/);
    expect(exitCode).toBe(4);
  });
});

describe("[SCN-CLI-019] runBalance exits 5 for a run with nothing to reconcile, PRE-EMPTING the vacuously-balanced verdict", () => {
  it("emits the report in full AND sets process.exitCode = 5 — not the 0 the same run's vacuously-true balance verdict would otherwise give", () => {
    const { stdout: emitted, exitCode } = runBalanceCaptured([
      "--features",
      "tests/fixtures/nothing-to-reconcile/features",
      "--package-json",
      "tests/fixtures/nothing-to-reconcile/package.json",
      "--ci",
      "tests/fixtures/nothing-to-reconcile",
    ]);

    expect(`\n${emitted}`).toContain(`\n${CORE_MESSAGES[CoreMessage.ReportTitle]}`);
    expect(`\n${emitted}`).toContain(`\n| ${CORE_MESSAGES[CoreMessage.ClaimReconciliationSubject]} | 0 | 0 | 0 |`);
    expect(exitCode).toBe(5);
  });
});

describe("[SCN-CLI-010] runBalance leaves the exit code 0 for an only-Pending-Items run when --strict is not given", () => {
  it("emits the balanced-with-pending report AND leaves process.exitCode at its default 0, returning normally", () => {
    const { stdout: emitted, exitCode } = runBalanceCaptured([
      "--features",
      "tests/fixtures/pending-only/features",
      "--package-json",
      "tests/fixtures/pending-only/package.json",
      "--ci",
      "tests/fixtures/pending-only",
    ]);

    expect(`\n${emitted}`).toContain(`\n${CORE_MESSAGES[CoreMessage.ReportTitle]}`);
    expect(emitted).toMatch(/Pending Item/);
    expect(exitCode).toBe(0);
  });
});

const REFUSING_TOOL_VERSION = "9.9.9-test";

describe("[SCN-CLI-009] checkUnknownFlags bounds balance to the flags the registry names", () => {

  it("returns a typed usage error naming an unregistered flag (the swallowed-typo footgun)", () => {
    const bogus = shownText(checkUnknownFlags({ bogus: "true" }, cliRegistry, "balance", REFUSING_TOOL_VERSION));
    expect(bogus).not.toBeNull();
    expect(bogus).toContain("--bogus");

    const typo = shownText(checkUnknownFlags({ strcit: "true" }, cliRegistry, "balance", REFUSING_TOOL_VERSION));
    expect(typo).not.toBeNull();
    expect(typo).toContain("--strcit");
  });

  it("names the version that refused and the bump as the cure, so a pinned reader's skew is legible", () => {
    const refusal = shownText(checkUnknownFlags({ bogus: "true" }, cliRegistry, "balance", REFUSING_TOOL_VERSION));
    expect(refusal).not.toBeNull();
    expect(refusal).toContain(REFUSING_TOOL_VERSION);
    expect(refusal).toMatch(/bump the pin/i);
  });

  it("reads balance --features dir --strict as the value flag's value and the switch's true, and no key for a lone -", () => {
    expect(parseArgs(["--features", "dir", "--strict"])).toEqual({ features: "dir", strict: "true" });
    expect(parseArgs(["-", "--strict"])).toEqual({ strict: "true" });
  });

  function runRefused(argv: string[]): { stdout: string; stderr: string; exitCode: number } {
    const { stdout, stderr, exitCode } = runBalanceCaptured(argv);
    return { stdout, stderr, exitCode };
  }

  it("refuses each host modifier given after balance as a modifier out of place, not as unregistered, reconciling nothing", () => {
    for (const modifier of cliRegistry.global) {
      expect(runRefused(["--features", "dir", modifier.name, "x"]), modifier.name).toEqual({
        stdout: "",
        stderr:
          printedRefusal(
            AppError.MisplacedModifier,
            `${message(AppError.MisplacedModifier, { modifier: modifier.name, command: "balance" })}\n${message(AppMessage.SeeModifiers)}`,
            "balance",
          ) + "\n",
        exitCode: 2,
      });
    }
  });

  it("refuses --nosuch as unregistered at balance's scope, naming the version that refused, reconciling nothing", () => {
    const scope = "spec-controller balance";
    expect(runRefused(["--nosuch"])).toEqual({
      stdout: "",
      stderr:
        printedRefusal(
          AppError.UnknownFlag,
          `${message(AppError.UnknownFlag, { flag: "--nosuch", scope, toolVersion: resolveToolIdentity().toolVersion, command: "balance" })}\n` +
            `${message(AppMessage.PinDrifted, { command: "balance", flag: "--nosuch" })}\n` +
            message(AppMessage.OtherwiseSeeFlags, { scope }),
          "balance",
        ) + "\n",
      exitCode: 2,
    });
  });
});

describe("[SCN-MSG-010] an error shows its reader the error code of what went wrong — a flag the command does not take", () => {
  it("prints balance's refusal of --nosuch with [unknown-flag] once, after the usage-error prefix, and no code on its pointer lines", () => {
    const { stderr, exitCode } = runBalanceCaptured(["--nosuch"]);
    const words = message(AppError.UnknownFlag, {
      flag: "--nosuch",
      scope: "spec-controller balance",
      toolVersion: resolveToolIdentity().toolVersion,
      command: "balance",
    });
    expect(exitCode).toBe(2);
    expect(errorCodesShown(stderr)).toEqual({ opening: ["unknown-flag"], after: [] });
    expect(stderr.split("\n")[0]).toBe(`spec-controller balance: usage error [unknown-flag] — ${words}`);
  });
});

describe("[SCN-CLI-003] checkInputsExist treats an OMITTED optional flag as nothing-to-validate, not missing", () => {
  it("returns null for an omitted flag even when other flags are supplied and present", () => {
    const args = { vitest: "reports/vitest.json", features: "features" };
    const exists = (path: string) =>
      path === "reports/vitest.json" || path === "features";
    expect(checkInputsExist(args, exists)).toBeNull();
  });
});

describe("[SCN-CLI-013] the tally, the verdict headline and the process exit code name the same outcome", () => {
  const RUNS = [
    {
      name: "an all-balanced run",
      argv: [
        "--features", "tests/fixtures/balanced/features",
        "--vitest", "tests/fixtures/balanced/vitest.json",
        "--package-json", "tests/fixtures/balanced/package.json",
        "--ci", "tests/fixtures/balanced",
      ],
      outOfBalance: 0,
      word: "BALANCED",
      exit: 0,
    },
    {
      name: "a run whose only out-of-balance row is the unnamed claim's reconciliation",
      argv: [
        "--features", "tests/fixtures/unnamed-claim-only/features",
        "--vitest", "tests/fixtures/unnamed-claim-only/vitest.json",
        "--package-json", "tests/fixtures/unnamed-claim-only/package.json",
        "--ci", "tests/fixtures/unnamed-claim-only/ci.yml",
      ],
      outOfBalance: 1,
      word: "OUT-OF-BALANCE",
      exit: 1,
    },
    {
      name: "an unsound run carrying a collection-failed suite",
      argv: [
        "--features", "tests/fixtures/broken/features",
        "--vitest", "tests/fixtures/broken/vitest.json",
        "--package-json", "tests/fixtures/broken/package.json",
        "--ci", "tests/fixtures/broken",
      ],
      outOfBalance: 2,
      word: "UNSOUND",
      exit: 4,
    },
  ] as const;

  function threeViewsOf(argv: readonly string[]): { outOfBalance: number; word: string; headlineExit: number; exitCode: number } {
    const { stdout: emitted, exitCode } = runBalanceCaptured(argv);
    const tally = emitted
      .split("\n")
      .find((line) => line.startsWith(`| ${CORE_MESSAGES[CoreMessage.ClaimReconciliationSubject]} | `))
      ?.match(/^\|[^|]+\| (\d+) \| (\d+) \| (\d+) \|/);
    expect(tally, `expected a ${CORE_MESSAGES[CoreMessage.ClaimReconciliationSubject]} tally row; got:\n${emitted}`).not.toBeNull();
    const headline = emitted.match(/^\*\*(BALANCED|OUT-OF-BALANCE|UNSOUND)\*\* — .*\(exit (\d+)\)$/m);
    expect(headline, `expected a run-verdict headline; got:\n${emitted}`).not.toBeNull();
    return {
      outOfBalance: Number(tally?.[3]),
      word: String(headline?.[1]),
      headlineExit: Number(headline?.[2]),
      exitCode,
    };
  }

  for (const run of RUNS) {
    it(`names one outcome across all three views for ${run.name}`, () => {
      const views = threeViewsOf(run.argv);

      expect(views.outOfBalance).toBe(run.outOfBalance);
      expect(views.word).toBe(run.word);
      expect(views.headlineExit).toBe(run.exit);
      expect(views.exitCode).toBe(run.exit);

      expect(views.headlineExit).toBe(views.exitCode);
      expect(views.outOfBalance > 0).toBe(views.exitCode !== 0);
      expect(views.word === "BALANCED").toBe(views.outOfBalance === 0);
    });
  }
});
