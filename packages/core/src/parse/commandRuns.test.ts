import { describe, it, expect, beforeEach } from "vitest";
import { runningFitnessFunctions } from "./runningFitnessFunctions.js";
import { recognisedRunners } from "../domain/uncitedFitnessFunctions.js";
import { shellReading } from "./commandRuns.js";
import { parsedWorkflows, workflowSteps } from "./parsedWorkflows.test-utils.js";

describe("[SCN-WFS-001] recognisedRunners — a runner recognised at the step invoking it through a manifest script", () => {
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
      recognisedRunners(workflowSteps([aliasCi]), { test: "vitest run" }, { unit: runner }, shellReading)
    ).toEqual([{ tier: "unit", runner, step: "Unit tests" }]);
  });

  it("recognises nothing from the workflow alone — the measurement that makes the hop the rule", () => {
    expect(aliasCi.includes("vitest")).toBe(false);
    expect(recognisedRunners(workflowSteps([aliasCi]), {}, { unit: "vitest" }, shellReading)).toEqual([]);
  });

  it("stops following at three hops", () => {
    const scripts = { test: "pnpm a", a: "pnpm b", b: "vitest run" };
    expect(recognisedRunners(workflowSteps([aliasCi]), scripts, { unit: "vitest" }, shellReading)).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
    expect(
      recognisedRunners(
        workflowSteps([aliasCi]),
        { test: "pnpm a", a: "pnpm b", b: "pnpm c", c: "vitest run" },
        { unit: "vitest" },
        shellReading
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
        workflowSteps([aliasCi]),
        { test },
        { unit: "vitest run" },
        shellReading
      )
    ).toEqual(unitRunner);
  });

  it("recognises nothing where the runner's words fall on two lines", () => {
    expect(
      recognisedRunners(
        workflowSteps([aliasCi]),
        { test: "pnpm build --filter vitest\nrun" },
        { unit: "vitest run" },
        shellReading
      )
    ).toEqual([]);
  });

  it("recognises nothing for a blank runner value, leaving the step a candidate", () => {
    const manifest = { scripts: { test: "vitest run " } };
    expect(recognisedRunners(workflowSteps([aliasCi]), manifest.scripts, { unit: " " }, shellReading)).toEqual([]);
    expect(
      runningFitnessFunctions(parsedWorkflows([aliasCi]), manifest, { unit: " " }).map((check) => check.fitnessFunction)
    ).toContain("test");
  });
});

describe("[SCN-WFS-002] recognisedRunners — a runner's name out of command position leaves the step a candidate", () => {
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
    expect(recognisedRunners(workflowSteps([both]), manifest.scripts, unit, shellReading)).toEqual([
      { tier: "unit", runner: "vitest", step: "Unit tests" },
    ]);
    expect(runningFitnessFunctions(parsedWorkflows([both]), manifest, unit).map((check) => check.fitnessFunction)).toEqual([
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
    ["after a separator inside a double-quoted argument", 'echo "lint && vitest run"'],
    ["after a pipe inside a single-quoted argument", "echo 'x | vitest run'"],
  ] as const;

  it.each(namings)("leaves a step naming the runner %s in its own command a candidate", (_naming, line) => {
    const ci = [stepRunning(line)];
    expect(recognisedRunners(workflowSteps(ci), {}, runners, shellReading)).toEqual([]);
    expect(runningFitnessFunctions(parsedWorkflows(ci), { scripts: {} }, runners).map((check) => check.fitnessFunction)).toEqual([
      "Check",
    ]);
  });

  it.each(namings)("leaves a step naming the runner %s in a manifest script it follows a candidate", (_naming, check) => {
    const ci = [stepRunning("pnpm check")];
    const manifest = { scripts: { check } };
    expect(recognisedRunners(workflowSteps(ci), manifest.scripts, runners, shellReading)).toEqual([]);
    expect(runningFitnessFunctions(parsedWorkflows(ci), manifest, runners).map((found) => found.fitnessFunction)).toEqual([
      "check",
    ]);
  });

  it("still recognises the runner run after a separator outside quotes — the control", () => {
    expect(recognisedRunners(workflowSteps([stepRunning("echo lint && vitest run")]), {}, runners, shellReading)).toEqual([
      { tier: "unit", runner: "vitest", step: "Check" },
    ]);
  });

  it.each([
    ["a pipe", "vitest run | tee log"],
    ["a pipe that carries its errors too", "vitest run |& tee log"],
  ] as const)("still leaves a runner whose output %s reads a candidate — the control", (_pipe, line) => {
    expect(recognisedRunners(workflowSteps([stepRunning(line)]), {}, runners, shellReading)).toEqual([]);
  });
});

describe("[SCN-WFS-007] recognisedRunners — a runner whose output another command reads leaves the step a candidate", () => {
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

  it.each([
    [
      "leaves a check piping the runner's output into another command a candidate",
      ["pnpm exec cucumber-js --dry-run --format usage-json | jq -r '.[]' | awk '{ print }'"],
    ],
    [
      "leaves a check a candidate where every line pipes, the runner's output piped on a later line",
      ["git ls-files features | wc -l", "cucumber-js --dry-run | jq -r '.[]'"],
    ],
  ] as const)("%s", (_title, lines) => {
    const piped = [stepRunning(...lines)];
    expect(recognisedRunners(workflowSteps(piped), noScripts.scripts, integration, shellReading)).toEqual([]);
    expect(runningFitnessFunctions(parsedWorkflows(piped), noScripts, integration).map((check) => check.fitnessFunction)).toEqual([
      "Gate",
    ]);
  });

  it("leaves a check whose pipe follows a line continuation a candidate", () => {
    expect(
      recognisedRunners(
        workflowSteps([stepRunning("cucumber-js --dry-run --format usage-json \\", "  | jq -r '.[]'")]),
        noScripts.scripts,
        integration,
        shellReading
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
      recognisedRunners(workflowSteps([stepRunning(line)]), noScripts.scripts, integration, shellReading)
    ).toEqual(asTheRunner);
  });

  const unit = { unit: "vitest" };

  it.each([
    ["a subshell", ["(vitest run) | tee log"]],
    ["a subshell that changes directory first", ["(cd x && vitest run) | tee log"]],
    ["a subshell, errors too", ["(vitest run) |& tee log"]],
    ["a subshell inside another", ["( (vitest run) ) | tee log"]],
    ["a subshell that runs another command after it", ["(vitest run && echo done) | tee log"]],
  ] as const)("leaves a check piping the output of %s that runs the runner a candidate", (_form, lines) => {
    expect(recognisedRunners(workflowSteps([stepRunning(...lines)]), noScripts.scripts, unit, shellReading)).toEqual([]);
  });

  it("leaves a check a candidate where the runner is only a line of a here-document's body", () => {
    expect(
      recognisedRunners(workflowSteps([stepRunning("cat <<EOF > f", "vitest run", "EOF")]), noScripts.scripts, unit, shellReading)
    ).toEqual([]);
  });

  it.each([
    ["a subshell nothing reads", "(vitest run)"],
    ["a subshell whose failure falls through", "(vitest run) || true"],
    ["a subshell whose output is redirected before the pipe", "(vitest run) > out | tee log"],
    ["a pipeline's last stage after a piped subshell", "(echo a) | vitest run"],
    ["a subshell followed by a list whose last command pipes", "(vitest run) && echo done | tee log"],
  ] as const)("still recognises the runner in %s — the control", (_form, line) => {
    expect(recognisedRunners(workflowSteps([stepRunning(line)]), noScripts.scripts, unit, shellReading)).toEqual([
      { tier: "unit", runner: "vitest", step: "Gate" },
    ]);
  });

  it.each([
    ["(cd x && vitest run) 2>&1 | tee log"],
    ["(vitest run) 2>&1 | tee log"],
    ["( case x in a) echo;; esac; vitest run ) | tee log"],
    ["arr=(a b); (vitest run) | tee log"],
    ["vitest run 2> err | tee log"],
    ["vitest run 2>&1 | tee log"],
    ["vitest run 3>&1 > out 1>&3 | tee log"],
    ["{ vitest run; } 2>&1 | tee log"],
    ["vitest run < /dev/null | tee log"],
    ["vitest run {fd}> x | tee log"],
    ["vitest run 3>&1 > out 1<&3 | tee log"],
    ["vitest run 3>&1 > out 1>&3- | tee log"],
    ["vitest run 2>&1 > out 1>&2 | tee log"],
    ["coproc vitest run"],
    ["coproc NAME { vitest run; }"],
  ] as const)("reads %s as piping the runner's stdout, so the step is a candidate", (line) => {
    expect(shellReading.runsAsCommand(line, "vitest run", {})).toBe(false);
  });

  it.each([
    ["(vitest run) > out | tee log"],
    ["vitest run > out | tee log"],
    ["vitest run >> out | tee log"],
    ["vitest run >| out | tee log"],
    ["vitest run &> out | tee log"],
    ["vitest run &>> out | tee log"],
    ["vitest run >& out | tee log"],
    ["vitest run 1> out | tee log"],
    ["vitest run >&2 | tee log"],
    ["vitest run >&2 |& tee log"],
    ["vitest run 2>&1 > out | tee log"],
    ["vitest run > out 2>&1 | tee log"],
    ["{ vitest run; } > out | tee log"],
    ["(vitest run > out) | tee log"],
    ["vitest run >&- | tee log"],
    ["vitest run 3>&1 > 3 | tee log"],
    ["vitest run 2>&1 &> out 1>&2 | tee log"],
    ["vitest run 2>&1 &>> out 1>&2 | tee log"],
    ["vitest run 2>&1 >& out 1>&2 | tee log"],
    ["vitest run &> out 2>&1 | tee log"],
    ["coproc vitest run > out"],
  ] as const)("reads %s as sending the runner's stdout off the pipe, so the step runs the runner", (line) => {
    expect(shellReading.runsAsCommand(line, "vitest run", {})).toBe(true);
  });
});

const unitTestsStepRunning = (command: string): string =>
  [
    "jobs:",
    "  ci:",
    "    steps:",
    "      - name: Unit tests",
    "        run: |",
    ...command.split("\n").map((line) => `          ${line}`),
  ].join("\n");

type LaunchedForms = readonly (readonly [form: string, command: string])[];

describe.each<readonly [scenario: string, runner: string, forms: LaunchedForms]>([
  [
    "[SCN-WFS-003] recognisedRunners — a runner started through a launcher, after an environment assignment or later in a command list is recognised",
    "vitest",
    [
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
      ["through a launcher continued onto the next line after a blank", "npx \\\nvitest run"],
    ],
  ],
  [
    "[SCN-WFS-004] recognisedRunners — a pytest suite started through a Python launcher is recognised as the unit runner",
    "pytest",
    [
      ["through python -m", "python -m pytest --junitxml=reports/pytest.xml"],
      ["through python3 -m", "python3 -m pytest"],
      ["through poetry run", "poetry run pytest"],
      ["through uv run", "uv run pytest"],
      ["through pipenv run", "pipenv run pytest"],
      ["through hatch run", "hatch run pytest"],
      ["through pdm run", "pdm run pytest"],
      ["through coverage run -m", "coverage run -m pytest"],
      ["through a chain of Python launchers", "uv run python -m pytest"],
      ["through timeout and a Python launcher", "timeout 600 poetry run pytest"],
      ["through python -m and coverage run -m", "python -m coverage run -m pytest"],
    ],
  ],
  [
    "[SCN-WFS-005] recognisedRunners — an RSpec suite started through bundle exec is recognised as the unit runner",
    "rspec",
    [
      ["directly", "rspec"],
      ["through bundle exec", "bundle exec rspec"],
      ["through bundle exec with the JSON formatter", "bundle exec rspec --format progress --format json --out reports/rspec.json"],
      ["through timeout and bundle exec", "timeout 600 bundle exec rspec"],
      ["through bundle exec after an environment assignment", "RAILS_ENV=test bundle exec rspec"],
      ["through bundle exec later in a command list", "bundle install && bundle exec rspec"],
    ],
  ],
])("%s", (_scenario, runner, forms) => {
  const unit = { unit: runner };
  const asTheRunner = [{ tier: "unit", runner, step: "Unit tests" }];

  it.each(forms)("recognises the runner in the step's own command %s", (_form, line) => {
    expect(recognisedRunners(workflowSteps([unitTestsStepRunning(line)]), {}, unit, shellReading)).toEqual(asTheRunner);
  });

  it.each(forms)("recognises the runner in a manifest script the step follows %s", (_form, test) => {
    expect(recognisedRunners(workflowSteps([unitTestsStepRunning("pnpm test")]), { test }, unit, shellReading)).toEqual(asTheRunner);
  });
});

describe("[SCN-WFS-003] recognisedRunners — a runner started through a launcher, after an environment assignment or later in a command list is recognised", () => {
  const unit = { unit: "vitest" };
  const joined = [["a launcher continued onto the next line with no blank, which joins the two into one name", "npx\\\nvitest run"]] as const;

  it.each(joined)("reads no runner in the step's own command through %s", (_form, line) => {
    expect(recognisedRunners(workflowSteps([unitTestsStepRunning(line)]), {}, unit, shellReading)).toEqual([]);
  });

  it.each(joined)("reads no runner in a manifest script the step follows through %s", (_form, test) => {
    expect(recognisedRunners(workflowSteps([unitTestsStepRunning("pnpm test")]), { test }, unit, shellReading)).toEqual([]);
  });
});

describe.each<readonly [scenario: string, runner: string, forms: LaunchedForms]>([
  [
    "[SCN-WFS-004] recognisedRunners — a pytest suite started through a Python launcher is recognised as the unit runner",
    "pytest",
    [
      ["an option between the launcher and the runner", "uv run --frozen pytest"],
      ["a project script", "hatch run test"],
      ["a suite tox starts", "tox -e py312"],
      ["a suite nox starts", "nox -s tests"],
    ],
  ],
  [
    "[SCN-WFS-005] recognisedRunners — an RSpec suite started through bundle exec is recognised as the unit runner",
    "rspec",
    [
      ["an option between the launcher and the runner", "bundle exec --keep-file-descriptors rspec"],
      ["a rake task", "bundle exec rake spec"],
      ["bundle without exec", "bundle rspec"],
    ],
  ],
])("%s", (_scenario, runner, forms) => {
  const unit = { unit: runner };

  it.each(forms)("leaves the step a candidate for %s", (_form, line) => {
    const step = [unitTestsStepRunning(line)];
    expect(recognisedRunners(workflowSteps(step), {}, unit, shellReading)).toEqual([]);
    expect(runningFitnessFunctions(parsedWorkflows(step), { scripts: {} }, unit).map((check) => check.fitnessFunction)).toEqual([
      "Unit tests",
    ]);
  });
});

describe("[SCN-WFS-006] recognisedRunners — a runner declared with its test task is recognised only on a step that runs that task, and another task run through the same build tool is a candidate", () => {
  const ciRunning = (...steps: readonly (readonly [string, string])[]): string =>
    [
      "jobs:",
      "  ci:",
      "    steps:",
      ...steps.flatMap(([name, line]) => [`      - name: ${name}`, `        run: ${line}`]),
    ].join("\n");

  it.each([
    [
      "Gradle",
      "./gradlew test",
      [
        ["Unit tests", "./gradlew test"],
        ["Verbose unit tests", "./gradlew test --info"],
        ["Static analysis", "./gradlew detekt"],
        ["Lint", "./gradlew ktlintCheck"],
      ],
      ["Unit tests", "Verbose unit tests"],
      ["Lint", "Static analysis"],
    ],
    [
      "Maven",
      "mvn test",
      [
        ["Unit tests", "mvn test"],
        ["Unit tests with a profile", "mvn test -Pci"],
        ["Style", "mvn checkstyle:check"],
        ["Batch-mode unit tests", "mvn -B test"],
        ["Clean unit tests", "mvn clean test"],
      ],
      ["Unit tests", "Unit tests with a profile"],
      ["Batch-mode unit tests", "Clean unit tests", "Style"],
    ],
  ] as const)(
    "recognises %s's declared test task only where the step opens with it, and reports every other task as a fitness function",
    (_tool, runner, steps, recognised, candidates) => {
      const ci = [ciRunning(...steps)];
      const unit = { unit: runner };
      expect(recognisedRunners(workflowSteps(ci), {}, unit, shellReading)).toEqual(
        recognised.map((step) => ({ tier: "unit", runner, step }))
      );
      expect(runningFitnessFunctions(parsedWorkflows(ci), { scripts: {} }, unit).map((check) => check.fitnessFunction)).toEqual(
        candidates
      );
    }
  );

  it("recognises the declared test task in a manifest script the step follows, and leaves another task a candidate", () => {
    const ci = [ciRunning(["Unit tests", "pnpm test"], ["Static analysis", "pnpm analyse"])];
    const manifest = { scripts: { test: "./gradlew test --info", analyse: "./gradlew detekt" } };
    const unit = { unit: "./gradlew test" };
    expect(recognisedRunners(workflowSteps(ci), manifest.scripts, unit, shellReading)).toEqual([
      { tier: "unit", runner: "./gradlew test", step: "Unit tests" },
    ]);
    expect(runningFitnessFunctions(parsedWorkflows(ci), manifest, unit).map((check) => check.fitnessFunction)).toEqual(["analyse"]);
  });
});
