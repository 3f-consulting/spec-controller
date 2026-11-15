import { describe, expect, it } from "vitest";
import { targetFolderOf } from "./targetPath.js";

describe("the target's folder will be the git repository the corpus is in, or else the corpus's parent folder", () => {
  it.each([
    ["CLM-CLI-142", "no feature corpus", "run from /work/acme", "/work/acme", { workingFolder: "/work/acme" }],
    ["CLM-CLI-143", "/work/acme/features", "in a git repository at /work/acme", "/work/acme", { workingFolder: "/elsewhere", corpus: "/work/acme/features", gitTopLevel: "/work/acme" }],
    ["CLM-CLI-184", "/work/acme/docs/features", "in a git repository at /work/acme", "/work/acme", { workingFolder: "/elsewhere", corpus: "/work/acme/docs/features", gitTopLevel: "/work/acme" }],
    ["CLM-CLI-144", "/tmp/x/features", "in no git repository", "/tmp/x", { workingFolder: "/elsewhere", corpus: "/tmp/x/features" }],
  ] as const)("[%s] a command line naming %s, %s: the target's folder is %s", (_clm, _corpus, _where, folder, asked) => {
    expect(targetFolderOf(asked)).toBe(folder);
  });
});
