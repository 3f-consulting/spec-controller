import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runBalanceCaptured } from "../runBalance.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";

describe("[CLM-CLI-092] a target with no runners block reports every step of its pipeline but GitHub's plumbing as a candidate", () => {
  it("writes nothing to stderr for a target whose configuration names no runners and no non-checks", () => {
    const dir = temporaryDirectory("clm-usg-017-unit-");
    mkdirSync(join(dir, "features"));
    writeFileSync(join(dir, "features", "own.feature"), "@OWN\nFeature: own\n\n  @unit @CLM-OWN-001\n  Scenario: own\n");
    writeFileSync(
      join(dir, "ci.yml"),
      "jobs:\n  ci:\n    steps:\n      - uses: actions/checkout@v4\n      - name: Unit tests\n        run: pnpm test\n"
    );
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "vitest run" }, specController: {} }));
    const { stderr } = runBalanceCaptured([
      "--features", join(dir, "features"),
      "--ci", join(dir, "ci.yml"),
      "--package-json", join(dir, "package.json"),
      "--format", "md",
    ]);
    expect(stderr).toBe("");
  });
});
