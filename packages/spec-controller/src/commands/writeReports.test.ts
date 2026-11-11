import { chmodSync, closeSync, existsSync, lstatSync, statSync, mkdirSync, openSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderJson, renderMarkdown, type EvidenceReconciliation, type IdentifiedInput } from "@3f-consulting/spec-controller-core";
import { writeReports } from "./balance.js";
import { regularFileIdentity } from "../output/outputLocation.js";
import { settlingRefusal } from "../runEnding/usageRefusal.js";
import { AppError, AppMessage } from "../messages/messages.js";
import { message } from "../messages/appText.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "../programOutput.test-utils.js";

const RUN: EvidenceReconciliation = {
  claimReconciliations: [],
  runVerdict: { verdict: "not-reconciled", why: "nothing-to-reconcile" },
  totals: {
    claimReconciliations: { total: 0, balanced: 0, outOfBalance: 0 },
    qualityCheckReconciliations: { total: 0, outOfBalance: 0, byOutcome: [], missingByKind: [] },
    evidenceObservations: { total: 0, byKind: [], onExecutableClaim: 0, onPhantomClaim: 0, onUnnamedClaim: 0, fitnessFunctionsRan: 0 },
    excludedClaimCodeOccurrences: 0,
  },
  provenance: { target: "acme/widgets", sourceSha: "unknown", toolVersion: "0.2.0", inputs: [] },
};

recordWhatTheProgramWrites();

// Standard output and standard error, as the tool finds their files, can be redirected onto files a test opened, leaving
// the process's own alone.
const redirectedStreams = new Map<number, number>();

vi.mock("node:fs", async (importOriginal) => {
  const fs: { readonly fstatSync: (fd: number, options?: object) => unknown } = await importOriginal();
  return { ...fs, fstatSync: (fd: number, options?: object) => fs.fstatSync(redirectedStreams.get(fd) ?? fd, options) };
});

// The tool's modules are read afresh, so it finds its standard streams through the mock whichever test file the worker
// loaded them for first.
async function reportsWrittenWithStandardStreamsOn(
  paths: { readonly stdout: string; readonly stderr: string },
  formatSpecs: readonly string[],
  inputs: readonly IdentifiedInput[] = [],
): Promise<Written> {
  const opened = [openSync(paths.stdout, "r"), openSync(paths.stderr, "r")];
  opened.forEach((fd, index) => redirectedStreams.set(index + 1, fd));
  try {
    vi.resetModules();
    const { writeReports: freshWriteReports } = await import("./balance.js");
    const { settlingRefusal: freshSettlingRefusal } = await import("../runEnding/usageRefusal.js");
    freshSettlingRefusal(() => {
      freshWriteReports(formatSpecs, RUN, inputs);
      return true;
    }, false);
    return whatTheProgramWrote();
  } finally {
    redirectedStreams.clear();
    opened.forEach((fd) => closeSync(fd));
  }
}

function reportsWritten(formatSpecs: readonly string[], inputs: readonly IdentifiedInput[] = []): Written {
  settlingRefusal(() => {
    writeReports(formatSpecs, RUN, inputs);
    return true;
  }, false);
  return whatTheProgramWrote();
}

describe("you will get the report format you named", () => {
  it.each([
    ["CLM-FMT-001", "no format", [], "md"],
    ["CLM-FMT-014", "md", ["md"], "md"],
    ["CLM-FMT-015", "json", ["json"], "json"],
  ] as const)("[%s] asking for %s gives that report", (_clm, _format, formatSpecs, report) => {
    expect(reportsWritten(formatSpecs).stdout).toBe(report === "md" ? renderMarkdown(RUN) : renderJson(RUN));
  });
});

describe("a report will be where you asked", () => {
  const holdsTheReport = (path: string): boolean => existsSync(path) && readFileSync(path, "utf8") === renderMarkdown(RUN);

  it.each([
    ["CLM-FMT-016", "no destination", (_dir: string) => ["md"], (_dir: string, written: Written) => ({ onStandardOutput: written.stdout === renderMarkdown(RUN) })],
    [
      "CLM-FMT-003",
      "a file",
      (dir: string) => [`md:${join(dir, "report.md")}`],
      (dir: string, written: Written) => ({ inTheFile: holdsTheReport(join(dir, "report.md")), standardOutput: written.stdout }),
    ],
    ["CLM-FMT-017", "a file whose name contains a colon", (dir: string) => [`md:${join(dir, "a:b.md")}`], (dir: string) => ({ inTheFile: holdsTheReport(join(dir, "a:b.md")) })],
    [
      "CLM-FMT-012",
      "a link to a file that does not exist yet",
      (dir: string) => {
        symlinkSync(join(dir, "target.md"), join(dir, "link.md"));
        return [`md:${join(dir, "link.md")}`];
      },
      (dir: string) => ({
        inTheFile: holdsTheReport(join(dir, "target.md")),
        linkStays: lstatSync(join(dir, "link.md")).isSymbolicLink() && readlinkSync(join(dir, "link.md")) === join(dir, "target.md"),
      }),
    ],
    [
      "CLM-FMT-018",
      "a file that already exists",
      (dir: string) => {
        writeFileSync(join(dir, "report.md"), "earlier\n");
        return [`md:${join(dir, "report.md")}`];
      },
      (dir: string) => ({ inTheFile: holdsTheReport(join(dir, "report.md")) }),
    ],
    [
      "CLM-FMT-019",
      "a file in the corpus folder that is not a feature file",
      (dir: string) => {
        mkdirSync(join(dir, "features"));
        writeFileSync(join(dir, "features", "one.feature"), "Feature: one\n");
        return [`md:${join(dir, "features", "report.md")}`];
      },
      (dir: string) => ({
        inTheFile: holdsTheReport(join(dir, "features", "report.md")),
        featureFile: readFileSync(join(dir, "features", "one.feature"), "utf8"),
      }),
    ],
  ])("[%s] a report asked for at %s is there", (clm, _destination, arrange, observe) => {
    const dir = temporaryDirectory("spec-controller-report-place-");
    const seen = observe(dir, reportsWritten(arrange(dir)));
    const expected: Record<string, unknown> = {
      "CLM-FMT-016": { onStandardOutput: true },
      "CLM-FMT-003": { inTheFile: true, standardOutput: "" },
      "CLM-FMT-017": { inTheFile: true },
      "CLM-FMT-012": { inTheFile: true, linkStays: true },
      "CLM-FMT-018": { inTheFile: true },
      "CLM-FMT-019": { inTheFile: true, featureFile: "Feature: one\n" },
    };
    expect(seen).toEqual(expected[clm]);
  });
});

describe("each of two reports will be where you asked", () => {
  const holds = (path: string, report: string): boolean => existsSync(path) && readFileSync(path, "utf8") === report;

  it.each([
    [
      "CLM-FMT-004",
      "no destination for one, a file for the other",
      (dir: string) => ["md", `json:${join(dir, "report.json")}`],
      (dir: string, written: Written) => ({ onStandardOutput: written.stdout === renderMarkdown(RUN), inTheFile: holds(join(dir, "report.json"), renderJson(RUN)) }),
    ],
    [
      "CLM-FMT-020",
      "no destination for one, standard error for the other",
      (_dir: string) => ["md", "json:/dev/stderr"],
      (_dir: string, written: Written) => ({ onStandardOutput: written.stdout === renderMarkdown(RUN), onStandardError: written.stderr === renderJson(RUN) }),
    ],
    [
      "CLM-FMT-021",
      "two different files",
      (dir: string) => [`md:${join(dir, "report.md")}`, `json:${join(dir, "report.json")}`],
      (dir: string) => ({ inTheFirstFile: holds(join(dir, "report.md"), renderMarkdown(RUN)), inTheSecondFile: holds(join(dir, "report.json"), renderJson(RUN)) }),
    ],
  ])("[%s] two reports asked for at %s are each where asked", async (clm, _destination, arrange, observe) => {
    const dir = temporaryDirectory("spec-controller-two-places-");
    const written = await reportsWrittenWithStandardStreamsOn({ stdout: "/dev/null", stderr: "/dev/null" }, arrange(dir));
    const expected: Record<string, unknown> = {
      "CLM-FMT-004": { onStandardOutput: true, inTheFile: true },
      "CLM-FMT-020": { onStandardOutput: true, onStandardError: true },
      "CLM-FMT-021": { inTheFirstFile: true, inTheSecondFile: true },
    };
    expect({ exitCode: written.exitCode, seen: observe(dir, written) }).toEqual({ exitCode: undefined, seen: expected[clm] });
  });

  it("[CLM-FMT-022] two reports asked for at /dev/stderr, which is a file, are both on standard error, one after the other", async () => {
    const file = join(temporaryDirectory("spec-controller-two-stderr-"), "stderr.log");
    writeFileSync(file, "");
    const written = await reportsWrittenWithStandardStreamsOn({ stdout: "/dev/null", stderr: file }, ["md:/dev/stderr", "json:/dev/stderr"]);
    expect({ exitCode: written.exitCode, onStandardError: written.stderr === renderMarkdown(RUN) + renderJson(RUN) }).toEqual({ exitCode: undefined, onStandardError: true });
  });
});

describe("two reports will not both go to standard output", () => {
  it.each([
    ["CLM-FMT-005", "no destination", (_dir: string) => "json"],
    ["CLM-FMT-011", "a path that names standard output", (_dir: string) => "json:/dev/stdout"],
    [
      "CLM-FMT-023",
      "a link to standard output",
      (dir: string) => {
        symlinkSync("/dev/stdout", join(dir, "out"));
        return `json:${join(dir, "out")}`;
      },
    ],
  ])("[%s] no destination beside %s stops the run, naming what each report asked for", (_clm, _other, other) => {
    const dir = temporaryDirectory("spec-controller-two-stdout-");
    const written = reportsWritten(["md", other(dir)]);
    expect({
      exitCode: written.exitCode,
      complaint: written.stderr.includes(message(AppError.MoreThanOneToStdout, { formats: "md, json" })),
      standardOutput: written.stdout,
    }).toEqual({ exitCode: 2, complaint: true, standardOutput: "" });
  });
});

describe("two reports will not go in one file", () => {
  it.each([
    ["CLM-FMT-010", "the same path", (file: string, _dir: string) => ({ spec: `json:${file}`, shown: `json:${file}`, stdout: "/dev/null" })],
    [
      "CLM-FMT-024",
      "a link to it",
      (file: string, dir: string) => {
        symlinkSync(file, join(dir, "link.json"));
        return { spec: `json:${join(dir, "link.json")}`, shown: `json:${join(dir, "link.json")}`, stdout: "/dev/null" };
      },
    ],
    ["CLM-FMT-025", "standard output, redirected to the file", (file: string, _dir: string) => ({ spec: "json", shown: message(AppMessage.FormatOnStandardOutput, { fmt: "json" }), stdout: file })],
  ])("[%s] a report on a file beside one at %s stops the run, naming the file and both reports, and leaves the file as it was", async (_clm, _other, arrange) => {
    const dir = temporaryDirectory("spec-controller-one-file-");
    const file = join(dir, "shared.out");
    writeFileSync(file, "earlier\n");
    const { spec, shown, stdout } = arrange(file, dir);
    const written = await reportsWrittenWithStandardStreamsOn({ stdout, stderr: "/dev/null" }, [`md:${file}`, spec]);
    expect({
      exitCode: written.exitCode,
      complaint: written.stderr.includes(message(AppError.OutputsShareFile, { first: `md:${file}`, second: shown })),
      asItWas: readFileSync(file, "utf8"),
    }).toEqual({ exitCode: 2, complaint: true, asItWas: "earlier\n" });
  });
});

describe("a place it cannot write will stop the run, and nothing will be written", () => {
  it.each([
    [
      "CLM-FMT-008",
      "a file it may not write",
      "EACCES",
      (dir: string) => {
        const path = join(dir, "read-only.md");
        writeFileSync(path, "earlier\n");
        chmodSync(path, 0o444);
        return path;
      },
      (path: string) => readFileSync(path, "utf8") === "earlier\n",
    ],
    [
      "CLM-FMT-026",
      "an existing folder",
      "EISDIR",
      (dir: string) => {
        mkdirSync(join(dir, "a-folder"));
        return join(dir, "a-folder");
      },
      (path: string) => statSync(path).isDirectory(),
    ],
    ["CLM-FMT-027", "a file in a folder that doesn't exist", "ENOENT", (dir: string) => join(dir, "missing", "report.md"), (path: string) => !existsSync(path)],
  ])("[%s] a report asked for at %s stops the run, naming the place and %s", (_clm, _place, why, arrange, asItWas) => {
    const path = arrange(temporaryDirectory("spec-controller-unwritable-"));
    const written = reportsWritten([`md:${path}`]);
    expect({
      exitCode: written.exitCode,
      complaint: written.stderr.includes(path) && written.stderr.includes(why),
      standardOutput: written.stdout,
      asItWas: asItWas(path),
    }).toEqual({ exitCode: 2, complaint: true, standardOutput: "", asItWas: true });
  });
});

describe("if one report cannot be written, neither will be", () => {
  it.each([
    ["CLM-FMT-009", "no destination", (_dir: string) => "md", (_dir: string, written: Written) => written.stdout === ""],
    ["CLM-FMT-028", "a file that does not exist", (dir: string) => `md:${join(dir, "new.md")}`, (dir: string) => !existsSync(join(dir, "new.md"))],
    [
      "CLM-FMT-029",
      "a file that already exists",
      (dir: string) => {
        writeFileSync(join(dir, "existing.md"), "earlier\n");
        return `md:${join(dir, "existing.md")}`;
      },
      (dir: string) => readFileSync(join(dir, "existing.md"), "utf8") === "earlier\n",
    ],
    [
      "CLM-FMT-030",
      "a link to a file not yet made",
      (dir: string) => {
        symlinkSync(join(dir, "target.md"), join(dir, "link.md"));
        return `md:${join(dir, "link.md")}`;
      },
      (dir: string) => !existsSync(join(dir, "target.md")) && lstatSync(join(dir, "link.md")).isSymbolicLink(),
    ],
  ])("[%s] with the other report asked for at %s, neither is written", (_clm, _other, other, stays) => {
    const dir = temporaryDirectory("spec-controller-neither-");
    const unwritable = join(dir, "missing", "report.json");
    const written = reportsWritten([other(dir), `json:${unwritable}`]);
    expect({ exitCode: written.exitCode, complaint: written.stderr.includes(unwritable), stays: stays(dir, written) }).toEqual({
      exitCode: 2,
      complaint: true,
      stays: true,
    });
  });

  it("[CLM-FMT-009] with the other report asked for at no destination, a report asked for at a link that leads back to itself stops the run", () => {
    const dir = temporaryDirectory("spec-controller-neither-");
    const loop = join(dir, "loop.json");
    symlinkSync(join(dir, "back.json"), loop);
    symlinkSync(loop, join(dir, "back.json"));

    const written = reportsWritten(["md", `json:${loop}`]);

    expect({
      exitCode: written.exitCode,
      complaint: written.stderr.includes(loop) && written.stderr.includes("ELOOP"),
      standardOutput: written.stdout,
    }).toEqual({ exitCode: 2, complaint: true, standardOutput: "" });
  });
});

describe("a report will not be written over a file the run reads", () => {
  it("[CLM-FMT-013] a report will not be written over a file the run reads", () => {
    const testResults = join(temporaryDirectory("spec-controller-input-"), "vitest.json");
    writeFileSync(testResults, "{}\n");
    const written = reportsWritten([`json:${testResults}`], [{ subject: "Vitest report", path: testResults, identity: regularFileIdentity(testResults) }]);
    expect({
      exitCode: written.exitCode,
      complaint: written.stderr.includes(testResults),
      asItWas: readFileSync(testResults, "utf8"),
    }).toEqual({ exitCode: 2, complaint: true, asItWas: "{}\n" });
  });

  it("[CLM-FMT-013] the second of two reports will not be written over a file the run reads", () => {
    const dir = temporaryDirectory("spec-controller-input-");
    const testResults = join(dir, "vitest.json");
    writeFileSync(testResults, "{}\n");
    const written = reportsWritten([`md:${join(dir, "report.md")}`, `json:${testResults}`], [{ subject: "Vitest report", path: testResults, identity: regularFileIdentity(testResults) }]);
    expect({
      exitCode: written.exitCode,
      complaint: written.stderr.includes(testResults),
      asItWas: readFileSync(testResults, "utf8"),
      report: existsSync(join(dir, "report.md")),
    }).toEqual({ exitCode: 2, complaint: true, asItWas: "{}\n", report: false });
  });
});

describe("a report on standard error will not go in a file another report names or the run reads", () => {
  it.each([
    ["CLM-FMT-031", "a file another report names", (file: string) => ({ formatSpecs: ["md:/dev/stderr", `json:${file}`], inputs: [] })],
    [
      "CLM-FMT-032",
      "a file the run reads",
      (file: string) => ({ formatSpecs: ["md:/dev/stderr"], inputs: [{ subject: "Vitest report", path: file, identity: regularFileIdentity(file) }] }),
    ],
  ])("[%s] a report on standard error, redirected onto %s, stops the run and leaves the file as it was", async (_clm, _file, run) => {
    const file = join(temporaryDirectory("spec-controller-stderr-"), "vitest.json");
    writeFileSync(file, "{}\n");
    const { formatSpecs, inputs } = run(file);
    const written = await reportsWrittenWithStandardStreamsOn({ stdout: "/dev/null", stderr: file }, formatSpecs, inputs);
    expect({
      exitCode: written.exitCode,
      complaint: written.stderr.includes(file),
      asItWas: readFileSync(file, "utf8"),
    }).toEqual({ exitCode: 2, complaint: true, asItWas: "{}\n" });
  });
});
