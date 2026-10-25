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

describe("[SCN-WFS-027] commandInvokesScript — a script run behind a command that runs the command after it is run", () => {
  it.each([
    ["env past its options and assignments", "env -i -u HOME --unset=TMPDIR -C packages/core CI=1 pnpm test", "test"],
    ["nice past its adjustment", "nice -n 10 pnpm test", "test"],
    ["nice past a long adjustment", "nice --adjustment 5 pnpm test", "test"],
    ["nohup", "nohup pnpm test", "test"],
    ["time past its format", "time -p -f %e -o time.log pnpm test", "test"],
    ["command", "command -p pnpm test", "test"],
    ["exec past its name", "exec -c -l -a tests pnpm test", "test"],
    ["xargs past its counts", "xargs -n 1 -P 4 -s 4096 -L 2 pnpm test", "test"],
    ["xargs past its replacement and input", "xargs -I {} -E END -a files.txt -d , --max-procs 2 pnpm test", "test"],
    ["xargs as the real population runs it", 'git diff -z --name-only --diff-filter=d "$(git merge-base origin/main HEAD)" | xargs -0 -r pnpm lint --max-warnings 0', "lint"],
    ["xargs through pnpm exec as the real population runs it", "xargs -0 -r pnpm exec pnpm lint", "lint"],
    ["timeout past a kill-after", "timeout -k 10s 10m pnpm test", "test"],
    ["timeout past its flags and signal", "timeout --preserve-status --foreground -s KILL --kill-after 5s 10m pnpm test", "test"],
    ["stdbuf past its modes", "stdbuf -o L -e 0 --input 0 pnpm test", "test"],
    ["sudo", "sudo pnpm test", "test"],
    ["sudo past its user and group", "sudo -E -u runner -g docker -D /work -C 3 -T 60 --prompt x CI=1 pnpm test", "test"],
    ["npx past its options", "npx -y pnpm test", "test"],
    ["npx past its package", "npx --package pnpm -w core pnpm test", "test"],
    ["npm exec past its options", "npm exec --package pnpm --workspace core -- pnpm test", "test"],
    ["pnpm exec past its resume point", "pnpm exec --resume-from core pnpm test", "test"],
    ["pnpm dlx past its package and builds", "pnpm dlx --package pnpm --allow-build esbuild pnpm test", "test"],
    ["bunx past its package", "bunx --bun -p pnpm pnpm test", "test"],
    ["uv run past its options", "uv run --frozen --with pytest --python 3.12 --directory app pnpm test", "test"],
    ["yarn exec", "yarn exec pnpm test", "test"],
    ["yarn dlx past its package", "yarn dlx -q -p pnpm pnpm test", "test"],
    ["cross-env past its assignments", "cross-env NODE_ENV=test CI=1 pnpm test", "test"],
    ["dotenv past its files and variables", "dotenv -e .env.test -v CI=1 -- pnpm test", "test"],
    ["xvfb-run past its server", "xvfb-run -a -n 99 -w 3 -e xvfb.log pnpm test", "test"],
    ["nyc past its reporter", "nyc --reporter lcov -r text --all --temp-dir .nyc pnpm test", "test"],
    ["c8 past its reporter", "c8 -r lcov --all -o coverage --src src pnpm test", "test"],
    ["flock past its wait and lock file", "flock -x -w 10 -E 3 /tmp/ci.lock pnpm test", "test"],
    ["a chain of them", "sudo -u runner env CI=1 timeout -k 5s 10m npx -y pnpm test", "test"],
    ["a chain of them after &&", "cd app && nice -n 5 xargs -0 -r cross-env CI=1 pnpm run lint", "lint"],
    ["one of them before npm test", "env CI=1 npm test", "test"],
    ["one of them before a pnpm selection", "env CI=1 pnpm --filter core test", "test"],
  ] as const)("reads a script run behind %s as run", (_behind, command, script) => {
    expect(commandInvokesScript(command, script)).toBe(true);
  });

  it.each([
    ["timeout -k v 10m pnpm test"],
    ["timeout --kill-after v 10m pnpm test"],
    ["timeout -s v 10m pnpm test"],
    ["timeout --signal v 10m pnpm test"],
    ["npm exec --package v pnpm test"],
    ["npm exec -w v pnpm test"],
    ["npm exec --workspace v pnpm test"],
    ["npm exec -c v pnpm test"],
    ["npm exec --call v pnpm test"],
    ["pnpm exec --resume-from v pnpm test"],
    ["pnpm dlx --package v pnpm test"],
    ["pnpm dlx --allow-build v pnpm test"],
    ["npx --package v pnpm test"],
    ["npx -p v pnpm test"],
    ["npx -w v pnpm test"],
    ["npx --workspace v pnpm test"],
    ["npx -c v pnpm test"],
    ["npx --call v pnpm test"],
    ["yarn dlx -p v pnpm test"],
    ["yarn dlx --package v pnpm test"],
    ["bunx -p v pnpm test"],
    ["bunx --package v pnpm test"],
    ["uv run --with v pnpm test"],
    ["uv run --with-editable v pnpm test"],
    ["uv run --with-requirements v pnpm test"],
    ["uv run --python v pnpm test"],
    ["uv run -p v pnpm test"],
    ["uv run --directory v pnpm test"],
    ["uv run --project v pnpm test"],
    ["uv run --package v pnpm test"],
    ["uv run --extra v pnpm test"],
    ["uv run --group v pnpm test"],
    ["uv run --env-file v pnpm test"],
    ["env -u v pnpm test"],
    ["env --unset v pnpm test"],
    ["env -C v pnpm test"],
    ["env --chdir v pnpm test"],
    ["env -S v pnpm test"],
    ["env --split-string v pnpm test"],
    ["nice -n v pnpm test"],
    ["nice --adjustment v pnpm test"],
    ["time -f v pnpm test"],
    ["time --format v pnpm test"],
    ["time -o v pnpm test"],
    ["time --output v pnpm test"],
    ["exec -a v pnpm test"],
    ["xargs -a v pnpm test"],
    ["xargs --arg-file v pnpm test"],
    ["xargs -d v pnpm test"],
    ["xargs --delimiter v pnpm test"],
    ["xargs -E v pnpm test"],
    ["xargs -I v pnpm test"],
    ["xargs -L v pnpm test"],
    ["xargs -n v pnpm test"],
    ["xargs --max-args v pnpm test"],
    ["xargs -P v pnpm test"],
    ["xargs --max-procs v pnpm test"],
    ["xargs -s v pnpm test"],
    ["xargs --max-chars v pnpm test"],
    ["xargs --process-slot-var v pnpm test"],
    ["stdbuf -i v pnpm test"],
    ["stdbuf --input v pnpm test"],
    ["stdbuf -o v pnpm test"],
    ["stdbuf --output v pnpm test"],
    ["stdbuf -e v pnpm test"],
    ["stdbuf --error v pnpm test"],
    ["sudo -u v pnpm test"],
    ["sudo --user v pnpm test"],
    ["sudo -g v pnpm test"],
    ["sudo --group v pnpm test"],
    ["sudo -C v pnpm test"],
    ["sudo --close-from v pnpm test"],
    ["sudo -D v pnpm test"],
    ["sudo --chdir v pnpm test"],
    ["sudo --host v pnpm test"],
    ["sudo -p v pnpm test"],
    ["sudo --prompt v pnpm test"],
    ["sudo -r v pnpm test"],
    ["sudo --role v pnpm test"],
    ["sudo -t v pnpm test"],
    ["sudo --type v pnpm test"],
    ["sudo -T v pnpm test"],
    ["sudo --command-timeout v pnpm test"],
    ["sudo -U v pnpm test"],
    ["sudo --other-user v pnpm test"],
    ["sudo -R v pnpm test"],
    ["sudo --chroot v pnpm test"],
    ["dotenv -e v pnpm test"],
    ["xvfb-run -e v pnpm test"],
    ["xvfb-run --error-file v pnpm test"],
    ["xvfb-run -f v pnpm test"],
    ["xvfb-run --auth-file v pnpm test"],
    ["xvfb-run -n v pnpm test"],
    ["xvfb-run --server-num v pnpm test"],
    ["xvfb-run -p v pnpm test"],
    ["xvfb-run --xauth-protocol v pnpm test"],
    ["xvfb-run -s v pnpm test"],
    ["xvfb-run --server-args v pnpm test"],
    ["xvfb-run -w v pnpm test"],
    ["xvfb-run --wait v pnpm test"],
    ["nyc -r v pnpm test"],
    ["nyc --reporter v pnpm test"],
    ["nyc --report-dir v pnpm test"],
    ["nyc -t v pnpm test"],
    ["nyc --temp-dir v pnpm test"],
    ["nyc -n v pnpm test"],
    ["nyc --include v pnpm test"],
    ["nyc -x v pnpm test"],
    ["nyc --exclude v pnpm test"],
    ["nyc -e v pnpm test"],
    ["nyc --extension v pnpm test"],
    ["nyc -i v pnpm test"],
    ["nyc --require v pnpm test"],
    ["nyc --cwd v pnpm test"],
    ["nyc --nycrc-path v pnpm test"],
    ["c8 -r v pnpm test"],
    ["c8 --reporter v pnpm test"],
    ["c8 -o v pnpm test"],
    ["c8 --reports-dir v pnpm test"],
    ["c8 --report-dir v pnpm test"],
    ["c8 -n v pnpm test"],
    ["c8 --include v pnpm test"],
    ["c8 -x v pnpm test"],
    ["c8 --exclude v pnpm test"],
    ["c8 -e v pnpm test"],
    ["c8 --extension v pnpm test"],
    ["c8 --temp-directory v pnpm test"],
    ["c8 --src v pnpm test"],
    ["flock -E v ci.lock pnpm test"],
    ["flock --conflict-exit-code v ci.lock pnpm test"],
    ["flock -w v ci.lock pnpm test"],
    ["flock --wait v ci.lock pnpm test"],
    ["flock --timeout v ci.lock pnpm test"],
  ] as const)("reads %s as running test, never the value of the option before it", (command) => {
    expect(commandInvokesScript(command, "test")).toBe(true);
    expect(commandInvokesScript(command.replace(" v ", " "), "test")).toBe(false);
  });

  it.each([
    ["an option's value", "sudo -u pnpm test", "test"],
    ["an option's value under nice", "nice -n pnpm test", "test"],
    ["timeout's duration", "timeout pnpm test", "test"],
    ["timeout's duration past its options", "timeout -k 5s pnpm test", "test"],
    ["flock's lock file", "flock pnpm test", "test"],
    ["flock's lock file past its options", "flock -w 10 pnpm test", "test"],
    ["a command outside them, which takes the invocation as its argument", "echo pnpm test", "test"],
  ] as const)("never reads %s as the command it runs", (_word, command, script) => {
    expect(commandInvokesScript(command, script)).toBe(false);
  });

  it("recognises the unit runner at a step running the test script behind env", () => {
    const ci = [stepRunning("env CI=1 pnpm test")];
    expect(recognisedRunners(workflowSteps(ci), { test: "vitest run" }, { unit: "vitest" }, shellReading)).toEqual([
      { tier: "unit", runner: "vitest", step: "Check" },
    ]);
  });

  it.each([["env CI=1 vitest run"], ["sudo vitest run"], ["yarn exec vitest run"], ["npx -y vitest run"]] as const)(
    "still leaves a step running %s a candidate, since a runner is read through the launchers alone",
    (command) => {
      expect(recognisedRunners(workflowSteps([stepRunning(command)]), {}, { unit: "vitest" }, shellReading)).toEqual([]);
    }
  );
});

describe("[SCN-WFS-028] commandInvokesScript — a script run after a background &, in a subshell or a group, or in the body of an if or a loop is run", () => {
  it.each([
    ["after a background &", "pnpm start & pnpm test", "test"],
    ["after a background & glued to both commands", "pnpm start&pnpm test", "test"],
    ["before a trailing background & glued to it", "pnpm test&", "test"],
    ["after bash's |&", "pnpm build |& pnpm check", "check"],
    ["after !", "! pnpm test", "test"],
    ["in a subshell", "( pnpm test )", "test"],
    ["in a group", "{ pnpm test; }", "test"],
    ["as an if's condition", "if pnpm test; then echo ok; fi", "test"],
    ["as an if's negated condition", "if ! pnpm test; then exit 1; fi", "test"],
    ["as an if's negated condition spaced from its ;", "if ! pnpm test ; then exit 1; fi", "test"],
    ["in an if's then", "if true; then pnpm test; fi", "test"],
    ["as an elif's condition", "if false; then :; elif pnpm test; then :; fi", "test"],
    ["in an if's else", "if false; then :; else pnpm test; fi", "test"],
    ["as a while's condition", "while pnpm test; do :; done", "test"],
    ["as an until's condition", "until pnpm test; do sleep 1; done", "test"],
    ["in a for's body", "for p in a b; do pnpm test; done", "test"],
    ["in a for's body spaced from its ;", "for p in a b; do pnpm test ; done", "test"],
    ["in a for's body with an argument", "for p in a b; do pnpm test --run; done", "test"],
    ["in a while's body", "while true; do pnpm test; done", "test"],
    ["through shell words and a command that runs the command after it", "if ! ( env CI=1 pnpm test ); then exit 1; fi", "test"],
  ] as const)("reads a script run %s as run", (_where, command, script) => {
    expect(commandInvokesScript(command, script)).toBe(true);
  });

  it.each([
    ["the file a redirection's >& names", "echo done >&pnpm test", "test"],
    ["a shell word as echo's argument", "echo if pnpm test", "test"],
    ["! as grep's argument", "grep ! pnpm test", "test"],
    ["do as echo's argument", "echo do pnpm test", "test"],
  ] as const)("never reads %s as a command run", (_word, command, script) => {
    expect(commandInvokesScript(command, script)).toBe(false);
  });

  it.each([["( cd packages/core && pnpm test )"], ["if ! pnpm test; then exit 1; fi"], ["pnpm start & pnpm test"]] as const)(
    "recognises the unit runner at a step running the test script as %s",
    (command) => {
      const ci = [stepRunning(command)];
      expect(recognisedRunners(workflowSteps(ci), { test: "vitest run" }, { unit: "vitest" }, shellReading)).toEqual([
        { tier: "unit", runner: "vitest", step: "Check" },
      ]);
    }
  );

  it.each([["( vitest run )"], ["if ! vitest run; then exit 1; fi"]] as const)(
    "still leaves a step running %s a candidate, since a runner is read through the launchers alone",
    (command) => {
      expect(recognisedRunners(workflowSteps([stepRunning(command)]), {}, { unit: "vitest" }, shellReading)).toEqual([]);
    }
  );
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

  it.each([
    ["yarn workspaces foreach -A exec tsc", "tsc"],
    ["yarn workspaces foreach exec vitest", "vitest"],
    ["yarn workspaces foreach --all --parallel exec eslint .", "."],
  ] as const)("never reads %s as running a script %s, since exec runs a binary", (command, script) => {
    expect(commandInvokesScript(command, script)).toBe(false);
  });

  it.each([
    ["yarn workspaces foreach exec pnpm lint --fix"],
    ["yarn workspaces foreach -A exec pnpm lint --fix"],
    ["yarn workspaces foreach -A -p -t -v exec pnpm lint --fix"],
    ["yarn workspaces foreach --include v exec pnpm lint --fix"],
    ["yarn workspaces foreach --exclude v exec pnpm lint --fix"],
    ["yarn workspaces foreach --from v exec pnpm lint --fix"],
    ["yarn workspaces foreach -j v exec pnpm lint --fix"],
    ["yarn workspaces foreach --jobs v exec pnpm lint --fix"],
    ["yarn workspaces foreach --all --include v --jobs v exec env CI=1 pnpm lint --fix"],
  ] as const)("reads %s as running lint, the script of the command after exec", (command) => {
    expect(commandInvokesScript(command, "lint")).toBe(true);
  });
});
