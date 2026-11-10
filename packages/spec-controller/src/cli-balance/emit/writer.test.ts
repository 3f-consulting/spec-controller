import { chmodSync, existsSync, lstatSync, statSync, mkdirSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderJson, renderMarkdown, type EvidenceReconciliation } from "@3f-consulting/spec-controller-core";
import { writeReports } from "./writer.js";
import type { IdentifiedInput } from "./format.js";
import { settlingRefusal } from "../../outputLocation.js";
import { AppError } from "../../messages.js";
import { message } from "../../appText.js";
import { temporaryDirectory } from "../../temporaryDirectory.test-utils.js";
import { recordWhatTheProgramWrites, whatTheProgramWrote, type Written } from "../../programOutput.test-utils.js";

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
