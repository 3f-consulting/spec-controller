import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { workingFolderOf } from "./workingFolder.js";

const removed = (): string => {
  throw new Error("ENOENT: process.cwd failed");
};

describe("a default that cannot be read will stop the run", () => {
  it("[CLM-CLI-145] the run's working directory is where it started while that folder exists", () => {
    expect(workingFolderOf(() => "/work/acme", undefined)).toBe("/work/acme");
  });

  it("[CLM-CLI-145] with the working directory removed, the shell's record of it names it", () => {
    const gone = join(temporaryDirectory("gone-"), "removed");

    expect(workingFolderOf(removed, gone)).toBe(gone);
  });

  it.each([
    ["names another folder that exists", () => temporaryDirectory("elsewhere-")],
    ["is not set", () => undefined],
  ])("[CLM-CLI-145] with the working directory removed and the shell's record %s, the run is given a folder that does not exist", (_record, recorded) => {
    const folder = workingFolderOf(removed, recorded());

    expect(existsSync(folder)).toBe(false);
  });
});
