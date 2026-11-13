import { describe, expect, it } from "vitest";
import { runRequestOf } from "./runRequest.js";

describe("a flag the command takes will take effect", () => {
  it("[CLM-CLI-121] a flag and its value as two arguments: the flag takes that value", () => {
    const request = runRequestOf(["balance", "--features", "specs", "--vitest", "vitest.json"]);

    expect(request.command === "balance" ? request.inputs : []).toEqual([
      { kind: "features", path: "specs", byDefault: false },
      { kind: "vitest", path: "vitest.json", byDefault: false },
    ]);
  });
});

describe("you get what you asked for", () => {
  it.each([
    ["CLM-FMT-001", "no format", { format: "md" }],
    ["CLM-FMT-016", "no destination", { destination: { to: "standard-output" } }],
  ] as const)("[%s] a balance command line naming %s gives one report, with that default", (_clm, _named, expected) => {
    const request = runRequestOf(["balance", "--vitest", "vitest.json"]);

    expect(request.command === "balance" ? request.outputs : []).toEqual([expect.objectContaining(expected)]);
  });
});
