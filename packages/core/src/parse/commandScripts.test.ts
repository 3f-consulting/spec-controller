import { describe, it, expect } from "vitest";
import { runningFitnessFunctions } from "./runningFitnessFunctions.js";
import { recognisedRunners } from "../domain/uncitedFitnessFunctions.js";
import { commandInvokesScript, shellReading } from "./commandRuns.js";
import { parsedWorkflows, workflowSteps } from "./parsedWorkflows.test-utils.js";

const stepRunning = (command: string): string =>
  ["jobs:", "  ci:", "    steps:", "      - name: Check", "        run: |", `          ${command}`].join("\n");

describe("[SCN-WFS-026] commandInvokesScript — a script is run only where a command runs", () => {
  it.each([
    ["as what echo prints", "echo pnpm check", "check"],
    ["as what echo prints after npm run", "echo npm run test", "test"],
    ["as what grep searches for", "grep pnpm test", "test"],
    ["as what xargs hands on, xargs being no launcher", "xargs -0 -r pnpm exec eslint --max-warnings 0", "exec"],
    ["as an argument to a command's option", "publint --pack pnpm packages/core && publint --pack pnpm packages/spec-controller", "packages/core"],
    ["inside a quoted argument", 'pnpm step-threshold unit "pnpm test"', "test"],
    ["inside a command substitution", "$(pnpm test)", "test"],
    ["inside a string bash runs", 'bash -c "pnpm test"', "test"],
    ["after an option outside the documented forms", "pnpm --dir packages/core test", "test"],
  ] as const)("does not read a script named %s as run", (_naming, command, script) => {
    expect(commandInvokesScript(command, script)).toBe(false);
  });

  it.each([
    ["at the start of the line", 'pnpm step-threshold unit "pnpm test"', "step-threshold"],
    ["after &&", "cd pkg && pnpm test", "test"],
    ["after ;", "pnpm lint; pnpm test", "test"],
    ["after ||", "false || pnpm test", "test"],
    ["before a pipe", "pnpm build | tee out", "build"],
    ["after a pipe", "cat input | pnpm check", "check"],
    ["past an environment assignment", "CI=1 pnpm test", "test"],
    ["through timeout and its duration", 'timeout "${UNIT_SUITE_TIMEOUT_S:?}" pnpm test --maxWorkers="$(nproc)" --reporter=json || status=$?', "test"],
    ["through a launcher", "CI=1 timeout 10m npx pnpm test", "test"],
    ["on a later line", "pnpm install\necho done\npnpm test", "test"],
  ] as const)("reads a script run %s as run", (_where, command, script) => {
    expect(commandInvokesScript(command, script)).toBe(true);
  });

  it("leaves a step that echoes a script's name a candidate under its own name, never the runner the script runs", () => {
    const ci = [stepRunning("echo pnpm check")];
    const manifest = { scripts: { check: "vitest run" } };
    const unit = { unit: "vitest" };
    expect(recognisedRunners(workflowSteps(ci), manifest.scripts, unit, shellReading)).toEqual([]);
    expect(runningFitnessFunctions(parsedWorkflows(ci), manifest, unit).map((check) => check.fitnessFunction)).toEqual([
      "Check",
    ]);
  });

  it("recognises the runner of a script run after && in a step", () => {
    const ci = [stepRunning("cd packages/core && pnpm check")];
    const manifest = { scripts: { check: "vitest run" } };
    expect(recognisedRunners(workflowSteps(ci), manifest.scripts, { unit: "vitest" }, shellReading)).toEqual([
      { tier: "unit", runner: "vitest", step: "Check" },
    ]);
  });
});

describe("[SCN-WFS-021] recognisedRunners — npm's test shortcut runs the manifest's test script", () => {
  it.each([["npm test"], ["npm t"], ["npm tst"], ["cd packages/core && npm test"]] as const)(
    "recognises the unit runner at a step running %s",
    (command) => {
      const ci = [stepRunning(command)];
      expect(recognisedRunners(workflowSteps(ci), { test: "vitest run" }, { unit: "vitest" }, shellReading)).toEqual([
        { tier: "unit", runner: "vitest", step: "Check" },
      ]);
      expect(commandInvokesScript(command, "test")).toBe(true);
    }
  );

  it.each([
    ["npm's start shortcut", "npm start", "start"],
    ["an npm option before the command", "npm -w core test", "test"],
    ["npm with a bare script name", "npm lint", "lint"],
  ] as const)("does not read %s as running a script", (_form, command, script) => {
    expect(commandInvokesScript(command, script)).toBe(false);
  });
});

describe("[SCN-WFS-022] commandInvokesScript — npm's run aliases run the script named after them, as npm run does", () => {
  it.each([["npm run"], ["npm run-script"], ["npm rum"], ["npm urn"]] as const)(
    "reads a step running %s check under the check script it runs",
    (run) => {
      const ci = [stepRunning(`${run} check`)];
      const manifest = { scripts: { check: "eslint ." } };
      expect(commandInvokesScript(`${run} check`, "check")).toBe(true);
      expect(runningFitnessFunctions(parsedWorkflows(ci), manifest, { unit: "vitest" }).map((found) => found.fitnessFunction)).toEqual([
        "check",
      ]);
    }
  );

  it("reads the script named after npm run however its workspace options follow it", () => {
    expect(commandInvokesScript("npm run-script check --workspace=a", "check")).toBe(true);
    expect(commandInvokesScript("npm rum check -w core", "check")).toBe(true);
  });
});

describe("[SCN-WFS-023] recognisedRunners — pnpm's test shortcut runs the manifest's test script", () => {
  it.each([["pnpm test"], ["pnpm t"], ["pnpm tst"]] as const)("recognises the unit runner at a step running %s", (command) => {
    const ci = [stepRunning(command)];
    expect(recognisedRunners(workflowSteps(ci), { test: "vitest run" }, { unit: "vitest" }, shellReading)).toEqual([
      { tier: "unit", runner: "vitest", step: "Check" },
    ]);
  });

  it("still reads pnpm t as running a script the manifest names t", () => {
    expect(commandInvokesScript("pnpm t", "t")).toBe(true);
  });

  it("reads no test shortcut for yarn, whose t is a bare script name", () => {
    expect(commandInvokesScript("yarn t", "test")).toBe(false);
    expect(commandInvokesScript("yarn t", "t")).toBe(true);
  });
});

describe("[SCN-WFS-024] commandInvokesScript — a script run after a pnpm selection is run", () => {
  it.each([
    ["pnpm --filter core test", "test"],
    ["pnpm --filter=core test", "test"],
    ["pnpm -F core test", "test"],
    ["pnpm -r test", "test"],
    ["pnpm --recursive test", "test"],
    ["pnpm --recursive run test", "test"],
    ["pnpm --filter core t", "test"],
    ["pnpm -F core tst", "test"],
    ["pnpm -r --filter core run lint", "lint"],
    ["pnpm -r build", "build"],
  ] as const)("reads %s as running %s", (command, script) => {
    expect(commandInvokesScript(command, script)).toBe(true);
  });

  it("recognises the unit runner at a step running the test script through a pnpm filter", () => {
    const ci = [stepRunning("pnpm --filter core test")];
    expect(recognisedRunners(workflowSteps(ci), { test: "vitest run" }, { unit: "vitest" }, shellReading)).toEqual([
      { tier: "unit", runner: "vitest", step: "Check" },
    ]);
  });

  it.each([
    ["pnpm --filter core test"],
    ["pnpm --filter=core test"],
    ["pnpm -F core test"],
  ] as const)("never reads the selector of %s as the script it runs", (command) => {
    expect(commandInvokesScript(command, "core")).toBe(false);
  });

  it.each([
    ["an option outside the selections", "pnpm --silent test"],
    ["a selection pnpm does not document", "pnpm -w test"],
  ] as const)("does not read a script after %s as run", (_option, command) => {
    expect(commandInvokesScript(command, "test")).toBe(false);
  });

  it.each([["pnpm -r"], ["pnpm --filter"], ["pnpm --filter core"]] as const)(
    "reads no script where a selection ends the command, as in %s",
    (command) => {
      expect(commandInvokesScript(command, "test")).toBe(false);
    }
  );

  it("ends the chain of a root script that is its own selection, and reads the step as it did", () => {
    const ci = [stepRunning("pnpm build")];
    const manifest = { scripts: { build: "pnpm -r build" } };
    const unit = { unit: "vitest" };
    expect(recognisedRunners(workflowSteps(ci), manifest.scripts, unit, shellReading)).toEqual([]);
    expect(runningFitnessFunctions(parsedWorkflows(ci), manifest, unit).map((found) => found.fitnessFunction)).toEqual([
      "build",
    ]);
  });
});

describe("[SCN-WFS-025] commandInvokesScript — a script run in a yarn workspace is run", () => {
  it.each([
    ["yarn workspace web test", "test"],
    ["yarn workspace web run test", "test"],
    ["yarn workspaces foreach -A run test", "test"],
    ["yarn workspaces foreach --all --parallel run build", "build"],
    ["yarn workspaces foreach -A run test --verbose", "test"],
    ["yarn test", "test"],
    ["yarn run test", "test"],
  ] as const)("reads %s as running %s", (command, script) => {
    expect(commandInvokesScript(command, script)).toBe(true);
  });

  it("recognises the unit runner at a step running the test script in a yarn workspace", () => {
    const ci = [stepRunning("yarn workspace web test")];
    expect(recognisedRunners(workflowSteps(ci), { test: "vitest run" }, { unit: "vitest" }, shellReading)).toEqual([
      { tier: "unit", runner: "vitest", step: "Check" },
    ]);
  });

  it("never reads the workspace's name as the script it runs", () => {
    expect(commandInvokesScript("yarn workspace web test", "web")).toBe(false);
    expect(commandInvokesScript("yarn workspace web run test", "web")).toBe(false);
  });
});
