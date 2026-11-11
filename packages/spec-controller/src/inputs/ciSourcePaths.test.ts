import { describe, expect, it } from "vitest";
import { ciSourcePathsOf, type CiPathReader } from "./ciSourcePaths.js";
import { DEFAULT_CI_PATH } from "../runRequest/defaults.js";

describe("a workflows folder read by default that does not exist will count as no workflows, not as a missing input", () => {
  it("[CLM-CLI-183] a workflows folder read by default that does not exist will count as no workflows, not as a missing input", () => {
    const absent: CiPathReader = {
      exists: () => false,
      isDirectory: (path) => {
        throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
      },
      readDir: (path) => {
        throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
      },
    };

    expect(ciSourcePathsOf(DEFAULT_CI_PATH, absent)).toEqual([]);
  });
});
