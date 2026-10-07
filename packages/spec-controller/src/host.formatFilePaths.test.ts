import { describe, expect, it } from "vitest";
import { formatFilePaths } from "./host.js";

describe("[SCN-RMG-010] the host collects the file paths its command's --format values name", () => {
  it("takes each value's path after its first colon, and skips a format bound for stdout", () => {
    const argv = ["--features", "f", "--format", "md", "--format", "json:out.json", "--target", "t", "--format", "md:a:b.md"];

    expect(formatFilePaths(argv)).toEqual(["out.json", "a:b.md"]);
  });

  it("collects nothing from a command with no --format, or one left without a value", () => {
    expect(formatFilePaths(["--features", "f"])).toEqual([]);
    expect(formatFilePaths(["--format"])).toEqual([]);
  });

  it("reads a lone --format's path, and leaves another flag's value to that flag, even one shaped like a format", () => {
    expect(formatFilePaths(["--format", "md:x"])).toEqual(["x"]);
    expect(formatFilePaths(["--target", "md:t", "--format", "json:y"])).toEqual(["y"]);
  });
});
