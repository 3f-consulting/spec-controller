import { beforeEach, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { liveSaver, runPinned } from "./savedRun.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

let scratch: string;
let saveLive: ReturnType<typeof liveSaver>;

beforeEach(() => {
  scratch = temporaryDirectory("spec-controller-rerender-");
  saveLive = liveSaver(scratch);
});

describe("[CLM-RMD-007] the markdown regenerates from a saved report byte-identical to the direct render, and exits the code its saved verdict names", () => {
  it("regenerates the out-of-balance roundtrip report and exits the 1 the live run exited", () => {
    const saved = saveLive("roundtrip", [
      "--features", "tests/fixtures/roundtrip/features",
      "--vitest", "tests/fixtures/roundtrip/vitest.json",
    ]);
    expect(saved.exitCode).toBe(1);

    const regenerated = runPinned(["--render-from-json", saved.json]);
    expect(regenerated.stdout).toBe(readFileSync(saved.md, "utf8"));
    expect(regenerated.exitCode).toBe(saved.exitCode);
  });
});
