import { describe, it, expect } from "vitest";

import { ciSourcePathsOf } from "./ciSourcePaths.js";
import { readerOf } from "./ciPathReader.test-utils.js";

describe("[SCN-CLI-091] a CI input names either one workflow file or a directory of them", () => {
  it.each<[string, Record<string, string[]>, string, string[]]>([
    [
      "resolves a directory to every workflow file in it, so a check in any of them is observed",
      { ".github/workflows": ["nightly.yml", "ci.yml"] },
      ".github/workflows",
      [".github/workflows/ci.yml", ".github/workflows/nightly.yml"],
    ],
    [
      "keeps both YAML spellings, because a target picks one and the tool does not get to mind",
      { "wf": ["a.yaml", "b.yml"] },
      "wf",
      ["wf/a.yaml", "wf/b.yml"],
    ],
  ])("%s", (_title, dirs, input, expected) => {
    const reader = readerOf(dirs, []);

    expect(ciSourcePathsOf(input, reader)).toEqual(expected);
  });

  it("ignores a non-workflow file sitting in the directory rather than trying to parse it", () => {
    const reader = readerOf({ "wf": ["README.md", "ci.yml", "config.json"] }, []);

    expect(ciSourcePathsOf("wf", reader)).toEqual(["wf/ci.yml"]);
  });

  it("resolves an absent path to nothing, which is the fail-safe direction", () => {
    expect(ciSourcePathsOf(".github/workflows", readerOf({}, []))).toEqual([]);
  });
});
