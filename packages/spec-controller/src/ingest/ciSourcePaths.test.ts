/**
 * Unit test for the CI-source path resolution seam (@SCN-USG-006, 3F-2497).
 *
 * Bidirectional evidence: the describe/it carry the @SCN-USG-006 id matching
 * features/uncited-static-checks.feature, so a grep of the id returns both halves.
 *
 * WHAT THIS OWNS, AND WHAT IT DOES NOT. `ciSourcePathsOf` is the only place that
 * knows a CI input can be a DIRECTORY of workflows rather than one file — the whole
 * of the GitHub-layout knowledge this slice adds, kept at the ingest edge so the
 * core keeps taking anonymous sources. The @integration arm drives the real files
 * through the CLI; this arm pins the resolution rules, which are the part a fixture
 * cannot show going wrong in more than one way at a time.
 *
 * The filesystem is INJECTED rather than mocked at the module boundary: the rules
 * are then pure and each case states its own tree inline, so a reader can see what
 * is being claimed without reconstructing a temp directory in their head.
 */

import { describe, it, expect } from "vitest";

import { ciSourcePathsOf, type CiPathReader } from "./ciSourcePaths.js";

/** A tree stated as a literal: directories map to their entries, files list themselves. */
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

    // Sorted, so the resolution is deterministic — two runs over one tree must not
    // differ, and a diff of two reports must not turn on readdir's ordering.
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
    // A README or an actions/ subdirectory is ordinary in a workflows folder. Parsing
    // one would yield no run: commands anyway, but skipping by extension keeps the
    // reason legible instead of relying on the parse to fail quietly.
    const reader = readerOf({ "wf": ["README.md", "ci.yml", "config.json"] }, []);

    expect(ciSourcePathsOf("wf", reader)).toEqual(["wf/ci.yml"]);
  });

  it("resolves a file to that file ALONE — an explicit input is a narrowing, not a hint", () => {
    // The narrowing @SCN-USG-008 pins at the report level. Sweeping the parent
    // directory here would silently widen a caller's deliberate scope.
    const reader = readerOf({ "wf": ["ci.yml", "nightly.yml"] }, ["wf/ci.yml"]);

    expect(ciSourcePathsOf("wf/ci.yml", reader)).toEqual(["wf/ci.yml"]);
  });

  it("resolves an absent path to nothing, which is the fail-safe direction", () => {
    // No sources → no run: commands → every static check reads as unenforced. That
    // over-reports gaps and never hides one. The HARD error for a supplied-but-missing
    // path is @SCN-CLI-002's, raised upstream of here; this is what the DEFAULT does
    // on a target that has no workflows at all.
    expect(ciSourcePathsOf(".github/workflows", readerOf({}, []))).toEqual([]);
  });

  it("resolves an empty directory to nothing, the same as an absent one", () => {
    expect(ciSourcePathsOf("wf", readerOf({ "wf": [] }, []))).toEqual([]);
  });
});
