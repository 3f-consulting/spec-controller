import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { liveSaver, runPinned } from "./savedRun.testkit.js";

const scratch = mkdtempSync(join(tmpdir(), "spec-controller-rerender-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
const saveLive = liveSaver(scratch);

describe("[SCN-RMD-007] the markdown regenerates from a saved report byte-identical to the direct render, and exits the code its saved verdict names", () => {
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
