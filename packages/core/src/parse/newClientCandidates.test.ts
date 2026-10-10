import { describe, it, expect, beforeEach } from "vitest";
import { recognisedRunners, runningFitnessFunctions } from "./runningFitnessFunctions.js";
import { resolveRunners } from "./targetManifest.js";
import type { PackageJsonScripts } from "./checkScriptsRunInCI.js";

describe("[SCN-USG-017] a target that has named no runners — every step of its pipeline is a candidate", () => {
  const manifest = {
    scripts: { lint: "eslint .", typecheck: "tsc --noEmit", test: "vitest run" },
    specController: {},
  };
  const pkg: PackageJsonScripts = { scripts: manifest.scripts };

  let ci: string;
  beforeEach(() => {
    ci = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - uses: actions/setup-node@v4",
      "      - run: pnpm install --frozen-lockfile",
      "      - name: Lint",
      "        run: pnpm lint",
      "      - name: Typecheck",
      "        run: pnpm typecheck",
      "      - name: Unit tests",
      "        run: pnpm test",
      "      - uses: github/codeql-action/analyze@v3",
    ].join("\n");
  });

  const candidateHandles = (runners: Readonly<Record<string, string | null>>): string[] =>
    runningFitnessFunctions([ci], pkg, runners).map((observation) => observation.fitnessFunction);

  it("reads a manifest that has said nothing as a target that has said nothing, and calls it no error", () => {
    expect(resolveRunners(manifest)).toStrictEqual({ tiers: {}, unrecognisedKeys: [] });
  });

  it("makes every step of the pipeline a candidate fitness function, whatever form it takes", () => {
    expect(candidateHandles(resolveRunners(manifest).tiers)).toEqual([
      "actions/checkout@v4",
      "actions/setup-node@v4",
      "github/codeql-action/analyze@v3",
      "lint",
      "pnpm install --frozen-lockfile",
      "test",
      "typecheck",
    ]);
  });

  it("leaves the target's own test suite a candidate like any other step", () => {
    expect(candidateHandles(resolveRunners(manifest).tiers)).toContain("test");
    expect(recognisedRunners([ci], pkg, resolveRunners(manifest).tiers)).toEqual([]);
  });

  it("takes exactly one step out when one runner is named — the control, and the consumer's remedy", () => {
    const named = resolveRunners({ specController: { runners: { unit: "vitest" } } }).tiers;
    expect(recognisedRunners([ci], pkg, named)).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
    expect(candidateHandles(named)).toEqual([
      "actions/checkout@v4",
      "actions/setup-node@v4",
      "github/codeql-action/analyze@v3",
      "lint",
      "pnpm install --frozen-lockfile",
      "typecheck",
    ]);
  });
});
