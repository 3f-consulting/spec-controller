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

  it("[CLM-CLI-122] a flag that takes no value: the flag is on", () => {
    expect([balanceRequested(["--strict"]).strict, balanceRequested(["--exit-zero"]).exitZero]).toEqual([true, true]);
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
