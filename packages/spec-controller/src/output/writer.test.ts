import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readlinkSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evidenceReconciliationOf, jsonReportFrom, stepAccountOf, textFor, type EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { inputsReadFor } from "../inputs/inputsRead.js";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import { refusalText } from "../runEnding/refusal.js";
import { runRequestOf } from "../runRequest/runRequest.js";
import { processStreams } from "./streams.js";
import { writeReports } from "./writer.js";

// A run with nothing reconciled, its totals all zero, read as balanced.
const reconciliation = (): EvidenceReconciliation => ({
  ...evidenceReconciliationOf({
    claimReconciliations: [],
    claimCodeErrors: [],
    configurationErrors: [],
    features: [],
    deferredScenarios: 0,
    stepAccount: stepAccountOf([]),
    provenance: { target: "acme/web", sourceSha: "abc1234", toolVersion: "0.1.256", runTime: "2026-11-12T07:08:14Z", inputs: [] },
  }),
  runVerdict: { verdict: "balanced" },
});

// A Vitest evidence report listing no tests, as an input the run reads.
const VITEST_REPORT = '{"testResults":[]}';

// A run asked for no --exit-zero.
const AS_ASKED = { exitZero: false };

// Standard output and standard error as the test's own descriptors, each writing into a list the test reads.
function capturedStreams(): { readonly output: string[]; readonly error: string[]; readonly streams: Parameters<typeof writeReports>[3] } {
  const output: string[] = [];
  const error: string[] = [];
  return { output, error, streams: { output: { fd: 1, write: (text) => output.push(text) }, error: { fd: 2, write: (text) => error.push(text) } } };
}

// What the run says on standard error when it refuses, as the catalogue words it.
const refused = (key: string, values: Readonly<Record<string, string>>): string => `${refusalText({ key, values })}\n`;

const opensAsMarkdown = (text: string): boolean => text.startsWith("# Evidence Reconciliation\n\n## ");

// Text that is not JSON is not the JSON report, rather than an error.
function isJsonReport(text: string): boolean {
  try {
    return "runVerdict" in JSON.parse(text);
  } catch {
    return false;
  }
}

const outputsAskedFor = (args: readonly string[]) => {
  const request = runRequestOf(["balance", ...args]);
  return "command" in request && request.command === "balance" ? request.outputs : [];
};

describe("you will get the report format you ask for", () => {
  it.each([
    ["CLM-FMT-001", "no format", "Markdown", []],
    ["CLM-FMT-014", "md", "Markdown", ["--format", "md"]],
    ["CLM-FMT-015", "json", "JSON", ["--format", "json"]],
  ] as const)("[%s] asking for %s gives the %s report", (_clm, _format, report, args) => {
    const { output, streams } = capturedStreams();

    writeReports(outputsAskedFor(args), [], reconciliation(), streams, AS_ASKED);

    const written = output.join("");
    expect(report === "JSON" ? JSON.parse(written) : opensAsMarkdown(written)).toEqual(report === "JSON" ? jsonReportFrom(reconciliation()) : true);
  });
});

describe("a report will go where you ask", () => {
  it.each([
    [
      "CLM-FMT-003",
      "a file",
      (folder: string) => ["--format", `md:${join(folder, "report.md")}`],
      (folder: string, output: string) => opensAsMarkdown(readFileSync(join(folder, "report.md"), "utf8")) && output === "",
    ],
    [
      "CLM-FMT-018",
      "a file that already exists",
      (folder: string) => {
        writeFileSync(join(folder, "report.md"), "an earlier report");
        return ["--format", `md:${join(folder, "report.md")}`];
      },
      (folder: string) => opensAsMarkdown(readFileSync(join(folder, "report.md"), "utf8")),
    ],
    [
      "CLM-FMT-017",
      "a file whose name contains a colon",
      (folder: string) => ["--format", `md:${join(folder, "a:b.md")}`],
      (folder: string) => opensAsMarkdown(readFileSync(join(folder, "a:b.md"), "utf8")),
    ],
    [
      "CLM-FMT-012",
      "a link to a file that does not exist yet",
      (folder: string) => {
        symlinkSync(join(folder, "target.md"), join(folder, "link.md"));
        return ["--format", `md:${join(folder, "link.md")}`];
      },
      (folder: string) => opensAsMarkdown(readFileSync(join(folder, "target.md"), "utf8")) && readlinkSync(join(folder, "link.md")) === join(folder, "target.md"),
    ],
    [
      "CLM-FMT-019",
      "a file in the corpus folder that is not a feature file",
      (folder: string) => {
        mkdirSync(join(folder, "features"));
        writeFileSync(join(folder, "features", "one.feature"), "Feature: one\n");
        return ["--format", `md:${join(folder, "features", "report.md")}`];
      },
      (folder: string) =>
        opensAsMarkdown(readFileSync(join(folder, "features", "report.md"), "utf8")) && readFileSync(join(folder, "features", "one.feature"), "utf8") === "Feature: one\n",
    ],
  ] as const)("[%s] a report asked for at %s is there", (_clm, _destination, ask, isThere) => {
    const folder = temporaryDirectory("report-destination-");
    const { output, streams } = capturedStreams();
    const args = ask(folder);
    const inputsRead = existsSync(join(folder, "features")) ? [join(folder, "features", "one.feature")] : [];

    writeReports(outputsAskedFor(args), inputsRead, reconciliation(), streams, AS_ASKED);

    expect(isThere(folder, output.join(""))).toBe(true);
  });
});

describe("each of two reports will be where you asked", () => {
  it.each([
    [
      "CLM-FMT-004",
      "no destination for one, a file for the other",
      (folder: string) => ["--format", "md", "--format", `json:${join(folder, "report.json")}`],
      (folder: string, output: string, error: string) => opensAsMarkdown(output) && isJsonReport(readFileSync(join(folder, "report.json"), "utf8")) && error === "",
    ],
    [
      "CLM-FMT-020",
      "no destination for one, standard error for the other",
      (_folder: string) => ["--format", "md", "--format", "json:/dev/stderr"],
      (_folder: string, output: string, error: string) => opensAsMarkdown(output) && isJsonReport(error),
    ],
    [
      "CLM-FMT-021",
      "two different files",
      (folder: string) => ["--format", `md:${join(folder, "report.md")}`, "--format", `json:${join(folder, "report.json")}`],
      (folder: string, output: string) =>
        opensAsMarkdown(readFileSync(join(folder, "report.md"), "utf8")) && isJsonReport(readFileSync(join(folder, "report.json"), "utf8")) && output === "",
    ],
  ] as const)("[%s] two reports asked for at %s are each there", (_clm, _destinations, ask, areThere) => {
    const folder = temporaryDirectory("report-destinations-");
    const { output, error, streams } = capturedStreams();

    writeReports(outputsAskedFor(ask(folder)), [], reconciliation(), streams, AS_ASKED);

    expect(areThere(folder, output.join(""), error.join(""))).toBe(true);
  });
});

describe("both reports go one after the other to a place that appends", () => {
  it.each([
    ["CLM-FMT-022", "", false],
    ["CLM-FMT-022", ", redirected into a file,", true],
  ] as const)("[%s] two reports asked for on standard error%s are both on standard error, one after the other", (_clm, _redirected, redirect) => {
    const file = join(temporaryDirectory("standard-error-redirected-"), "log.txt");
    const { output, error, streams } = capturedStreams();
    const redirected = openSync(file, "a");
    onTestFinished(() => closeSync(redirected));

    const ending = writeReports(outputsAskedFor(["--format", "md:/dev/stderr", "--format", "json:/dev/stderr"]), [], reconciliation(), { ...streams, error: { ...streams.error, fd: redirect ? redirected : 2 } }, AS_ASKED);

    const onStandardError = error.join("");
    expect({ ending, bothThere: opensAsMarkdown(onStandardError) && isJsonReport(onStandardError.slice(onStandardError.indexOf("\n{") + 1)), output: output.join("") }).toEqual({
      ending: 0,
      bothThere: true,
      output: "",
    });
  });
});

describe("both reports are written to a place that discards what it is given", () => {
  it("[CLM-FMT-035] --format md:/dev/null --format json:/dev/null: both are written, and the run does not stop", () => {
    const { output, error, streams } = capturedStreams();

    const exitCode = writeReports(outputsAskedFor(["--format", "md:/dev/null", "--format", "json:/dev/null"]), [], reconciliation(), streams, AS_ASKED);

    expect({ exitCode, output: output.join(""), error: error.join("") }).toEqual({ exitCode: 0, output: "", error: "" });
  });
});

describe("a place it cannot write will stop the run, and nothing will be written", () => {
  it.each([
    [
      "CLM-FMT-008",
      "a file it may not write",
      "may-not-be-written",
      (folder: string) => {
        writeFileSync(join(folder, "report.md"), "an earlier report");
        chmodSync(join(folder, "report.md"), 0o444);
        return join(folder, "report.md");
      },
      (place: string) => readFileSync(place, "utf8") === "an earlier report",
    ],
    ["CLM-FMT-008", "an empty path", "may-not-be-written", (_folder: string): string => "", (_place: string): boolean => true],
    [
      "CLM-FMT-026",
      "an existing folder",
      "is-a-folder",
      (folder: string) => {
        mkdirSync(join(folder, "reports"));
        return join(folder, "reports");
      },
      (place: string) => statSync(place).isDirectory(),
    ],
    ["CLM-FMT-027", "a file in a folder that doesn't exist", "folder-does-not-exist", (folder: string) => join(folder, "missing", "report.md"), (place: string) => !existsSync(place)],
    [
      "CLM-FMT-034",
      "a link that leads round to itself",
      "leads-round-to-itself",
      (folder: string) => {
        symlinkSync(join(folder, "b"), join(folder, "a"));
        symlinkSync(join(folder, "a"), join(folder, "b"));
        return join(folder, "a");
      },
      (place: string) => readlinkSync(place).endsWith("b"),
    ],
  ] as const)("[%s] a report asked for at %s stops the run with exit 2, names the place and why, and writes nothing", (_clm, _destination, why, place, asItWas) => {
    const folder = temporaryDirectory("unwritable-");
    const { output, error, streams } = capturedStreams();
    const destination = place(folder);

    const ending = writeReports(outputsAskedFor(["--format", `md:${destination}`]), [], reconciliation(), streams, AS_ASKED);

    expect({ ending, complaint: error.join(""), output: output.join(""), asItWas: asItWas(destination) }).toEqual({
      ending: 2,
      complaint: refused("report-not-written", { place: destination, why: textFor(appCatalogue, why) }),
      output: "",
      asItWas: true,
    });
  });
});

describe("the run writes neither report when it cannot write one", () => {
  it.each([
    ["CLM-FMT-009", "no destination", (_folder: string) => [], (_folder: string, output: string) => output === ""],
    [
      "CLM-FMT-028",
      "a file that does not exist",
      (folder: string) => ["--format", `json:${join(folder, "report.json")}`],
      (folder: string) => !existsSync(join(folder, "report.json")),
    ],
    [
      "CLM-FMT-029",
      "a file that already exists",
      (folder: string) => {
        writeFileSync(join(folder, "report.json"), "an earlier report");
        return ["--format", `json:${join(folder, "report.json")}`];
      },
      (folder: string) => readFileSync(join(folder, "report.json"), "utf8") === "an earlier report",
    ],
    [
      "CLM-FMT-030",
      "a link to a file not yet made",
      (folder: string) => {
        symlinkSync(join(folder, "target.json"), join(folder, "link.json"));
        return ["--format", `json:${join(folder, "link.json")}`];
      },
      (folder: string) => !existsSync(join(folder, "target.json")) && readlinkSync(join(folder, "link.json")) === join(folder, "target.json"),
    ],
  ] as const)("[%s] one report at a place it cannot write and the other at %s: the run stops with exit 2, and nothing is written", (_clm, _other, other, asItWas) => {
    const folder = temporaryDirectory("neither-written-");
    const { output, error, streams } = capturedStreams();
    const unwritable = join(folder, "missing", "report.md");
    const args = [...other(folder), "--format", `md:${unwritable}`];
    const outputs = outputsAskedFor(args.length === 2 ? ["--format", "json", ...args] : args);

    const ending = writeReports(outputs, [], reconciliation(), streams, AS_ASKED);

    expect({ ending, complaint: error.join(""), asItWas: asItWas(folder, output.join("")) }).toEqual({
      ending: 2,
      complaint: refused("report-not-written", { place: unwritable, why: textFor(appCatalogue, "folder-does-not-exist") }),
      asItWas: true,
    });
  });
});

describe("two reports will not both go to standard output", () => {
  it.each([
    ["CLM-FMT-005", "no destination", (_folder: string): string => "json"],
    ["CLM-FMT-011", "a path that names standard output", (_folder: string): string => "json:/dev/stdout"],
    [
      "CLM-FMT-023",
      "a link to standard output",
      (folder: string): string => {
        symlinkSync("/dev/stdout", join(folder, "out"));
        return `json:${join(folder, "out")}`;
      },
    ],
  ] as const)("[%s] one report with no destination and the other at %s: the run stops with exit 2, naming both, and nothing is on standard output", (_clm, _other, other) => {
    const folder = temporaryDirectory("both-to-standard-output-");
    const { output, error, streams } = capturedStreams();
    const asked = other(folder);

    const ending = writeReports(outputsAskedFor(["--format", "md", "--format", asked]), [], reconciliation(), streams, AS_ASKED);

    expect({ ending, complaint: error.join(""), output: output.join("") }).toEqual({ ending: 2, complaint: refused("more-than-one-to-stdout", { reports: `md, ${asked}` }), output: "" });
  });
});

describe("two reports will not go in one file", () => {
  it.each([
    ["CLM-FMT-010", "the same path", (file: string): readonly string[] => ["--format", `json:${file}`], (file: string): string => `json:${file}`, false],
    [
      "CLM-FMT-024",
      "a link to it",
      (file: string): readonly string[] => {
        symlinkSync(file, `${file}.link`);
        return ["--format", `json:${file}.link`];
      },
      (file: string): string => `json:${file}.link`,
      false,
    ],
    ["CLM-FMT-025", "standard output, redirected to the file", (_file: string): readonly string[] => ["--format", "json"], (_file: string): string => "json", true],
  ] as const)("[%s] one report at a file and the other at %s: the run stops with exit 2, naming the file and both, and the file is as it was", (_clm, _other, other, otherAsGiven, redirect) => {
    const file = join(temporaryDirectory("one-file-"), "report.md");
    writeFileSync(file, "an earlier report");
    const { error, streams } = capturedStreams();
    const redirected = redirect ? openSync(file, "a") : undefined;
    onTestFinished(() => (redirected === undefined ? undefined : closeSync(redirected)));
    const asked = ["--format", `md:${file}`, ...other(file)];

    const ending = writeReports(outputsAskedFor(asked), [], reconciliation(), redirected === undefined ? streams : { ...streams, output: { ...streams.output, fd: redirected } }, AS_ASKED);

    expect({ ending, complaint: error.join(""), file: readFileSync(file, "utf8") }).toEqual({
      ending: 2,
      complaint: refused("outputs-share-file", { reports: `md:${file}, ${otherAsGiven(file)}` }),
      file: "an earlier report",
    });
  });

  it("[CLM-FMT-010] one report at a file not yet made and the other at the same path: the run stops with exit 2, naming the file and both, and the file is still not made", () => {
    const file = join(temporaryDirectory("one-new-file-"), "report.md");
    const { error, streams } = capturedStreams();

    const ending = writeReports(outputsAskedFor(["--format", `md:${file}`, "--format", `json:${file}`]), [], reconciliation(), streams, AS_ASKED);

    expect({ ending, complaint: error.join(""), made: existsSync(file) }).toEqual({ ending: 2, complaint: refused("outputs-share-file", { reports: `md:${file}, json:${file}` }), made: false });
  });

  it.each([
    ["out", "out", false],
    ["OUT", "OUT", false],
    ["out/2026", "out/2026", false],
    ["Out, its name in capitals and in small letters both leading to it", "Out", true],
    ["Out/2026, the name Out in capitals and in small letters both leading to it", "Out/2026", true],
  ] as const)("[CLM-FMT-010] one report at Report.md and the other at report.md, neither made yet, in %s: on a volume that folds case they are one file and the run stops, and on one that does not each is written", (_folder, under, eitherCase) => {
    const parent = temporaryDirectory("one-new-file-by-case-");
    const folder = join(parent, under);
    mkdirSync(folder, { recursive: true });
    // Where the volume does not fold case, links give Out its other spellings; where it does, they are already its names.
    if (eitherCase) ["OUT", "out"].filter((other) => !existsSync(join(parent, other))).forEach((other) => symlinkSync("Out", join(parent, other)));
    // Whether the volume folds case, as the system answers for a file made and looked up by its other case.
    writeFileSync(join(parent, "probe"), "");
    const foldsCase = eitherCase || existsSync(join(parent, "PROBE"));
    const [upper, lower] = [join(folder, "Report.md"), join(folder, "report.md")];
    const { error, streams } = capturedStreams();

    const ending = writeReports(outputsAskedFor(["--format", `md:${upper}`, "--format", `json:${lower}`]), [], reconciliation(), streams, AS_ASKED);

    expect({ ending, complaint: error.join("") }).toEqual(
      foldsCase ? { ending: 2, complaint: refused("outputs-share-file", { reports: `md:${upper}, json:${lower}` }) } : { ending: 0, complaint: "" },
    );
  });
});

describe("the run writes a report to a file it does not read, even one on the same disk", () => {
  it("[CLM-FMT-033] a report asked for at another file on the same disk as the one the run read is written there", () => {
    const folder = temporaryDirectory("same-device-");
    writeFileSync(join(folder, "results.json"), "test results");
    writeFileSync(join(folder, "report.md"), "an earlier report");
    const { streams } = capturedStreams();

    const ending = writeReports(outputsAskedFor(["--format", `md:${join(folder, "report.md")}`]), [join(folder, "results.json")], reconciliation(), streams, AS_ASKED);

    expect({ ending, written: opensAsMarkdown(readFileSync(join(folder, "report.md"), "utf8")) }).toEqual({ ending: 0, written: true });
  });
});

describe("the run refuses to write a report over a file it reads", () => {
  it("[CLM-FMT-013] a report asked for at the file the run read stops the run with exit 2, naming the file, and the file is as it was", () => {
    const folder = temporaryDirectory("over-an-input-");
    const results = join(folder, "results.json");
    writeFileSync(results, VITEST_REPORT);
    const inputs = inputsReadFor([{ kind: "vitest", path: "results.json", byDefault: false }], folder);
    const { error, streams } = capturedStreams();

    const ending = writeReports(outputsAskedFor(["--format", `md:${results}`]), "filesRead" in inputs ? inputs.filesRead : [], reconciliation(), streams, AS_ASKED);

    expect({ ending, complaint: error.join(""), file: readFileSync(results, "utf8") }).toEqual({ ending: 2, complaint: refused("output-overwrites-input", { file: results }), file: VITEST_REPORT });
  });
});

describe("a report on standard error will not go in a file another report names or the run reads", () => {
  it.each([
    [
      "CLM-FMT-031",
      "a file another report names",
      (file: string): readonly string[] => ["--format", `json:${file}`],
      (_file: string): readonly string[] => [],
      (file: string) => refused("outputs-share-file", { reports: `md:/dev/stderr, json:${file}` }),
    ],
    [
      "CLM-FMT-032",
      "a file the run reads",
      (_file: string): readonly string[] => [],
      (file: string): readonly string[] => [file],
      (file: string) => refused("output-overwrites-input", { file }),
    ],
  ] as const)("[%s] standard error redirected to %s: a report asked for on standard error stops the run with exit 2, naming the file, and no report is written to it", (_clm, _file, others, inputsRead, complaint) => {
    const file = join(temporaryDirectory("standard-error-redirected-"), "results.json");
    writeFileSync(file, "an earlier file");
    const { error, streams } = capturedStreams();
    const redirected = openSync(file, "a");
    onTestFinished(() => closeSync(redirected));

    const ending = writeReports(outputsAskedFor(["--format", "md:/dev/stderr", ...others(file)]), inputsRead(file), reconciliation(), { ...streams, error: { ...streams.error, fd: redirected } }, AS_ASKED);

    // Standard error is the file, so what reached the stream reached the file.
    expect({ ending, inTheFile: error.join("") + readFileSync(file, "utf8") }).toEqual({ ending: 2, inTheFile: `${complaint(file)}an earlier file` });
  });
});

// What the run writes on one of its own standard streams while the test runs, kept from the test's own output.
function writtenOn(stream: NodeJS.WriteStream): string[] {
  const written: string[] = [];
  const spy = vi.spyOn(stream, "write").mockImplementation((text: string | Uint8Array) => written.push(String(text)) > 0);
  onTestFinished(() => spy.mockRestore());
  return written;
}

describe("a report and a refusal will be on the run's own standard streams", () => {
  it("[CLM-FMT-016] a report asked for at no destination is on the run's standard output", () => {
    const output = writtenOn(process.stdout);

    writeReports(outputsAskedFor([]), [], reconciliation(), processStreams, AS_ASKED);

    expect(opensAsMarkdown(output.join(""))).toBe(true);
  });

  it("[CLM-FMT-027] a report asked for at a file in a folder that doesn't exist stops the run with exit 2, naming the place and why on the run's standard error", () => {
    const place = join(temporaryDirectory("own-standard-error-"), "missing", "report.md");
    const error = writtenOn(process.stderr);

    const ending = writeReports(outputsAskedFor(["--format", `md:${place}`]), [], reconciliation(), processStreams, AS_ASKED);

    expect({ ending, complaint: error.join("") }).toEqual({ ending: 2, complaint: refused("report-not-written", { place, why: textFor(appCatalogue, "folder-does-not-exist") }) });
  });
});
