import { describe, expect, it } from "vitest";
import { runRequestOf } from "./runRequest.js";

const balanceRequested = (args: readonly string[]) => {
  const request = runRequestOf(["balance", ...args]);
  if (!("command" in request) || request.command !== "balance") throw new Error(`balance was not requested: ${JSON.stringify(request)}`);
  return request;
};

describe("a command reads each argument as what it is, or refuses it", () => {
  it("[CLM-CLI-121] a command line had a flag and its value as two arguments: when it is read, the flag will take that value", () => {
    expect(balanceRequested(["--features", "specs", "--vitest", "vitest.json"]).inputs.filter(({ byDefault }) => !byDefault)).toEqual([
      { kind: "features", path: "specs", byDefault: false },
      { kind: "vitest", path: "vitest.json", byDefault: false },
    ]);
  });

  it("[CLM-CLI-121] a command line had --target and --source-sha, each with its value as the next argument: when it is read, each flag will take that value", () => {
    const { target, sourceSha } = balanceRequested(["--target", "acme", "--source-sha", "abc123"]);

    expect({ target, sourceSha }).toEqual({ target: "acme", sourceSha: "abc123" });
  });

  it("[CLM-CLI-122] a command line had a flag that takes no value: when it is read, the flag will be on", () => {
    expect([balanceRequested(["--strict"]).strict, balanceRequested(["--exit-zero"]).exitZero]).toEqual([true, true]);
  });

  it("[CLM-CLI-122] a command line had allocate's --new, a flag that takes no value: when it is read, the flag will be on", () => {
    expect(runRequestOf(["allocate", "ABC", "--new"])).toEqual({ command: "allocate", featureCode: "ABC", asNewFeatureCode: true });
  });

  it("[CLM-CLI-123] a command line had --format twice: when it is read, each report will be made", () => {
    expect(balanceRequested(["--format", "md", "--format", "json:report.json"]).outputs).toEqual([
      { format: "md", destination: { to: "standard-output" } },
      { format: "json", destination: { to: "file", path: "report.json" } },
    ]);
  });

  it("[CLM-CLI-124] a command line had a command's flags in two different orders: when it is read, both orders will be read the same", () => {
    expect(balanceRequested(["--strict", "--features", "specs", "--target", "acme"])).toEqual(balanceRequested(["--target", "acme", "--features", "specs", "--strict"]));
  });
});

describe("an input left out takes its default", () => {
  it.each([
    ["CLM-CLI-136", "feature corpus", "the features folder", "features", "features"],
    ["CLM-CLI-137", "manifest", "package.json", "manifest", "package.json"],
    ["CLM-CLI-138", "CI workflows", "the .github/workflows folder", "workflows", ".github/workflows"],
  ] as const)("[%s] the run named no %s: when balance reads its inputs, balance will use %s", (_clm, _input, _default, kind, path) => {
    expect(balanceRequested([]).inputs.filter((input) => input.kind === kind)).toEqual([{ kind, path, byDefault: true }]);
  });
});

describe("you will get the report format you named", () => {
  it("[CLM-FMT-001] a run had its report to write: when you ask for no format, the Markdown report is asked for", () => {
    expect(balanceRequested([]).outputs).toEqual([{ format: "md", destination: { to: "standard-output" } }]);
  });
});

describe("an argument the tool does not accept will stop the run", () => {
  it.each([
    ["CLM-CLI-126", ["balance", "--"], "unknown-flag", { command: "balance", flag: "--" }],
    ["CLM-CLI-126", ["balance", "-hx"], "unknown-flag", { command: "balance", flag: "-x" }],
    ["CLM-CLI-126", ["balance", "-h=1"], "unknown-flag", { command: "balance", flag: "-=" }],
    ["CLM-CLI-126", ["allocate", "ABC", "-hn"], "unknown-flag", { command: "allocate", flag: "-n" }],
    ["CLM-CLI-127", ["balance", "--features", "--strict"], "missing-value", { flag: "--features" }],
    ["CLM-CLI-129", ["balance", "--target", "acme", "stray"], "stray-argument", { argument: "stray" }],
    ["CLM-CLI-130", ["balance", "--strict", "--strict"], "repeated-flag", { flag: "--strict" }],
    ["CLM-CLI-131", ["balance", "--strict=yes"], "equals-form", { given: "--strict=yes", spelling: "--strict yes" }],
    ["CLM-CLI-133", ["balance", "--format", "html"], "unknown-format", { format: "html", formats: "md, json" }],
    ["CLM-CLI-134", ["allocate"], "no-feature-code", {}],
  ] as const)("[%s] a command line had %j: when it is read, the run will stop, refused as %s, naming its facts", (_clm, args, key, values) => {
    const request = runRequestOf(args);

    expect("refusals" in request && request.refusals).toEqual([{ key, values }]);
  });
});
