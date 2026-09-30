import { describe, it, expect } from "vitest";

import { ciSourcePathsOf, type CiPathReader } from "./ciSourcePaths.js";

function readerOf(dirs: Record<string, string[]>, files: readonly string[]): CiPathReader {
  return {
    exists: (path) => path in dirs || files.includes(path),
    isDirectory: (path) => path in dirs,
    readDir: (path) => dirs[path] ?? [],
  };
}

describe("[SCN-USG-006] a CI input names either one workflow file or a directory of them", () => {
  it("resolves a directory to every workflow file in it, so a check in any of them is observed", () => {
    const reader = readerOf({ ".github/workflows": ["nightly.yml", "ci.yml"] }, []);

    expect(ciSourcePathsOf(".github/workflows", reader)).toEqual([
      ".github/workflows/ci.yml",
      ".github/workflows/nightly.yml",
    ]);
  });

  it("keeps both YAML spellings, because a target picks one and the tool does not get to mind", () => {
    const reader = readerOf({ "wf": ["a.yaml", "b.yml"] }, []);

    expect(ciSourcePathsOf("wf", reader)).toEqual(["wf/a.yaml", "wf/b.yml"]);
  });

  it("ignores a non-workflow file sitting in the directory rather than trying to parse it", () => {
    const reader = readerOf({ "wf": ["README.md", "ci.yml", "config.json"] }, []);

    expect(ciSourcePathsOf("wf", reader)).toEqual(["wf/ci.yml"]);
  });

  it("resolves a file to that file ALONE — an explicit input is a narrowing, not a hint", () => {
    const reader = readerOf({ "wf": ["ci.yml", "nightly.yml"] }, ["wf/ci.yml"]);

    expect(ciSourcePathsOf("wf/ci.yml", reader)).toEqual(["wf/ci.yml"]);
  });

  it("resolves an absent path to nothing, which is the fail-safe direction", () => {
    expect(ciSourcePathsOf(".github/workflows", readerOf({}, []))).toEqual([]);
  });

  it("resolves an empty directory to nothing, the same as an absent one", () => {
    expect(ciSourcePathsOf("wf", readerOf({ "wf": [] }, []))).toEqual([]);
  });
});
