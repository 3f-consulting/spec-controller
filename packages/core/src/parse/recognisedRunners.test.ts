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

  const runners = { unit: "vitest", integration: "cucumber-js" };
  const stepRunning = (line: string): string =>
    ["jobs:", "  ci:", "    steps:", "      - name: Check", "        run: |", `          ${line}`].join("\n");

  const namings = [
    ["as what echo prints", "echo vitest run"],
    ["as what grep searches for", "grep -q vitest package.json"],
    ["as an argument to a script", "./scripts/check-coverage.sh vitest"],
    ["as what pnpm why explains", "pnpm why vitest"],
    ["as what npm ls lists", "npm ls cucumber-js"],
    ["as what pnpm add installs", "pnpm add -D vitest"],
    ["in a sentence echo prints", "echo cucumber-js is wired"],
    ["after a command whose name holds an =", "./set-FOO=1 vitest run"],
  ] as const;

  it.each(namings)("leaves a step naming the runner %s in its own command a candidate", (_naming, line) => {
    const ci = [stepRunning(line)];
    expect(recognisedRunners(ci, { scripts: {} }, runners)).toEqual([]);
    expect(runningFitnessFunctions(ci, { scripts: {} }, runners).map((check) => check.fitnessFunction)).toEqual([
      "Check",
    ]);
  });

  it.each(namings)("leaves a step naming the runner %s in a manifest script it follows a candidate", (_naming, check) => {
    const ci = [stepRunning("pnpm check")];
    const manifest = { scripts: { check } };
    expect(recognisedRunners(ci, manifest, runners)).toEqual([]);
    expect(runningFitnessFunctions(ci, manifest, runners).map((found) => found.fitnessFunction)).toEqual([
      "check",
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

describe("[SCN-USG-033] recognisedRunners — a runner started through a launcher, after an environment assignment or later in a command list is recognised", () => {
  const stepRunning = (line: string): string =>
    ["jobs:", "  ci:", "    steps:", "      - name: Unit tests", "        run: |", `          ${line}`].join(
      "\n"
    );

  const unit = { unit: "vitest" };
  const asTheRunner = [{ tier: "unit", runner: "vitest", step: "Unit tests" }];

  const forms = [
    ["directly", "vitest run"],
    ["after an environment assignment", "CI=true vitest run"],
    ["after several environment assignments", "CI=true NODE_OPTIONS=--max-old-space-size=4096 vitest run"],
    ["through timeout with a duration", "timeout 600 vitest run"],
    ["through timeout with a quoted variable for its duration", 'timeout "$BUDGET" vitest run'],
    ["through npx", "npx vitest run"],
    ["through npm exec", "npm exec vitest run"],
    ["through pnpm exec", "pnpm exec vitest run"],
    ["through pnpm dlx", "pnpm dlx vitest run"],
    ["through pnpm", "pnpm vitest run"],
    ["through yarn", "yarn vitest run"],
    ["through bunx", "bunx vitest run"],
    ["through launchers in combination", "timeout 60 pnpm exec vitest run"],
    ["through launchers after an environment assignment", "CI=true timeout 60 pnpm exec vitest run"],
    ["as the later command of an && list", "pnpm build && vitest run"],
    ["as the later command of an || list", "false || vitest run"],
    ["as the later command of a ; list", "pnpm build; vitest run"],
    ["as the first command of an && list", "vitest run && echo done"],
    ["through a launcher in a list", "pnpm build && timeout 60 npx vitest run"],
  ] as const;

  it.each(forms)("recognises the runner in the step's own command %s", (_form, line) => {
    expect(recognisedRunners([stepRunning(line)], { scripts: {} }, unit)).toEqual(asTheRunner);
  });

  it.each(forms)("recognises the runner in a manifest script the step follows %s", (_form, test) => {
    expect(recognisedRunners([stepRunning("pnpm test")], { scripts: { test } }, unit)).toEqual(asTheRunner);
  });
});
