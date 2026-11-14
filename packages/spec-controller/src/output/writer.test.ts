import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readlinkSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { textFor, type EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { temporaryDirectory } from "../temporaryDirectory.test-utils.js";
import appCatalogue from "../messages/messages.en.json" with { type: "json" };
import { refusalText } from "../runEnding/refusal.js";
import { runRequestOf } from "../runRequest/runRequest.js";
import runRequestVariants from "../runRequest/runRequest.variants.json" with { type: "json" };
import identityVariants from "./identity.variants.json" with { type: "json" };
import { processStreams } from "./streams.js";
import type { Unwritable } from "./writable.js";
import writableVariants from "./writable.variants.json" with { type: "json" };
import { writeReports } from "./writer.js";

// A run with nothing reconciled, its totals all zero.
const RECONCILIATION: EvidenceReconciliation = {
  claimReconciliations: [],
  runVerdict: { verdict: "balanced" },
  totals: { claimReconciliations: { total: 0, balanced: 0, outOfBalance: 0 }, qualityCheckReconciliations: { byKind: [{ kind: "unit", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, { kind: "integration", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, { kind: "e2e", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, { kind: "performance", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, { kind: "fitness", evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }], noKind: { evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } }, all: { evidenceObligations: 0, evidenceObservations: 0, byOutcome: { satisfied: 0, failing: 0, "cannot-fail": 0, missing: 0, "no-claim-code": 0, "duplicate-claim-code": 0, "not-asked-for": 0, "cites-unknown-claim": 0, "cites-no-claim": 0, "never-ran": 0, "no-quality-check": 0 } } }, evidenceObservations: { total: 0, onExecutableClaim: 0, onPhantomClaim: 0, onUnnamedClaim: 0 }, outOfBalanceByFeature: [], excludedClaimCodeOccurrences: 0 },
  stepAccount: { jobs: [], total: { stepsRead: 0, runners: 0, reconcilerSteps: 0, nonChecks: 0, plumbing: 0, fitnessFunctions: 0 } },
  errorsInTheInputs: { claimCodeErrors: [], configurationErrors: [] },
  runIntegrity: { neverRan: [] },
  provenance: { target: "acme/web", sourceSha: "abc1234", toolVersion: "0.1.256", runTime: "2026-11-12T07:08:14Z", inputs: [] },
};

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

// The last of forty links in a chain to a place, as many as the system follows: link-40 to link-39, … link-1 to the place.
function chainOfLinksTo(place: string, folder: string): string {
  symlinkSync(place, join(folder, "link-1"));
  Array.from({ length: 39 }, (_, at) => at + 2).forEach((link) => symlinkSync(join(folder, `link-${link - 1}`), join(folder, `link-${link}`)));
  return join(folder, "link-40");
}

const outputsAskedFor = (args: readonly string[]) => {
  const request = runRequestOf(["balance", ...args]);
  return "command" in request && request.command === "balance" ? request.outputs : [];
};

// The arguments that ask for the Markdown report each way.
const MARKDOWN_ASKED: Readonly<Record<string, readonly string[]>> = { "no format": [], md: ["--format", "md"] };

// What the one report a run writes with these arguments puts on standard output.
function reportOnStandardOutput(args: readonly string[]): string {
  const { output, streams } = capturedStreams();
  writeReports(outputsAskedFor(args), [], RECONCILIATION, streams, AS_ASKED);
  return output.join("");
}

describe("you will get the format you name, or Markdown when you name none", () => {
  it.each(runRequestVariants["CLM-FMT-001"].variants)("[CLM-FMT-001] a run had its report to write: when you ask for %s, you will get the Markdown report", (format) => {
    expect(opensAsMarkdown(reportOnStandardOutput(MARKDOWN_ASKED[format]!))).toBe(true);
  });

  it("[CLM-FMT-015] a run had its report to write: when you ask for json, you will get the JSON report", () => {
    expect(JSON.parse(reportOnStandardOutput(["--format", "json"]))).toEqual(RECONCILIATION);
  });
});

// The name of the file each path asks for.
const FILE_NAMED: Readonly<Record<string, string>> = { "any path": "report.md", "one whose name contains a colon": "a:b.md" };

describe("a report will go where you ask, or to standard output when you name no place", () => {
  it.each(runRequestVariants["CLM-FMT-003"].variants)(
    "[CLM-FMT-003] a run had a report to write: when you ask for it at a file named by %s, it will be in that file, and nothing will be on standard output",
    (path) => {
      const file = join(temporaryDirectory("report-file-"), FILE_NAMED[path]!);
      const { output, streams } = capturedStreams();

      writeReports(outputsAskedFor(["--format", `md:${file}`]), [], RECONCILIATION, streams, AS_ASKED);

      expect({ inTheFile: opensAsMarkdown(readFileSync(file, "utf8")), output: output.join("") }).toEqual({ inTheFile: true, output: "" });
    },
  );

  it.each([
    [
      "CLM-FMT-018",
      "a file that already exists",
      "the file will contain the new report",
      (folder: string) => {
        writeFileSync(join(folder, "report.md"), "an earlier report");
        return ["--format", `md:${join(folder, "report.md")}`];
      },
      (folder: string) => opensAsMarkdown(readFileSync(join(folder, "report.md"), "utf8")),
    ],
    [
      "CLM-FMT-012",
      "a link to a file that does not exist yet",
      "it will be in the file the link points to, and the link will still point there",
      (folder: string) => {
        symlinkSync(join(folder, "target.md"), join(folder, "link.md"));
        return ["--format", `md:${join(folder, "link.md")}`];
      },
      (folder: string) => opensAsMarkdown(readFileSync(join(folder, "target.md"), "utf8")) && readlinkSync(join(folder, "link.md")) === join(folder, "target.md"),
    ],
    [
      "CLM-FMT-019",
      "a file in the corpus folder that is not a feature file",
      "the file will contain the new report, and the feature files will be as they were",
      (folder: string) => {
        mkdirSync(join(folder, "features"));
        writeFileSync(join(folder, "features", "one.feature"), "Feature: one\n");
        return ["--format", `md:${join(folder, "features", "report.md")}`];
      },
      (folder: string) =>
        opensAsMarkdown(readFileSync(join(folder, "features", "report.md"), "utf8")) && readFileSync(join(folder, "features", "one.feature"), "utf8") === "Feature: one\n",
    ],
  ] as const)("[%s] a run had a report to write: when you ask for it at %s, %s", (_clm, _destination, _whereItWillBe, ask, isThere) => {
    const folder = temporaryDirectory("report-destination-");
    const { streams } = capturedStreams();
    const args = ask(folder);
    const inputsRead = existsSync(join(folder, "features")) ? [join(folder, "features", "one.feature")] : [];

    writeReports(outputsAskedFor(args), inputsRead, RECONCILIATION, streams, AS_ASKED);

    expect(isThere(folder)).toBe(true);
  });
});

describe("each of two reports will be where you asked", () => {
  it.each([
    [
      "CLM-FMT-004",
      "no destination for one, a file for the other",
      "one will be on standard output, and the other in the file",
      (folder: string) => ["--format", "md", "--format", `json:${join(folder, "report.json")}`],
      (folder: string, output: string, error: string) => opensAsMarkdown(output) && isJsonReport(readFileSync(join(folder, "report.json"), "utf8")) && error === "",
    ],
    [
      "CLM-FMT-020",
      "no destination for one, standard error for the other",
      "one will be on standard output, and the other on standard error",
      (_folder: string) => ["--format", "md", "--format", "json:/dev/stderr"],
      (_folder: string, output: string, error: string) => opensAsMarkdown(output) && isJsonReport(error),
    ],
    [
      "CLM-FMT-020",
      "no destination for one, standard error by its descriptor for the other",
      "one will be on standard output, and the other on standard error",
      (_folder: string) => ["--format", "md", "--format", "json:/dev/fd/2"],
      (_folder: string, output: string, error: string) => opensAsMarkdown(output) && isJsonReport(error),
    ],
    [
      "CLM-FMT-020",
      "no destination for one, standard error by the process's descriptor for the other",
      "one will be on standard output, and the other on standard error",
      (_folder: string) => ["--format", "md", "--format", "json:/proc/self/fd/2"],
      (_folder: string, output: string, error: string) => opensAsMarkdown(output) && isJsonReport(error),
    ],
    [
      "CLM-FMT-020",
      "no destination for one, standard error by the last of forty links in a chain to it for the other",
      "one will be on standard output, and the other on standard error",
      (folder: string) => ["--format", "md", "--format", `json:${chainOfLinksTo("/dev/stderr", folder)}`],
      (_folder: string, output: string, error: string) => opensAsMarkdown(output) && isJsonReport(error),
    ],
    [
      "CLM-FMT-021",
      "two different files",
      "each file will contain its own report",
      (folder: string) => ["--format", `md:${join(folder, "report.md")}`, "--format", `json:${join(folder, "report.json")}`],
      (folder: string, output: string) =>
        opensAsMarkdown(readFileSync(join(folder, "report.md"), "utf8")) && isJsonReport(readFileSync(join(folder, "report.json"), "utf8")) && output === "",
    ],
    [
      "CLM-FMT-021",
      "two different files of one name, in two folders",
      "each file will contain its own report",
      (folder: string) => {
        mkdirSync(join(folder, "a"));
        mkdirSync(join(folder, "b"));
        return ["--format", `md:${join(folder, "a", "report")}`, "--format", `json:${join(folder, "b", "report")}`];
      },
      (folder: string, output: string) =>
        opensAsMarkdown(readFileSync(join(folder, "a", "report"), "utf8")) && isJsonReport(readFileSync(join(folder, "b", "report"), "utf8")) && output === "",
    ],
  ] as const)("[%s] a run had two reports to write: when you ask for them at %s, %s", (_clm, _destinations, _whereTheyWillBe, ask, areThere) => {
    const folder = temporaryDirectory("report-destinations-");
    const { output, error, streams } = capturedStreams();

    writeReports(outputsAskedFor(ask(folder)), [], RECONCILIATION, streams, AS_ASKED);

    expect(areThere(folder, output.join(""), error.join(""))).toBe(true);
  });
});

// Both reports on standard error: the Markdown first, then the JSON.
const bothOneAfterTheOther = (onStandardError: string): boolean => opensAsMarkdown(onStandardError) && isJsonReport(onStandardError.slice(onStandardError.indexOf("\n{") + 1));

// The second report each way of naming standard output, by what it is: a format alone, a path, or a link.
const SECOND_ON_STANDARD_OUTPUT: Readonly<Record<string, readonly (readonly [string, (folder: string) => string])[]>> = {
  "no destination": [["json", () => "json"]],
  "a path that names standard output": [
    ["/dev/stdout", () => "json:/dev/stdout"],
    ["its descriptor", () => "json:/dev/fd/1"],
    ["the process's descriptor", () => "json:/proc/self/fd/1"],
  ],
  "a link to standard output": [
    [
      "one link",
      (folder) => {
        symlinkSync("/dev/stdout", join(folder, "out"));
        return `json:${join(folder, "out")}`;
      },
    ],
    ["the last of forty links in a chain", (folder) => `json:${chainOfLinksTo("/dev/stdout", folder)}`],
  ],
};

// The reports each way of naming one file asks for, and which of the run's streams, if either, is redirected into it.
interface OneFileTwice {
  readonly asked: readonly string[];
  readonly redirected?: "output" | "error";
}

const ONE_FILE_TWICE: Readonly<Record<string, (file: string) => OneFileTwice>> = {
  "the same path": (file) => ({ asked: [`md:${file}`, `json:${file}`] }),
  "a link to it": (file) => {
    symlinkSync(file, `${file}.link`);
    return { asked: [`md:${file}`, `json:${file}.link`] };
  },
  "standard output redirected to it": (file) => ({ asked: [`md:${file}`, "json"], redirected: "output" }),
  "standard error redirected to it": (file) => ({ asked: ["md:/dev/stderr", `json:${file}`], redirected: "error" }),
  "on a volume that folds case, the same name in another case": (file) => ({ asked: [`md:${file}`, `json:${join(dirname(file), basename(file).toUpperCase())}`] }),
};

describe("two reports share a place only when it is standard error or a place that discards them", () => {
  it("[CLM-FMT-022] a run had two reports to write: when you ask for both on standard error, both reports will be on standard error, one after the other", () => {
    const { output, error, streams } = capturedStreams();

    writeReports(outputsAskedFor(["--format", "md:/dev/stderr", "--format", "json:/dev/stderr"]), [], RECONCILIATION, streams, AS_ASKED);

    expect({ bothThere: bothOneAfterTheOther(error.join("")), output: output.join("") }).toEqual({ bothThere: true, output: "" });
  });

  it("[CLM-FMT-022] a run had two reports to write: when you ask for both on standard error, redirected into a file, both reports will be on standard error, one after the other", () => {
    const file = join(temporaryDirectory("standard-error-redirected-"), "log.txt");
    const { output, error, streams } = capturedStreams();
    const redirected = openSync(file, "a");
    onTestFinished(() => closeSync(redirected));

    const ending = endingOf(() =>
      writeReports(outputsAskedFor(["--format", "md:/dev/stderr", "--format", "json:/dev/stderr"]), [], RECONCILIATION, { ...streams, error: { ...streams.error, fd: redirected } }, AS_ASKED),
    );

    expect({ ending, bothThere: bothOneAfterTheOther(error.join("")), output: output.join("") }).toEqual({ ending: 0, bothThere: true, output: "" });
  });

  it("[CLM-FMT-035] a run had two reports to write: when you ask for both at /dev/null, both will be written, and the run will not stop", () => {
    const { output, error, streams } = capturedStreams();

    const exitCode = writeReports(outputsAskedFor(["--format", "md:/dev/null", "--format", "json:/dev/null"]), [], RECONCILIATION, streams, AS_ASKED);

    expect({ exitCode, output: output.join(""), error: error.join("") }).toEqual({ exitCode: 0, output: "", error: "" });
  });

  it.each(identityVariants["CLM-FMT-005"].variants)(
    "[CLM-FMT-005] a run had two reports to write: when you ask for one with no destination and the other at %s, the run will stop, give no verdict and exit 2, complain naming what each report asked for, and nothing will be on standard output",
    (variant) => {
      const eachWay = SECOND_ON_STANDARD_OUTPUT[variant]!.map(([named, second]) => {
        const { output, error, streams } = capturedStreams();
        const asked = second(temporaryDirectory("both-to-standard-output-"));

        const ending = endingOf(() => writeReports(outputsAskedFor(["--format", "md", "--format", asked]), [], RECONCILIATION, streams, AS_ASKED));

        return {
          ended: { named, ending, complaint: error.join(""), output: output.join("") },
          stopped: { named, ending: 2, complaint: refused("more-than-one-to-stdout", { reports: `md, ${asked}` }), output: "" },
        };
      });

      expect(eachWay.map(({ ended }) => ended)).toEqual(eachWay.map(({ stopped }) => stopped));
    },
  );

  it.for(identityVariants["CLM-FMT-010"].variants)(
    "[CLM-FMT-010] a run had two reports to write: when you ask for them at a file and at %s, the run will stop, give no verdict and exit 2, complain naming the file and both reports, and the file will be as it was",
    (variant, { skip }) => {
      const file = join(temporaryDirectory("one-file-"), "report.md");
      writeFileSync(file, "an earlier report");
      const { asked, redirected } = ONE_FILE_TWICE[variant]!(file);
      skip(variant.includes("folds case") && !existsSync(join(dirname(file), "REPORT.MD")), "this volume does not fold case");
      const { error, streams } = capturedStreams();
      const into = redirected === undefined ? undefined : openSync(file, "a");
      onTestFinished(() => (into === undefined ? undefined : closeSync(into)));
      const streamsAsRedirected = into === undefined || redirected === undefined ? streams : { ...streams, [redirected]: { ...streams[redirected], fd: into } };

      const ending = endingOf(() => writeReports(outputsAskedFor(asked.flatMap((one) => ["--format", one])), [], RECONCILIATION, streamsAsRedirected, AS_ASKED));

      // The complaint goes to the list the test reads, so the file shows whether a report was written in it.
      expect({ ending, complaint: error.join(""), file: readFileSync(file, "utf8") }).toEqual({
        ending: 2,
        complaint: refused("outputs-share-file", { reports: asked.join(", ") }),
        file: "an earlier report",
      });
    },
  );

  it("[CLM-FMT-010] a run had two reports to write: when you ask for them at a file not yet made and at the same path, the run will stop, give no verdict and exit 2, complain naming the file and both reports, and the file will still not be made", () => {
    const file = join(temporaryDirectory("one-new-file-"), "report.md");
    const { error, streams } = capturedStreams();

    const ending = endingOf(() => writeReports(outputsAskedFor(["--format", `md:${file}`, "--format", `json:${file}`]), [], RECONCILIATION, streams, AS_ASKED));

    expect({ ending, complaint: error.join(""), made: existsSync(file) }).toEqual({ ending: 2, complaint: refused("outputs-share-file", { reports: `md:${file}, json:${file}` }), made: false });
  });
});

// Each way to ask for a place the run cannot write: what it is, why the run cannot write there, the place, and whether it is as it was.
type CannotWrite = readonly [string, Unwritable, (folder: string) => string, (place: string) => boolean];

const CANNOT_WRITE: Readonly<Record<string, readonly CannotWrite[]>> = {
  "a file it may not write": [
    [
      "a read-only file",
      "may-not-be-written",
      (folder) => {
        writeFileSync(join(folder, "report.md"), "an earlier report");
        chmodSync(join(folder, "report.md"), 0o444);
        return join(folder, "report.md");
      },
      (place) => readFileSync(place, "utf8") === "an earlier report",
    ],
    [
      "a file in a folder it may not enter",
      "may-not-be-written",
      (folder) => {
        mkdirSync(join(folder, "locked"));
        chmodSync(join(folder, "locked"), 0o000);
        return join(folder, "locked", "report.md");
      },
      (place) => {
        chmodSync(dirname(place), 0o755);
        return !existsSync(place);
      },
    ],
    [
      "a new file in a folder it may not write",
      "may-not-be-written",
      (folder) => {
        mkdirSync(join(folder, "read-only"));
        chmodSync(join(folder, "read-only"), 0o555);
        return join(folder, "read-only", "report.md");
      },
      (place) => !existsSync(place),
    ],
  ],
  "an existing folder": [
    [
      "a folder",
      "is-a-folder",
      (folder) => {
        mkdirSync(join(folder, "reports"));
        return join(folder, "reports");
      },
      (place) => statSync(place).isDirectory(),
    ],
  ],
  "a file in a folder that does not exist": [["a missing folder", "folder-does-not-exist", (folder) => join(folder, "missing", "report.md"), (place) => !existsSync(place)]],
  "a link that leads round to itself": [
    [
      "two links to each other",
      "leads-round-to-itself",
      (folder) => {
        symlinkSync(join(folder, "b"), join(folder, "a"));
        symlinkSync(join(folder, "a"), join(folder, "b"));
        return join(folder, "a");
      },
      (place) => readlinkSync(place).endsWith("b"),
    ],
  ],
};

describe("it stops before it damages anything", () => {
  it.each(writableVariants["CLM-FMT-008"].variants)(
    "[CLM-FMT-008] a run had its report to write: when you ask for it in %s, the run will stop, give no verdict and exit 2, complain naming the place and why it cannot write there, and nothing will be written",
    (variant) => {
      const eachWay = CANNOT_WRITE[variant]!.map(([way, why, place, asItWas]) => {
        const { output, error, streams } = capturedStreams();
        const destination = place(temporaryDirectory("unwritable-"));

        const ending = endingOf(() => writeReports(outputsAskedFor(["--format", `md:${destination}`]), [], RECONCILIATION, streams, AS_ASKED));

        return {
          ended: { way, ending, complaint: error.join(""), output: output.join(""), asItWas: asItWas(destination) },
          stopped: { way, ending: 2, complaint: refused("report-not-written", { place: destination, why: textFor(appCatalogue, why) }), output: "", asItWas: true },
        };
      });

      expect(eachWay.map(({ ended }) => ended)).toEqual(eachWay.map(({ stopped }) => stopped));
    },
  );

  it.each([
    ["CLM-FMT-009", "no destination", "nothing will be on standard output", (_folder: string) => [], (_folder: string, output: string) => output === ""],
    [
      "CLM-FMT-028",
      "a file that does not exist",
      "the file will still not exist",
      (folder: string) => ["--format", `json:${join(folder, "report.json")}`],
      (folder: string) => !existsSync(join(folder, "report.json")),
    ],
    [
      "CLM-FMT-029",
      "a file that already exists",
      "the file will be as it was",
      (folder: string) => {
        writeFileSync(join(folder, "report.json"), "an earlier report");
        return ["--format", `json:${join(folder, "report.json")}`];
      },
      (folder: string) => readFileSync(join(folder, "report.json"), "utf8") === "an earlier report",
    ],
    [
      "CLM-FMT-030",
      "a link to a file not yet made",
      "the file will still not exist, and the link will still point there",
      (folder: string) => {
        symlinkSync(join(folder, "target.json"), join(folder, "link.json"));
        return ["--format", `json:${join(folder, "link.json")}`];
      },
      (folder: string) => !existsSync(join(folder, "target.json")) && readlinkSync(join(folder, "link.json")) === join(folder, "target.json"),
    ],
  ] as const)(
    "[%s] a run had two reports to write: when you ask for one at a place it cannot write, and the other at %s, the run will stop, give no verdict and exit 2, complain naming the place and why it cannot write there, and %s",
    (_clm, _other, _whatStays, other, asItWas) => {
      const folder = temporaryDirectory("neither-written-");
      const { output, error, streams } = capturedStreams();
      const unwritable = join(folder, "missing", "report.md");
      const args = [...other(folder), "--format", `md:${unwritable}`];
      const outputs = outputsAskedFor(args.length === 2 ? ["--format", "json", ...args] : args);

      const ending = endingOf(() => writeReports(outputs, [], RECONCILIATION, streams, AS_ASKED));

      expect({ ending, complaint: error.join(""), asItWas: asItWas(folder, output.join("")) }).toEqual({
        ending: 2,
        complaint: refused("report-not-written", { place: unwritable, why: textFor(appCatalogue, "folder-does-not-exist") }),
        asItWas: true,
      });
    },
  );

  it("[CLM-FMT-033] the run read one file: when you ask for the report to go in another file on the same disk, the report will be written there", () => {
    const folder = temporaryDirectory("same-disk-");
    writeFileSync(join(folder, "results.json"), "test results");
    writeFileSync(join(folder, "report.md"), "an earlier report");
    const { streams } = capturedStreams();

    const ending = endingOf(() => writeReports(outputsAskedFor(["--format", `md:${join(folder, "report.md")}`]), [join(folder, "results.json")], RECONCILIATION, streams, AS_ASKED));

    expect({ ending, written: opensAsMarkdown(readFileSync(join(folder, "report.md"), "utf8")) }).toEqual({ ending: 0, written: true });
  });

  it("[CLM-FMT-013] the run read a file, such as your test results: when you ask for the report to go in that same file, the run will stop, give no verdict and exit 2, complain naming the file, and the file will be as it was", () => {
    const results = join(temporaryDirectory("over-an-input-"), "results.json");
    writeFileSync(results, "test results");
    const { error, streams } = capturedStreams();

    const ending = endingOf(() => writeReports(outputsAskedFor(["--format", `md:${results}`]), [results], RECONCILIATION, streams, AS_ASKED));

    expect({ ending, complaint: error.join(""), file: readFileSync(results, "utf8") }).toEqual({ ending: 2, complaint: refused("output-overwrites-input", { file: results }), file: "test results" });
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
  it("[CLM-FMT-016] a run had a report to write: when you ask for it at no destination, it will be on the run's standard output", () => {
    const output = writtenOn(process.stdout);

    writeReports(outputsAskedFor([]), [], RECONCILIATION, processStreams, AS_ASKED);

    expect(opensAsMarkdown(output.join(""))).toBe(true);
  });

  it("[CLM-FMT-008] a run had its report to write: when you ask for it in a file in a folder that does not exist, the run will stop and exit 2, complaining on the run's standard error, naming the place and why it cannot write there", () => {
    const place = join(temporaryDirectory("own-standard-error-"), "missing", "report.md");
    const error = writtenOn(process.stderr);

    const ending = writeReports(outputsAskedFor(["--format", `md:${place}`]), [], RECONCILIATION, processStreams, AS_ASKED);

    expect({ ending, complaint: error.join("") }).toEqual({ ending: 2, complaint: refused("report-not-written", { place, why: textFor(appCatalogue, "folder-does-not-exist") }) });
  });
});
