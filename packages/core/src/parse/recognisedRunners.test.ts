import { describe, it, expect, beforeEach } from "vitest";
import { recognisedRunners, runningFitnessFunctions } from "./runningFitnessFunctions.js";

describe("[SCN-USG-011] recognisedRunners — a runner recognised at the step invoking it through a manifest script", () => {
  const ciWith = (...steps: string[]): string =>
    ["jobs:", "  ci:", "    steps:", ...steps].join("\n");

  let aliasCi: string;
  beforeEach(() => {
    aliasCi = ciWith(
      "      - run: pnpm install --frozen-lockfile",
      "      - name: Unit tests",
      "        run: pnpm test"
    );
  });

  it.each([
    ["recognises the runner a step reaches through the manifest script it invokes", "vitest"],
    ["recognises the runner however the runner value is padded or spaced", "  vitest   run "],
  ] as const)("%s", (_title, runner) => {
    expect(
      recognisedRunners([aliasCi], { scripts: { test: "vitest run" } }, { unit: runner })
    ).toEqual([{ tier: "unit", runner, step: "Unit tests" }]);
  });

  it("recognises nothing from the workflow alone — the measurement that makes the hop the rule", () => {
    expect(aliasCi.includes("vitest")).toBe(false);
    expect(recognisedRunners([aliasCi], { scripts: {} }, { unit: "vitest" })).toEqual([]);
  });

  it("stops following at three hops", () => {
    const scripts = { test: "pnpm a", a: "pnpm b", b: "vitest run" };
    expect(recognisedRunners([aliasCi], { scripts }, { unit: "vitest" })).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
    expect(
      recognisedRunners(
        [aliasCi],
        { scripts: { test: "pnpm a", a: "pnpm b", b: "pnpm c", c: "vitest run" } },
        { unit: "vitest" }
      )
    ).toEqual([]);
  });

  const unitRunner = [{ tier: "unit", runner: "vitest run", step: "Unit tests" }];

  it.each([
    ["recognises the runner on any line of a multi-line script", "pnpm build\nvitest run"],
    ["recognises the runner however widely the script spaces its words", "vitest  run"],
  ] as const)("%s", (_title, test) => {
    expect(
      recognisedRunners(
        [aliasCi],
        { scripts: { test } },
        { unit: "vitest run" }
      )
    ).toEqual(unitRunner);
  });

  it("recognises nothing where the runner's words fall on two lines", () => {
    expect(
      recognisedRunners(
        [aliasCi],
        { scripts: { test: "pnpm build --filter vitest\nrun" } },
        { unit: "vitest run" }
      )
    ).toEqual([]);
  });

  it("recognises nothing for a blank runner value, leaving the step a candidate", () => {
    const manifest = { scripts: { test: "vitest run " } };
    expect(recognisedRunners([aliasCi], manifest, { unit: " " })).toEqual([]);
    expect(
      runningFitnessFunctions([aliasCi], manifest, { unit: " " }).map((check) => check.fitnessFunction)
    ).toContain("test");
  });
});

describe("[SCN-USG-012] recognisedRunners — a runner's name out of command position leaves the step a candidate", () => {
  const unit = { unit: "vitest" };

  it("recognises the runner beside every one of them — the control", () => {
    const both = [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Unit tests",
      "        run: pnpm test",
      "      - name: Rule check",
      '        run: pnpm lint:rules --outputFile.json="$EVIDENCE_DIR/vitest.json"',
    ].join("\n");
    const manifest = { scripts: { test: "vitest run", "lint:rules": "eslint . --format json" } };
    expect(recognisedRunners([both], manifest, unit)).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
    expect(runningFitnessFunctions([both], manifest, unit).map((check) => check.fitnessFunction)).toEqual([
      "lint:rules",
    ]);
  });
});

describe("[SCN-USG-029] recognisedRunners — a runner whose output another command reads leaves the step a candidate", () => {
  const stepRunning = (...lines: string[]): string =>
    [
      "jobs:",
      "  ci:",
      "    steps:",
      "      - name: Gate",
      "        run: |",
      ...lines.map((line) => `          ${line}`),
    ].join("\n");

  const integration = { integration: "cucumber-js" };
  const noScripts = { scripts: {} };
  const asTheRunner = [{ tier: "integration", runner: "cucumber-js", step: "Gate" }];

  it("leaves a check piping the runner's output into another command a candidate", () => {
    const piped = [stepRunning("pnpm exec cucumber-js --dry-run --format usage-json | jq -r '.[]' | awk '{ print }'")];
    expect(recognisedRunners(piped, noScripts, integration)).toEqual([]);
    expect(runningFitnessFunctions(piped, noScripts, integration).map((check) => check.fitnessFunction)).toEqual([
      "Gate",
    ]);
  });

  it("leaves a check whose pipe follows a line continuation a candidate", () => {
    expect(
      recognisedRunners(
        [stepRunning("cucumber-js --dry-run --format usage-json \\", "  | jq -r '.[]'")],
        noScripts,
        integration
      )
    ).toEqual([]);
  });

  it.each([
    [
      "still recognises the runner where its failure falls through to another command — the || control",
      "cucumber-js || echo the suite failed",
    ],
    ["still recognises the runner in a pipeline's last stage, where nothing reads its output", "echo start | cucumber-js"],
    ["still recognises the runner in a last stage written hard against the pipe", "echo start |cucumber-js"],
  ] as const)("%s", (_title, line) => {
    expect(
      recognisedRunners([stepRunning(line)], noScripts, integration)
    ).toEqual(asTheRunner);
  });

  it("leaves a check a candidate where every line pipes, the runner's output piped on a later line", () => {
    const piped = [stepRunning("git ls-files features | wc -l", "cucumber-js --dry-run | jq -r '.[]'")];
    expect(recognisedRunners(piped, noScripts, integration)).toEqual([]);
    expect(runningFitnessFunctions(piped, noScripts, integration).map((check) => check.fitnessFunction)).toEqual([
      "Gate",
    ]);
  });
});
