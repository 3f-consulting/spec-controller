import { describe, expect, it } from "vitest";
import { runRequestOf, type RunRequest } from "./runRequest.js";

const balanceRequested = (args: readonly string[]) => runRequestOf(["balance", ...args]) as Extract<RunRequest, { command: "balance" }>;

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

  it("[CLM-CLI-124] two command lines with the same flags in different orders are read the same", () => {
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

describe("you will get the report format you ask for", () => {
  it("[CLM-FMT-001] no format named: the Markdown report is asked for", () => {
    expect(balanceRequested([]).outputs).toEqual([{ format: "md", destination: { to: "standard-output" } }]);
  });
});

describe("an argument the tool does not accept will stop the run", () => {
  it.each([
    ["CLM-CLI-126", ["balance", "--"], "unknown-flag", { command: "balance", flag: "--" }],
    ["CLM-CLI-127", ["balance", "--features", "--strict"], "missing-value", { flag: "--features" }],
    ["CLM-CLI-129", ["balance", "--target", "acme", "stray"], "stray-argument", { argument: "stray" }],
    ["CLM-CLI-130", ["balance", "--strict", "--strict"], "repeated-flag", { flag: "--strict" }],
    ["CLM-CLI-133", ["balance", "--format", "html"], "unknown-format", { format: "html", formats: "md, json" }],
  ] as const)("[%s] %j is refused as %s, with its facts", (_clm, args, key, values) => {
    const requested = runRequestOf(args);

    expect("refusals" in requested && requested.refusals).toEqual([{ key, values }]);
  });
});
