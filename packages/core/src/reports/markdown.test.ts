import { describe, expect, it } from "vitest";
import { stepAccountOf, totalsOf, type EvidenceReconciliation, type StepCounts } from "../domain/evidenceReconciliation.js";
import type { Provenance } from "../domain/provenance.js";
import { coreText } from "../messages/catalogue.js";
import { markdownReportOf } from "./markdown.js";

// A run with nothing reconciled, and the parts given.
const runWith = (parts: Pick<EvidenceReconciliation, "runVerdict" | "provenance"> & Partial<EvidenceReconciliation>): EvidenceReconciliation => ({
  claimReconciliations: [],
  totals: totalsOf([], []),
  ...parts,
});

const PROVENANCE: Provenance = { target: "acme/web", sourceSha: "abc1234", toolVersion: "0.1.256", runTime: "2026-11-12T07:08:14Z", inputs: [] };

describe("each run verdict, and each reason a run is not reconciled, has an opening of its own", () => {
  it.each([
    ["CLM-RPT-111", "balanced", { verdict: "balanced" }, "verdict-balanced", "Every claim has the evidence it asks for, so the run is balanced and nothing needs your attention."],
    [
      "CLM-RPT-116",
      "out of balance",
      { verdict: "out-of-balance" },
      "verdict-out-of-balance",
      "Some claims lack the evidence they ask for, so the run is out of balance: the Claim Reconciliations below say what each needs.",
    ],
    [
      "CLM-RPT-117",
      "not reconciled, as unsound",
      { verdict: "not-reconciled", why: "unsound" },
      "verdict-unsound",
      "Some evidence never ran, so the run cannot be relied on and is not reconciled: Run integrity names it.",
    ],
    [
      "CLM-RPT-118",
      "not reconciled, for claim code errors",
      { verdict: "not-reconciled", why: "claim-code-errors" },
      "verdict-claim-code-errors",
      "Some claim codes are written where they do not belong, so the run is not reconciled: Errors in the inputs names them.",
    ],
    [
      "CLM-RPT-119",
      "not reconciled, with nothing to reconcile",
      { verdict: "not-reconciled", why: "nothing-to-reconcile" },
      "verdict-nothing-to-reconcile",
      "No claim and no evidence were read, so there was nothing to reconcile and the run is not reconciled.",
    ],
  ] as const)("[%s] a run that was %s opens with its sentence, and its Summary names that run verdict", (_clm, _verdict, runVerdict, words, opening) => {
    const lines = markdownReportOf(runWith({ runVerdict, provenance: PROVENANCE })).split("\n");

    expect({ opening: lines[2], verdict: lines.filter((line) => line.startsWith(`- ${coreText("summary-run-verdict")}:`)) }).toEqual({
      opening,
      verdict: [`- ${coreText("summary-run-verdict")}: ${coreText(words)}`],
    });
  });
});

describe("an input the run did not read has no line, and one it read by default has one", () => {
  it.each([
    [
      "CLM-RPT-114",
      "a Vitest report and a Cucumber report, and no pytest report",
      [{ name: "vitest", path: "vitest.json" }, { name: "pytest" }, { name: "cucumber", path: "cucumber.json" }],
      ["  - Vitest report: `vitest.json`", "  - Cucumber report: `cucumber.json`"],
    ],
    ["CLM-RPT-115", "the CI workflows by default", [{ name: "workflows", path: ".github/workflows" }], ["  - CI workflows: `.github/workflows`"]],
  ] as const)("[%s] a run that read %s has a provenance line for each input it read", (_clm, _read, inputs, lines) => {
    const report = markdownReportOf(runWith({ runVerdict: { verdict: "balanced" }, provenance: { ...PROVENANCE, inputs } }));
    const provenance = report.slice(report.indexOf("## Run provenance")).split("\n\n## ")[0]!.split("\n");

    expect(provenance.slice(provenance.indexOf(`- ${coreText("provenance-inputs")}:`))).toEqual([`- ${coreText("provenance-inputs")}:`, ...lines]);
  });
});

describe("the step account totals its jobs only when it has more than one", () => {
  const counts: StepCounts = { stepsRead: 2, runners: 0, reconcilerSteps: 1, nonChecks: 0, plumbing: 0, candidates: 1 };

  it.each([
    ["CLM-RPT-112", "one job", [{ workflow: "ci.yml", job: "build" }], ["ci.yml"]],
    ["CLM-RPT-113", "two jobs, in two workflows", [{ workflow: "ci.yml", job: "build" }, { workflow: "nightly.yml", job: "sweep" }], ["ci.yml", "nightly.yml", "Total"]],
  ] as const)("[%s] a run that read the steps of %s has a step account row for each job, and a Total row only for more than one", (_clm, _jobs, jobs, rows) => {
    const report = markdownReportOf(
      runWith({
        runVerdict: { verdict: "balanced" },
        provenance: PROVENANCE,
        stepAccount: { jobs: jobs.map((job) => ({ ...job, ...counts })), total: counts },
      }),
    );
    const stepAccount = report.slice(report.indexOf("## Step account"));

    expect(stepAccount.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| Workflow") && !line.startsWith("| ---")).map((line) => line.split(" | ")[0]!.slice(2))).toEqual(rows);
  });
});

describe("the step account shows each job's counts, and the Total row their sums", () => {
  const step = (workflow: string, job: string, run: string) => ({ workflow, job, plumbing: false, writesStepRecord: false, run });

  it.each([
    ["CLM-RPT-165", "row for build", "build", ["2", "1", "0", "0", "0", "1"]],
    ["CLM-RPT-166", "Total row", "", ["3", "1", "0", "0", "1", "1"]],
  ] as const)("[%s] steps read in job build of ci.yml, 1 a test runner, and in job sweep of nightly.yml, 1 only setting the job up, show the step account's %s with its counts", (_clm, _row, job, counts) => {
    const stepAccount = stepAccountOf([
      { step: step("ci.yml", "build", "pnpm test"), disposition: "runner" },
      { step: step("ci.yml", "build", "pnpm lint"), disposition: "candidate" },
      { step: step("nightly.yml", "sweep", "actions/checkout"), disposition: "plumbing" },
    ]);
    const report = markdownReportOf(runWith({ runVerdict: { verdict: "balanced" }, provenance: PROVENANCE, stepAccount }));
    const rows = report.slice(report.indexOf("## Step account")).split("\n").filter((line) => line.startsWith("| ")).map((line) => line.slice(2, -2).split(" | "));

    expect(rows.find((cells) => cells[1] === job)?.slice(2)).toEqual(counts);
  });
});

describe("the provenance shows the tool's commit only when there is one", () => {
  it.each([
    ["CLM-RPT-167", "the tool commit 9f8e7d6", { toolSha: "9f8e7d6" }, ["9f8e7d6"]],
    ["CLM-RPT-168", "no tool commit", {}, []],
  ] as const)("[%s] a run whose provenance had %s shows it in the provenance, or no line for it", (_clm, _commit, toolCommit, shown) => {
    const report = markdownReportOf(runWith({ runVerdict: { verdict: "balanced" }, provenance: { ...PROVENANCE, ...toolCommit } }));
    const label = `- ${coreText("provenance-tool-sha")}: `;

    expect(report.split("\n").filter((line) => line.startsWith(label))).toEqual(shown.map((commit) => `${label}\`${commit}\``));
  });
});
