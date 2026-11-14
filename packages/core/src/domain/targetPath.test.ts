import { describe, expect, it } from "vitest";
import { targetFolderOf } from "./targetPath.js";

describe("balance works out the target's folder from the corpus", () => {
  it.each([
    ["CLM-CLI-142", "no feature corpus", "run from /work/acme", "/work/acme", { workingFolder: "/work/acme" }],
    ["CLM-CLI-184", "/work/acme/docs/features", "in a git repository at /work/acme", "/work/acme", { workingFolder: "/elsewhere", corpus: "/work/acme/docs/features", gitTopLevel: "/work/acme" }],
    ["CLM-CLI-144", "/tmp/x/features", "in no git repository", "/tmp/x", { workingFolder: "/elsewhere", corpus: "/tmp/x/features" }],
  ] as const)("[%s] a balance command line named %s, %s: when it is read, the target's folder will be %s", (_clm, _corpus, _where, folder, asked) => {
    expect(targetFolderOf(asked)).toBe(folder);
  });
});
