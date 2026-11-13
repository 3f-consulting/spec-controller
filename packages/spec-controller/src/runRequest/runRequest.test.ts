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
