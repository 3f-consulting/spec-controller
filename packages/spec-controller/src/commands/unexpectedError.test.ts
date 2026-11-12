import { EventEmitter } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closedPipe, crashLine, FIRST_LINE, noVerdictLine } from "../runEnding/crashGuards.test-utils.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { repositoryHeadedOneCarrying003 } from "../repository/repository.test-utils.js";

const PLANTED = "planted: the reading of this file throws";

// The parser accepts the planted file, and only what spec-controller then reads from its document is broken.
vi.mock("../../../core/node_modules/@cucumber/gherkin/dist/index.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../core/node_modules/@cucumber/gherkin/dist/index.js")>();
  type Document = ReturnType<InstanceType<typeof real.Parser>["parse"]>;
  const planted = (source: string, document: Document): Document => {
    if (!source.includes(PLANTED) || document.feature === undefined) return document;
    return { ...document, feature: { ...document.feature, children: 42 as never } };
  };
  const Parser = new Proxy(real.Parser, {
    construct(parserClass, args: ConstructorParameters<typeof real.Parser>): object {
      const parser = Reflect.construct(parserClass, args) as InstanceType<typeof real.Parser>;
      const parse = parser.parse.bind(parser);
      parser.parse = (source: string): Document => planted(source, parse(source));
      return parser;
    },
  });
  return { ...real, Parser };
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

interface Ran {
  stdout: string;
  stderr: string;
  exitCode: typeof process.exitCode;
}

const FIXTURE = (): string => fileURLToPath(new URL("../../../../tests/fixtures/evidence-observation", import.meta.url));

const balanceArgv = (): string[] => [
  "balance",
  "--features", join(FIXTURE(), "features"),
  "--vitest", join(FIXTURE(), "vitest.json"),
  "--ci", FIXTURE(),
];

function captured(onStdout: (chunk: string) => void): { stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    onStdout(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  return { stdout, stderr };
}

async function ran(argv: string[], onStdout: (chunk: string) => void = () => {}): Promise<Ran> {
  vi.resetModules();
  const { main } = await import("./main.js");
  const { stdout, stderr } = captured(onStdout);
  main(argv);
  return { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
}

// The guards hold the real process's exit code and write to its stderr; their stdout is a stand-in the test fails once main has returned.
async function stdoutFailsAfterTheRun(argv: string[], stdoutFails: boolean): Promise<Ran> {
  vi.resetModules();
  const { main } = await import("./main.js");
  const { installCrashGuards: install } = await import("../runEnding/crashGuards.js");
  const { stdout, stderr } = captured(() => {});
  const proc = Object.assign(new EventEmitter(), { exit: (): void => {} });
  Object.defineProperty(proc, "exitCode", {
    get: () => process.exitCode,
    set: (code: typeof process.exitCode) => {
      process.exitCode = code;
    },
  });
  const guardedStdout = new EventEmitter();
  const guardedStderr = Object.assign(new EventEmitter(), { write: (chunk: string): boolean => process.stderr.write(chunk) });
  install(proc as EventEmitter & { exitCode: number | undefined; exit(): void }, guardedStdout, guardedStderr);
  main(argv);
  if (stdoutFails) guardedStdout.emit("error", closedPipe());
  const result = { stdout: stdout.join(""), stderr: stderr.join(""), exitCode: process.exitCode };
  vi.restoreAllMocks();
  process.exitCode = undefined;
  return result;
}

function plantedTarget(): string {
  const target = temporaryDirectory("unexpected-error-reading-");
  mkdirSync(join(target, "features"));
  writeFileSync(join(target, "features", "part.feature"), `# ${PLANTED}\n@AB\nFeature: a part\n\n  @unit @CLM-AB-001\n  Scenario: a scenario\n`);
  writeFileSync(join(target, "ci.yml"), "name: ci\non: push\njobs:\n  ci:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm test\n");
  return target;
}

describe("the run will give no verdict, and will exit 4", () => {
  it.each([
    ["allocate answered", ["allocate", "ONE"]],
    ["a command the tool does not have was refused", ["nosuchcommand"]],
    ["balance refused a flag it does not take", ["balance", "--bogus"]],
  ])("[CLM-CLI-176] the run met an error nothing else handles, after %s", async (_ended, argv) => {
    vi.spyOn(process, "cwd").mockReturnValue(repositoryHeadedOneCarrying003("unexpected-error-after-"));

    const afterwards = await stdoutFailsAfterTheRun(argv, true);

    expect(afterwards.exitCode).toBe(4);
    expect(afterwards.stderr.endsWith(noVerdictLine())).toBe(true);
  });

  it("[CLM-CLI-178] the run met an error before the run reached its verdict", async () => {
    const run = await ran(balanceArgv(), () => {
      throw closedPipe();
    });

    expect(run.exitCode).toBe(4);
    expect(run.stderr).toBe(noVerdictLine());
  });

  it("[CLM-CLI-180] the run met an error in reading a file the parser accepted", async () => {
    const target = plantedTarget();

    const run = await ran(["balance", "--features", join(target, "features"), "--ci", join(target, "ci.yml")]);

    expect(run.exitCode).toBe(4);
    expect(run.stderr.split("\n")).toHaveLength(2);
    expect(run.stderr.startsWith(crashLine("TypeError", ""))).toBe(true);
  });
});

describe("an unexpected error after the run verdict will leave its exit code alone", () => {
  it("[CLM-CLI-181] a run that reached its run verdict, then met an unexpected error", async () => {
    const verdictAlone = await stdoutFailsAfterTheRun(balanceArgv(), false);
    const afterwards = await stdoutFailsAfterTheRun(balanceArgv(), true);

    expect(verdictAlone.stderr).toBe("");
    expect(verdictAlone.exitCode).toBeDefined();
    expect(afterwards.exitCode).toBe(verdictAlone.exitCode);
    expect(afterwards.stderr).toBe(`${crashLine("Error", FIRST_LINE)}\n`);
  });
});

