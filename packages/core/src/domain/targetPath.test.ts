import { describe, expect, it } from "vitest";
import { targetFolderOf } from "./targetPath.js";

const RUN_FROM = "/work/acme";

const workingFolder = (): string => RUN_FROM;

describe("balance works out the target's folder", () => {
  it.each<[string, string, { corpusFolder?: string; repositoryTop?: string; folder: string }]>([
    ["CLM-CLI-142", "no feature corpus, run from the folder", { folder: RUN_FROM }],
    ["CLM-CLI-143", "the corpus in a git repository at the folder", { corpusFolder: "/work/acme", repositoryTop: "/work/acme", folder: "/work/acme" }],
    ["CLM-CLI-184", "the corpus in a folder below the top of a git repository", { corpusFolder: "/work/acme/docs", repositoryTop: "/work/acme", folder: "/work/acme" }],
    ["CLM-CLI-144", "the corpus in no git repository", { corpusFolder: "/tmp/x", folder: "/tmp/x" }],
    ["CLM-CLI-144", "the corpus in no git repository, named from the working folder", { corpusFolder: "x", folder: "/work/acme/x" }],
  ])("[%s] %s", (_clm, _situation, { corpusFolder, repositoryTop, folder }) => {
    expect(targetFolderOf(workingFolder, corpusFolder, repositoryTop)).toBe(folder);
  });
});
