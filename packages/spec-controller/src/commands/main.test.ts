import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { main } from "./main.js";
import mainVariants from "./main.variants.json" with { type: "json" };

// A folder outside git whose one feature file has the feature code ABC.
function folderWithAFeature(): string {
  const folder = temporaryDirectory("output-places-");
  mkdirSync(join(folder, "features"));
  writeFileSync(join(folder, "features", "a.feature"), "@ABC\nFeature: a\n");
  return folder;
}

// What allocate writes on each stream, its answer thrown away when it cannot be written.
function writtenByAllocate(args: readonly string[], answerCannotBeWritten: boolean): Record<"output" | "error", string> {
  const written: Record<"output" | "error", string[]> = { output: [], error: [] };
  const writeOutput = (line: string): void => {
    if (answerCannotBeWritten) throw new Error("the answer could not be written");
    written.output.push(line);
  };

  main(args, folderWithAFeature(), { output: { fd: 1, write: writeOutput }, error: { fd: 2, write: (line) => written.error.push(line) } });

  return { output: written.output.join(""), error: written.error.join("") };
}

// Each thing said about the answer: the arguments that lead to it, whether the answer cannot be written, and words it holds.
const SAID_ABOUT_THE_ANSWER: Readonly<Record<string, readonly [readonly string[], boolean, string]>> = {
  "allocate's note": [["allocate", "ABC"], false, "no history was read"],
  "a validation failure": [["allocate", "ab"], false, "this is not a feature code"],
  "an unexpected error": [["allocate", "ABC"], true, "unexpected error"],
};

describe("each kind of output goes to its own stream", () => {
  it("[CLM-FMT-036] a run produced allocate's answer: when it ends, it will be on standard output", () => {
    const written = writtenByAllocate(["allocate", "ABC"], false);

    expect({ output: written.output.includes("CLM-ABC-001"), error: written.error.includes("CLM-ABC-001") }).toEqual({ output: true, error: false });
  });

  it.each(mainVariants["CLM-FMT-037"].variants)("[CLM-FMT-037] a run produced %s: when it ends, it will be on standard error", (output) => {
    const [args, answerCannotBeWritten, text] = SAID_ABOUT_THE_ANSWER[output]!;
    const written = writtenByAllocate(args, answerCannotBeWritten);

    expect({ output: written.output.includes(text), error: written.error.includes(text) }).toEqual({ output: false, error: true });
  });
});
