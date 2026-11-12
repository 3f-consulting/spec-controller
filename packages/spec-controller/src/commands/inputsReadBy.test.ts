import { describe, expect, it } from "vitest";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AppError } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { runBalanceCaptured } from "./runBalance.test-utils.js";
import { inputsReadOf } from "../inputs/inputsRead.js";
import { INPUT_DEFAULTS } from "../runRequest/defaults.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { printedRefusal } from "../messages/shownText.test-utils.js";

describe("[CLM-FMT-013] the files a run reads are named by their kind: feature file, workflow or report", () => {
  it.each([
    [
      "pointed at by its flag",
      { features: "f", ci: "w" },
      { reports: ["v.json", "p.json"], corpus: "f", featureFiles: ["a.feature", "sub/b.feature"], workflows: ["w/ci.yml", "w/nightly.yaml"] },
      [
        { subject: "a report", path: "v.json", readAt: "v.json" },
        { subject: "a report", path: "p.json", readAt: "p.json" },
        { subject: "a feature file", path: "f/a.feature", readAt: "f/a.feature" },
        { subject: "a feature file", path: "f/sub/b.feature", readAt: "f/sub/b.feature" },
        { subject: "a CI workflow", path: "w/ci.yml", readAt: "w/ci.yml" },
        { subject: "a CI workflow", path: "w/nightly.yaml", readAt: "w/nightly.yaml" },
      ],
    ],
    [
      "read by default",
      {},
      { reports: ["package.json"], corpus: "/target/features", featureFiles: ["a.feature"], workflows: [".github/workflows/ci.yml"] },
      [
        { subject: "a report", path: "package.json", readAt: "package.json" },
        { subject: "a feature file", path: "features/a.feature", readAt: "/target/features/a.feature" },
        { subject: "a CI workflow", path: ".github/workflows/ci.yml", readAt: ".github/workflows/ci.yml" },
      ],
    ],
  ])("names each file %s by its kind", (_how, args: Record<string, string>, read, named) => {
    const inputs = inputsReadOf(args, read, INPUT_DEFAULTS.features);
    expect(inputs).toHaveLength(named.length);
    expect(inputs).toEqual(expect.arrayContaining(named));
  });
});

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

describe("[CLM-FMT-013] balance refuses a --format naming one of the files it reads", () => {
  it("refuses a markdown report on a feature file of the --features corpus at exit 2, naming the output and that file, and leaves every file as it was", () => {
    const { features, ci } = target();
    const before = contentsOf(features);
    const output = join(features, "b.feature");

    expect(captured(["--features", features, "--ci", ci, "--format", `md:${output}`])).toEqual({
      stdout: "",
      stderr:
        printedRefusal(
          AppError.OutputOverwritesInput,
          message(AppError.OutputOverwritesInput, { output: `md:${output}`, subject: "a feature file", path: output }),
          "balance",
        ) + "\n",
      exitCode: 2,
    });
    expect(contentsOf(features)).toEqual(before);
  });

  it("refuses a markdown report on the --vitest report the run reads at exit 2, naming the output and that report, and leaves it as it was", () => {
    const { features, ci } = target();
    const report = join(features, "..", "vitest.json");
    writeFileSync(report, '{"testResults":[]}');

    expect(captured(["--features", features, "--ci", ci, "--vitest", report, "--format", `md:${report}`])).toEqual({
      stdout: "",
      stderr:
        printedRefusal(
          AppError.OutputOverwritesInput,
          message(AppError.OutputOverwritesInput, { output: `md:${report}`, subject: "a report", path: report }),
          "balance",
        ) + "\n",
      exitCode: 2,
    });
    expect(readFileSync(report, "utf8")).toBe('{"testResults":[]}');
  });

  it("refuses a markdown report on the --ci workflow the run reads at exit 2, naming the output and that workflow, and leaves it as it was", () => {
    const { features, ci } = target();

    expect(captured(["--features", features, "--ci", ci, "--format", `md:${ci}`])).toEqual({
      stdout: "",
      stderr:
        printedRefusal(
          AppError.OutputOverwritesInput,
          message(AppError.OutputOverwritesInput, { output: `md:${ci}`, subject: "a CI workflow", path: ci }),
          "balance",
        ) + "\n",
      exitCode: 2,
    });
    expect(readFileSync(ci, "utf8")).toBe("jobs: {}\n");
  });

  it("[CLM-FMT-019] writes a markdown report on a file of the corpus folder that is not a feature file, since the run does not read it", () => {
    const { features, ci } = target();
    const output = join(features, "notes.txt");

    const run = captured(["--features", features, "--ci", ci, "--format", `md:${output}`]);

    expect(run.stderr).toBe("");
    expect(run.stdout).toBe("");
    expect(readFileSync(output, "utf8")).not.toBe("not a feature\n");
    expect(readFileSync(output, "utf8")).toContain("# ");
    expect(readFileSync(join(features, "a.feature"), "utf8")).toBe("Feature: a\n");
  });
});
