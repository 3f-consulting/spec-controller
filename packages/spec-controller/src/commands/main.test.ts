import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";

// A folder outside git whose one feature file has the feature code ABC.
function folderWithAFeature(): string {
  const folder = temporaryDirectory("output-places-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "a.feature"), "@ABC\nFeature: a\n");
  return folder;
}

describe("an answer will be on standard output, and anything about it on standard error", () => {
  it.each([
    ["CLM-CLI-162", "allocate's answer", "output", ["allocate", "ABC"], "CLM-ABC-001", false],
    ["CLM-CLI-163", "allocate's note", "error", ["allocate", "ABC"], "no history was read", false],
    ["CLM-CLI-164", "a validation failure", "error", ["allocate", "ab"], "this is not a feature code", false],
    ["CLM-CLI-165", "an unexpected error", "error", ["allocate", "ABC"], "unexpected error", true],
  ] as const)("[%s] %s is on standard %s", (_clm, _output, place, args, text, answerCannotBeWritten) => {
    const written: Record<"output" | "error", string[]> = { output: [], error: [] };
    const writeOutput = (line: string): void => {
      if (answerCannotBeWritten) throw new Error("the answer could not be written");
      written.output.push(line);
    };

    main(args, folderWithAFeature(), { output: { fd: 1, write: writeOutput }, error: { fd: 2, write: (line) => written.error.push(line) } });

    expect({ output: written.output.join("").includes(text), error: written.error.join("").includes(text) }).toEqual({ output: place === "output", error: place === "error" });
  });
});
