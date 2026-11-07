import { describe, it, expect } from "vitest";
import { peekFlag } from "./host.js";

describe("[CLM-RMG-004] the global --store host modifier parses and wraps before dispatch", () => {

  it("peeks a provenance flag's value without consuming it", () => {
    expect(peekFlag(["--target", "demo", "--features", "f"], "target")).toBe("demo");
    expect(peekFlag(["--features", "f"], "target")).toBeUndefined();
    expect(peekFlag(["--target"], "target")).toBeUndefined();
  });
});
