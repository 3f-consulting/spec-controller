import { describe, expect, it } from "vitest";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AppError, AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { runBalanceCaptured } from "./runBalance.test-utils.js";
import { inputsReadBy } from "./balance.js";
import type { InputReader } from "../inputs/inputsRead.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { printedRefusal } from "../messages/shownText.test-utils.js";

function workflowFilesAt(path: string): string[] {
  return path.endsWith(".yml") ? [path] : [`${path}/ci.yml`, `${path}/nightly.yaml`];
}

const reader: InputReader = {
  exists: () => true,
  featureFiles: (dir) => [`${dir}/a.feature`],
  workflowFiles: workflowFilesAt,
};

describe("[CLM-FMT-013] the files a run reads are named by how the run came to read them", () => {
  it("names each input the run was pointed at by its flag", () => {
    const args = { vitest: "v.json", cucumber: "c.json", "ci-steps": "s.json", "package-json": "p.json", features: "f", ci: "w.yml" };

    expect(inputsReadBy(args, reader)).toEqual([
      { subject: "the --vitest report", path: "v.json" },
      { subject: "the --cucumber report", path: "c.json" },
      { subject: "the --package-json manifest", path: "p.json" },
      { subject: "the --ci-steps record", path: "s.json" },
      { subject: message(AppMessage.FlaggedCorpusFeatureFile), path: "f/a.feature" },
      { subject: message(AppMessage.FlaggedCiWorkflow), path: "w.yml" },
    ]);
  });

  it("names the inputs read by default, when the run was not pointed elsewhere", () => {
    expect(inputsReadBy({}, reader)).toEqual([
      { subject: "the package.json read by default", path: "package.json" },
      { subject: message(AppMessage.DefaultCorpusFeatureFile), path: "features/a.feature" },
      { subject: message(AppMessage.DefaultCiWorkflow), path: ".github/workflows/ci.yml" },
      { subject: message(AppMessage.DefaultCiWorkflow), path: ".github/workflows/nightly.yaml" },
    ]);
  });

  it("names every workflow of a folder the run was pointed at", () => {
    expect(inputsReadBy({ ci: "workflows" }, reader).filter((i) => i.subject.includes("workflow"))).toEqual([
      { subject: message(AppMessage.FlaggedCiFolderWorkflow), path: "workflows/ci.yml" },
      { subject: message(AppMessage.FlaggedCiFolderWorkflow), path: "workflows/nightly.yaml" },
    ]);
  });
});

describe("[CLM-FMT-013] balance refuses a --format naming one of the feature files it reads, and writes one naming a file it does not read", () => {
  function target(): { features: string; ci: string } {
    const dir = temporaryDirectory("fmt-013-unit-");
    const features = join(dir, "features");
    mkdirSync(features);
    writeFileSync(join(features, "a.feature"), "Feature: a\n");
    writeFileSync(join(features, "b.feature"), "Feature: b\n");
    writeFileSync(join(features, "notes.txt"), "not a feature\n");
    const ci = join(dir, "ci.yml");
    writeFileSync(ci, "jobs: {}\n");
    return { features, ci };
  }

  function contentsOf(dir: string): Record<string, string> {
    return Object.fromEntries(readdirSync(dir).map((name) => [name, readFileSync(join(dir, name), "utf8")]));
  }

  function captured(argv: string[]): { stdout: string; stderr: string; exitCode: unknown } {
    const { stdout, stderr, exitCode } = runBalanceCaptured(argv);
    return { stdout, stderr, exitCode };
  }

  it("refuses a markdown report on a feature file of the --features corpus at exit 2, naming the output and that file, and leaves every file as it was", () => {
    const { features, ci } = target();
    const before = contentsOf(features);
    const output = join(features, "b.feature");

    expect(captured(["--features", features, "--ci", ci, "--format", `md:${output}`])).toEqual({
      stdout: "",
      stderr:
        printedRefusal(
          AppError.OutputOverwritesInput,
          message(AppError.OutputOverwritesInput, { output: `md:${output}`, subject: message(AppMessage.FlaggedCorpusFeatureFile), path: output }),
          "balance",
        ) + "\n",
      exitCode: 2,
    });
    expect(contentsOf(features)).toEqual(before);
  });

  it("writes a markdown report on a file of the corpus folder that is not a feature file, since the run does not read it", () => {
    const { features, ci } = target();
    const output = join(features, "notes.txt");

    const run = captured(["--features", features, "--ci", ci, "--format", `md:${output}`]);

    expect(run.stderr).toBe("");
    expect(run.stdout).toBe("");
    expect(readFileSync(output, "utf8")).not.toBe("not a feature\n");
    expect(readFileSync(output, "utf8")).toContain("# ");
    expect(readFileSync(join(features, "a.feature"), "utf8")).toBe("Feature: a\n");
  });

  it("writes a report to a new file while one of the inputs it reads is no regular file, alongside inputs that are", () => {
    const { features } = target();
    const output = join(features, "..", "report.md");

    const run = captured(["--features", features, "--ci", "/dev/null", "--format", `md:${output}`]);

    expect(run.stderr).toBe("");
    expect(readFileSync(output, "utf8")).toContain("# ");
  });
});
