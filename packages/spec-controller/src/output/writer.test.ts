import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readlinkSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import { runRequestOf } from "../runRequest/runRequest.js";
import { writeReports, type ReportedReconciliation } from "./writer.js";

// A run with nothing reconciled, its totals all zero.
const RECONCILIATION: ReportedReconciliation = {
  claimReconciliations: [],
  runVerdict: { verdict: "balanced" },
  totals: { claimReconciliations: { total: 0, balanced: 0, outOfBalance: 0 }, qualityCheckReconciliations: { byKind: [{ kind: "unit", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, { kind: "integration", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, { kind: "e2e", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, { kind: "performance", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, { kind: "fitness", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }], noKind: { evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, all: { evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } } }, evidenceObservations: { total: 0, onExecutableClaim: 0, onPhantomClaim: 0, onUnnamedClaim: 0 }, excludedClaimCodeOccurrences: 0 },
  provenance: { target: "acme/web", sourceSha: "abc1234", toolVersion: "0.1.256", runTime: "2026-11-12T07:08:14Z", inputs: [] },
};

// Standard output and standard error as the test's own descriptors, each writing into a list the test reads.
function capturedStreams(): { readonly output: string[]; readonly error: string[]; readonly streams: Parameters<typeof writeReports>[3] } {
  const output: string[] = [];
  const error: string[] = [];
  return { output, error, streams: { output: { fd: 1, write: (text) => output.push(text) }, error: { fd: 2, write: (text) => error.push(text) } } };
}

const MARKDOWN_OPENING = "Every claim has the evidence it asks for, so the run is balanced and nothing needs your attention.";

const opensAsMarkdown = (text: string): boolean => text.startsWith(`# Evidence Reconciliation\n\n${MARKDOWN_OPENING}`);

// Text that is not JSON is not the JSON report, rather than an error.
function isJsonReport(text: string): boolean {
  try {
    return "runVerdict" in JSON.parse(text);
  } catch {
    return false;
  }
}

// How a run that writes reports ends: its exit code, or what it threw when it did not end cleanly.
function endingOf(write: () => number): unknown {
  try {
    return write();
  } catch (thrown) {
    return thrown instanceof Error ? thrown.message : thrown;
  }
}

const outputsAskedFor = (args: readonly string[]) => {
  const request = runRequestOf(["balance", ...args]);
  return "command" in request && request.command === "balance" ? request.outputs : [];
};

describe("you will get the report format you named", () => {
  it.each([
    ["CLM-FMT-001", "no format", "Markdown", []],
    ["CLM-FMT-014", "md", "Markdown", ["--format", "md"]],
    ["CLM-FMT-015", "json", "JSON", ["--format", "json"]],
  ] as const)("[%s] asking for %s gives the %s report", (_clm, _format, report, args) => {
    const { output, streams } = capturedStreams();

    writeReports(outputsAskedFor(args), [], RECONCILIATION, streams);

    const written = output.join("");
    expect(report === "JSON" ? JSON.parse(written) : written.split("\n")[2]).toEqual(
      report === "JSON" ? RECONCILIATION : "Every claim has the evidence it asks for, so the run is balanced and nothing needs your attention.",
    );
  });
});

describe("a report will be where you asked", () => {
  it.each([
    ["CLM-FMT-016", "no destination", (_folder: string) => [], (_folder: string, output: string) => opensAsMarkdown(output)],
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

    writeReports(outputsAskedFor(args), inputsRead, RECONCILIATION, streams);

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
    [
      "CLM-FMT-021",
      "two different files of one name, in two folders",
      (folder: string) => {
        mkdirSync(join(folder, "a"));
        mkdirSync(join(folder, "b"));
        return ["--format", `md:${join(folder, "a", "report")}`, "--format", `json:${join(folder, "b", "report")}`];
      },
      (folder: string, output: string) =>
        opensAsMarkdown(readFileSync(join(folder, "a", "report"), "utf8")) && isJsonReport(readFileSync(join(folder, "b", "report"), "utf8")) && output === "",
    ],
    [
      "CLM-FMT-022",
      "standard error for both",
      (_folder: string) => ["--format", "md:/dev/stderr", "--format", "json:/dev/stderr"],
      (_folder: string, output: string, error: string) => opensAsMarkdown(error) && isJsonReport(error.slice(error.indexOf("\n{") + 1)) && output === "",
    ],
  ] as const)("[%s] two reports asked for at %s are each there", (_clm, _destinations, ask, areThere) => {
    const folder = temporaryDirectory("report-destinations-");
    const { output, error, streams } = capturedStreams();

    writeReports(outputsAskedFor(ask(folder)), [], RECONCILIATION, streams);

    expect(areThere(folder, output.join(""), error.join(""))).toBe(true);
  });
});

describe("a place it cannot write will stop the run, and nothing will be written", () => {
  it.each([
    [
      "CLM-FMT-008",
      "a file it may not write",
      "may not be written",
      (folder: string) => {
        writeFileSync(join(folder, "report.md"), "an earlier report");
        chmodSync(join(folder, "report.md"), 0o444);
        return join(folder, "report.md");
      },
      (place: string) => readFileSync(place, "utf8") === "an earlier report",
    ],
    [
      "CLM-FMT-008",
      "a file in a folder it may not enter",
      "may not be written",
      (folder: string) => {
        mkdirSync(join(folder, "locked"));
        chmodSync(join(folder, "locked"), 0o000);
        return join(folder, "locked", "report.md");
      },
      (place: string) => {
        chmodSync(dirname(place), 0o755);
        return !existsSync(place);
      },
    ],
    [
      "CLM-FMT-026",
      "an existing folder",
      "is a folder",
      (folder: string) => {
        mkdirSync(join(folder, "reports"));
        return join(folder, "reports");
      },
      (place: string) => statSync(place).isDirectory(),
    ],
    ["CLM-FMT-027", "a file in a folder that doesn't exist", "folder does not exist", (folder: string) => join(folder, "missing", "report.md"), (place: string) => !existsSync(place)],
    [
      "CLM-FMT-034",
      "a link that leads round to itself",
      "leads round to itself",
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

    const ending = endingOf(() => writeReports(outputsAskedFor(["--format", `md:${destination}`]), [], RECONCILIATION, streams));

    expect({ ending, complaint: error.join("").includes(destination) && error.join("").includes(why), output: output.join(""), asItWas: asItWas(destination) }).toEqual({
      ending: 2,
      complaint: true,
      output: "",
      asItWas: true,
    });
  });
});

describe("if one report cannot be written, neither will be", () => {
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

    const ending = endingOf(() => writeReports(outputs, [], RECONCILIATION, streams));

    expect({ ending, complaint: error.join("").includes(unwritable), asItWas: asItWas(folder, output.join("")) }).toEqual({ ending: 2, complaint: true, asItWas: true });
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

    const ending = endingOf(() => writeReports(outputsAskedFor(["--format", "md", "--format", asked]), [], RECONCILIATION, streams));

    expect({ ending, complaint: error.join("").includes("md") && error.join("").includes(asked), output: output.join("") }).toEqual({ ending: 2, complaint: true, output: "" });
  });
});

describe("two reports will not go in one file", () => {
  it.each([
    ["CLM-FMT-010", "the same path", (file: string): readonly string[] => ["--format", `json:${file}`]],
    [
      "CLM-FMT-024",
      "a link to it",
      (file: string): readonly string[] => {
        symlinkSync(file, `${file}.link`);
        return ["--format", `json:${file}.link`];
      },
    ],
    ["CLM-FMT-025", "standard output, redirected to the file", (_file: string): readonly string[] => ["--format", "json"]],
  ] as const)("[%s] one report at a file and the other at %s: the run stops with exit 2, naming the file and both, and the file is as it was", (clm, _other, other) => {
    const file = join(temporaryDirectory("one-file-"), "report.md");
    writeFileSync(file, "an earlier report");
    const { error, streams } = capturedStreams();
    const redirected = clm === "CLM-FMT-025" ? openSync(file, "a") : undefined;
    onTestFinished(() => (redirected === undefined ? undefined : closeSync(redirected)));
    const asked = ["--format", `md:${file}`, ...other(file)];

    const ending = endingOf(() =>
      writeReports(outputsAskedFor(asked), [], RECONCILIATION, redirected === undefined ? streams : { ...streams, output: { ...streams.output, fd: redirected } }),
    );

    expect({ ending, complaint: error.join("").includes(file) && error.join("").includes("md") && error.join("").includes("json"), file: readFileSync(file, "utf8") }).toEqual({
      ending: 2,
      complaint: true,
      file: "an earlier report",
    });
  });

  it("[CLM-FMT-010] one report at a file not yet made and the other at the same path: the run stops with exit 2, naming the file and both, and the file is still not made", () => {
    const file = join(temporaryDirectory("one-new-file-"), "report.md");
    const { error, streams } = capturedStreams();

    const ending = endingOf(() => writeReports(outputsAskedFor(["--format", `md:${file}`, "--format", `json:${file}`]), [], RECONCILIATION, streams));

    expect({ ending, complaint: error.join("").includes(file), made: existsSync(file) }).toEqual({ ending: 2, complaint: true, made: false });
  });
});

describe("a report will be written to a file the run does not read, even on the same device", () => {
  it("[CLM-FMT-033] a report asked for at another file on the same device as the one the run read is written there", () => {
    const folder = temporaryDirectory("same-device-");
    writeFileSync(join(folder, "results.json"), "test results");
    writeFileSync(join(folder, "report.md"), "an earlier report");
    const { streams } = capturedStreams();

    const ending = endingOf(() => writeReports(outputsAskedFor(["--format", `md:${join(folder, "report.md")}`]), [join(folder, "results.json")], RECONCILIATION, streams));

    expect({ ending, written: opensAsMarkdown(readFileSync(join(folder, "report.md"), "utf8")) }).toEqual({ ending: 0, written: true });
  });
});

describe("a report will not be written over a file the run reads", () => {
  it("[CLM-FMT-013] a report asked for at the file the run read stops the run with exit 2, naming the file, and the file is as it was", () => {
    const results = join(temporaryDirectory("over-an-input-"), "results.json");
    writeFileSync(results, "test results");
    const { error, streams } = capturedStreams();

    const ending = endingOf(() => writeReports(outputsAskedFor(["--format", `md:${results}`]), [results], RECONCILIATION, streams));

    expect({ ending, complaint: error.join("").includes(results), file: readFileSync(results, "utf8") }).toEqual({ ending: 2, complaint: true, file: "test results" });
  });
});

describe("a report on standard error will not go in a file another report names or the run reads", () => {
  it.each([
    ["CLM-FMT-031", "a file another report names", (file: string): readonly string[] => ["--format", `json:${file}`], (_file: string): readonly string[] => []],
    ["CLM-FMT-032", "a file the run reads", (_file: string): readonly string[] => [], (file: string): readonly string[] => [file]],
  ] as const)("[%s] standard error redirected to %s: a report asked for on standard error stops the run with exit 2, naming the file, and no report is written to it", (_clm, _file, others, inputsRead) => {
    const file = join(temporaryDirectory("standard-error-redirected-"), "results.json");
    writeFileSync(file, "an earlier file");
    const { error, streams } = capturedStreams();
    const redirected = openSync(file, "a");
    onTestFinished(() => closeSync(redirected));

    const ending = endingOf(() =>
      writeReports(outputsAskedFor(["--format", "md:/dev/stderr", ...others(file)]), inputsRead(file), RECONCILIATION, { ...streams, error: { ...streams.error, fd: redirected } }),
    );

    // Standard error is the file, so what reached the stream reached the file.
    const inTheFile = error.join("") + readFileSync(file, "utf8");
    expect({ ending, complaint: inTheFile.includes(file), report: inTheFile.includes(MARKDOWN_OPENING) || inTheFile.includes('"runVerdict"') }).toEqual({
      ending: 2,
      complaint: true,
      report: false,
    });
  });
});
