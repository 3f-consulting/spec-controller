import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { temporaryDirectory } from "./temporaryDirectory.test-utils.js";

const PLANTED = "planted: the reading of this file throws";

vi.mock("../../core/node_modules/@cucumber/gherkin/dist/index.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../core/node_modules/@cucumber/gherkin/dist/index.js")>();
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

vi.mock("yaml", async (importOriginal) => {
  const real = await importOriginal<typeof import("yaml")>();
  const parse = (source: string): unknown => {
    const document: unknown = real.parse(source);
    if (!source.includes(PLANTED)) return document;
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    return { ...(document as object), jobs: proxy };
  };
  return { ...real, parse };
});

const UNEXPECTED_ERROR_LINE = "spec-controller stopped on an unexpected error, and gives no verdict: TypeError: ";

const FEATURE = "@AB\nFeature: a part\n\n  @unit @SCN-AB-001\n  Scenario: a scenario\n";
const PLANTED_FEATURE = `# ${PLANTED}\n${FEATURE}`;
const REJECTED_FEATURE = `${FEATURE}    Given a step\n  a line the parser rejects\n`;

const WORKFLOW = "name: ci\non: push\njobs:\n  ci:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm test\n";
const PLANTED_WORKFLOW = `# ${PLANTED}\n${WORKFLOW}`;
const REJECTED_WORKFLOW = "name: ci\non: push\njobs:\n  ci:\n    steps: [\n";

interface Answered {
  exitCode: typeof process.exitCode;
  stderr: string;
}

let target: string;
let stderr: string[];

beforeEach(() => {
  target = temporaryDirectory("spec-controller-own-reading-");
  mkdirSync(join(target, "features"));
  stderr = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

function writeTarget(feature: string, workflow: string): void {
  writeFileSync(join(target, "features", "part.feature"), feature);
  writeFileSync(join(target, "ci.yml"), workflow);
}

async function run(argv: string[]): Promise<Answered> {
  vi.resetModules();
  const { main } = await import("./main.js");
  main(argv);
  return { exitCode: process.exitCode, stderr: stderr.join("") };
}

function balance(feature: string, workflow: string): Promise<Answered> {
  writeTarget(feature, workflow);
  return run(["balance", "--features", join(target, "features"), "--ci", join(target, "ci.yml")]);
}

function allocate(feature: string): Promise<Answered> {
  writeTarget(feature, WORKFLOW);
  vi.spyOn(process, "cwd").mockReturnValue(target);
  return run(["allocate", "AB"]);
}

describe("[SCN-CLI-111] an error in reading a feature file or workflow the parser accepted ends the run at 6, and is never refused as that file failing to parse", () => {
  describe.each([
    { run: "a balance run whose feature file the parser accepts", answer: (): Promise<Answered> => balance(PLANTED_FEATURE, WORKFLOW) },
    { run: "a balance run whose workflow the parser accepts", answer: (): Promise<Answered> => balance(FEATURE, PLANTED_WORKFLOW) },
    { run: "an allocate run whose feature file the parser accepts", answer: (): Promise<Answered> => allocate(PLANTED_FEATURE) },
  ])("$run, when spec-controller's reading of the parsed file throws", ({ answer }) => {
    it("exits 6", async () => {
      expect((await answer()).exitCode).toBe(6);
    });

    it("writes one line to stderr, naming the error as unexpected", async () => {
      const said = (await answer()).stderr;
      expect(said.split("\n")).toHaveLength(2);
      expect(said.startsWith(UNEXPECTED_ERROR_LINE)).toBe(true);
    });

    it("never says the file could not be parsed", async () => {
      const said = (await answer()).stderr;
      expect(said).not.toContain("could not be parsed");
      expect(said).not.toContain("not valid YAML");
      expect(said).not.toContain("part.feature");
      expect(said).not.toContain("ci.yml");
    });
  });

  describe.each([
    {
      run: "a balance run whose feature file the parser rejects",
      answer: (): Promise<Answered> => balance(REJECTED_FEATURE, WORKFLOW),
      file: "part.feature",
      parserSaid: "got 'a line the parser rejects'",
    },
    {
      run: "a balance run whose workflow the parser rejects",
      answer: (): Promise<Answered> => balance(FEATURE, REJECTED_WORKFLOW),
      file: "ci.yml",
      parserSaid: "Flow sequence in block collection must be sufficiently indented",
    },
    {
      run: "an allocate run whose feature file the parser rejects",
      answer: (): Promise<Answered> => allocate(REJECTED_FEATURE),
      file: "part.feature",
      parserSaid: "got 'a line the parser rejects'",
    },
  ])("$run", ({ answer, file, parserSaid }) => {
    it("is refused at 2, the usage code", async () => {
      expect((await answer()).exitCode).toBe(2);
    });

    it("names the file and the parser's own words", async () => {
      const said = (await answer()).stderr;
      expect(said).toContain(join(target, file === "ci.yml" ? file : join("features", file)));
      expect(said).toContain(parserSaid);
      expect(said).not.toContain(UNEXPECTED_ERROR_LINE);
    });
  });
});
