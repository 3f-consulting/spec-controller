import { describe, expect, it } from "vitest";
import { runRequestOf } from "./runRequest.js";

const balanceRequested = (args: readonly string[]) => {
  const request = runRequestOf(["balance", ...args]);
  if (!("command" in request) || request.command !== "balance") throw new Error(`balance was not requested: ${JSON.stringify(request)}`);
  return request;
};

describe("a flag the command takes will take effect", () => {
  it("[CLM-CLI-121] a flag and its value as two arguments: the flag takes that value", () => {
    expect(balanceRequested(["--features", "specs", "--vitest", "vitest.json"]).inputs.filter(({ byDefault }) => !byDefault)).toEqual([
      { kind: "features", path: "specs", byDefault: false },
      { kind: "vitest", path: "vitest.json", byDefault: false },
    ]);
  });

  it("[CLM-CLI-121] --target and --source-sha, each with its value as the next argument: each takes that value", () => {
    const { target, sourceSha } = balanceRequested(["--target", "acme", "--source-sha", "abc123"]);

    expect({ target, sourceSha }).toEqual({ target: "acme", sourceSha: "abc123" });
  });

  it("[CLM-CLI-122] a flag that takes no value: the flag is on", () => {
    expect([balanceRequested(["--strict"]).strict, balanceRequested(["--exit-zero"]).exitZero]).toEqual([true, true]);
  });

  it("[CLM-CLI-122] allocate's --new, which takes no value: the flag is on", () => {
    expect(runRequestOf(["allocate", "ABC", "--new"])).toEqual({ command: "allocate", featureCode: "ABC", asNewFeatureCode: true });
  });

  it("[CLM-CLI-123] --format twice: each report is made", () => {
    expect(balanceRequested(["--format", "md", "--format", "json:report.json"]).outputs).toEqual([
      { format: "md", destination: { to: "standard-output" } },
      { format: "json", destination: { to: "file", path: "report.json" } },
    ]);
  });

  it("[CLM-CLI-124] a command's flags in two different orders are read the same", () => {
    expect(balanceRequested(["--strict", "--features", "specs", "--target", "acme"])).toEqual(balanceRequested(["--target", "acme", "--features", "specs", "--strict"]));
  });
});

describe("balance will use the default when an input is not named", () => {
  it.each([
    ["CLM-CLI-136", "feature corpus", "features", "features"],
    ["CLM-CLI-137", "manifest", "manifest", "package.json"],
    ["CLM-CLI-138", "CI workflows", "workflows", ".github/workflows"],
  ] as const)("[%s] no %s named: balance uses %s", (_clm, _input, kind, path) => {
    expect(balanceRequested([]).inputs.filter((input) => input.kind === kind)).toEqual([{ kind, path, byDefault: true }]);
  });
});

describe("help will answer, and nothing will run", () => {
  it("[CLM-CLI-112] a request for help beside a flag before the command: help answers", () => {
    expect(runRequestOf(["--bogus", "--help"])).toEqual({ command: "help" });
  });
});

describe("you will get the report format you named", () => {
  it("[CLM-FMT-001] no format named: the Markdown report is asked for", () => {
    expect(balanceRequested([]).outputs).toEqual([{ format: "md", destination: { to: "standard-output" } }]);
  });
});

const BALANCE_HELP = "spec-controller balance --help";
const ALLOCATE_HELP = "spec-controller allocate --help";

describe("an argument the tool does not accept will stop the run", () => {
  it.each([
    ["CLM-CLI-125", ["frobnicate"], "unknown-command", { command: "frobnicate", help: "spec-controller --help" }],
    ["CLM-CLI-126", ["balance", "--bogus"], "unknown-flag", { command: "balance", flag: "--bogus", help: BALANCE_HELP }],
    ["CLM-CLI-126", ["balance", "--"], "unknown-flag", { command: "balance", flag: "--", help: BALANCE_HELP }],
    ["CLM-CLI-126", ["balance", "-hx"], "unknown-flag", { command: "balance", flag: "-x", help: BALANCE_HELP }],
    ["CLM-CLI-126", ["balance", "-h=1"], "unknown-flag", { command: "balance", flag: "-=", help: BALANCE_HELP }],
    ["CLM-CLI-126", ["allocate", "ABC", "-hn"], "unknown-flag", { command: "allocate", flag: "-n", help: ALLOCATE_HELP }],
    ["CLM-CLI-127", ["balance", "--features"], "missing-value", { flag: "--features", help: BALANCE_HELP }],
    ["CLM-CLI-127", ["balance", "--features", "--strict"], "missing-value", { flag: "--features", help: BALANCE_HELP }],
    ["CLM-CLI-128", ["balance", "--strict", "yes"], "unwanted-value", { flag: "--strict", value: "yes", help: BALANCE_HELP }],
    ["CLM-CLI-129", ["balance", "stray"], "stray-argument", { argument: "stray", help: BALANCE_HELP }],
    ["CLM-CLI-129", ["balance", "--target", "acme", "stray"], "stray-argument", { argument: "stray", help: BALANCE_HELP }],
    ["CLM-CLI-130", ["balance", "--target", "a", "--target", "b"], "repeated-flag", { flag: "--target", help: BALANCE_HELP }],
    ["CLM-CLI-130", ["balance", "--strict", "--strict"], "repeated-flag", { flag: "--strict", help: BALANCE_HELP }],
    ["CLM-CLI-131", ["balance", "--features=specs"], "equals-form", { given: "--features=specs", spelling: "--features specs", help: BALANCE_HELP }],
    ["CLM-CLI-131", ["balance", "--strict=yes"], "equals-form", { given: "--strict=yes", spelling: "--strict yes", help: BALANCE_HELP }],
    ["CLM-CLI-132", ["--features", "specs", "balance"], "flag-before-command", { flag: "--features", help: "spec-controller --help" }],
    ["CLM-CLI-133", ["balance", "--format", "html"], "unknown-format", { format: "html", formats: "md, json", help: BALANCE_HELP }],
    ["CLM-CLI-134", ["allocate"], "no-feature-code", { help: ALLOCATE_HELP }],
    ["CLM-CLI-135", ["allocate", "ABC", "DEF"], "extra-argument", { argument: "DEF", help: ALLOCATE_HELP }],
  ] as const)("[%s] %j is refused as %s, with its facts", (_clm, args, key, values) => {
    expect(runRequestOf(args)).toEqual({ refusals: [{ key, values }] });
  });
});
