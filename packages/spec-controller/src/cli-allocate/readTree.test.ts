import { describe, it, expect } from "vitest";
import { isWalkedDirectory } from "./readTree.js";

describe("[SCN-ALC-004] with no history to read, a code is still offered and the boundary is stated", () => {
  it("walks the corpus's own directories", () => {
    expect(["features", "src", "doc"].map(isWalkedDirectory)).toEqual([true, true, true]);
  });

  it("never walks a package store, whose packages carry their own codes", () => {
    expect(isWalkedDirectory("node_modules")).toBe(false);
  });

  it("never walks a hidden directory", () => {
    expect([".git", ".hidden", ".cache"].map(isWalkedDirectory)).toEqual([false, false, false]);
  });
});
