import { describe, expect, it } from "vitest";
import { stepAccountOf, totalsOf, type EvidenceReconciliation, type StepCounts } from "../domain/evidenceReconciliation.js";
import { coreText } from "../messages/catalogue.js";
import { markdownReportOf } from "./markdown.js";
import { PROVENANCE } from "./reconciledRun.test-utils.js";

// A run with nothing reconciled, and the parts given.
const runWith = (parts: Pick<EvidenceReconciliation, "runVerdict" | "provenance"> & Partial<EvidenceReconciliation>): EvidenceReconciliation => ({
  claimReconciliations: [],
  totals: totalsOf([], [], 0),
  stepAccount: stepAccountOf([]),
  errorsInTheInputs: { claimCodeErrors: [], configurationErrors: [] },
  runIntegrity: { neverRan: [] },
  ...parts,
});

describe("the Summary names each run verdict, and each reason a run is not reconciled", () => {
  it.each([
    ["CLM-RPT-111", "balanced", { verdict: "balanced" }, "verdict-balanced"],
    ["CLM-RPT-116", "out of balance", { verdict: "out-of-balance" }, "verdict-out-of-balance"],
    ["CLM-RPT-117", "not reconciled, because unsound", { verdict: "not-reconciled", why: "unsound" }, "verdict-unsound"],
    ["CLM-RPT-118", "not reconciled, because of claim code errors", { verdict: "not-reconciled", why: "claim-code-errors" }, "verdict-claim-code-errors"],
    ["CLM-RPT-119", "not reconciled, because there was nothing to reconcile", { verdict: "not-reconciled", why: "nothing-to-reconcile" }, "verdict-nothing-to-reconcile"],
  ] as const)("[%s] a run that was %s has its Summary name that run verdict", (_clm, _verdict, runVerdict, words) => {
    const lines = markdownReportOf(runWith({ runVerdict, provenance: PROVENANCE })).split("\n");

    expect(lines.filter((line) => line.startsWith(`- ${coreText("summary-run-verdict")}:`))).toEqual([`- ${coreText("summary-run-verdict")}: ${coreText(words)}`]);
  });
});

describe("the provenance shows each input the run read on its own line", () => {
  it("[CLM-RPT-115] the provenance has a line for an input the run read by default", () => {
    const report = markdownReportOf(runWith({ runVerdict: { verdict: "balanced" }, provenance: { ...PROVENANCE, inputs: [{ name: "workflows", path: ".github/workflows" }] } }));
    const provenance = report.slice(report.indexOf("## Run provenance")).split("\n\n## ")[0]!.split("\n");

    expect(provenance.slice(provenance.indexOf(`- ${coreText("provenance-inputs")}:`))).toEqual([`- ${coreText("provenance-inputs")}:`, "  - CI workflows: `.github/workflows`"]);
  });
});

describe("the step account totals its jobs only when it has more than one", () => {
  const counts: StepCounts = { stepsRead: 2, runners: 0, reconcilerSteps: 1, nonChecks: 0, plumbing: 0, fitnessFunctions: 1 };

  it.each([
    ["CLM-RPT-112", "one job", [{ workflow: "ci.yml", job: "build" }], false],
    ["CLM-RPT-113", "two jobs, in two workflows", [{ workflow: "ci.yml", job: "build" }, { workflow: "nightly.yml", job: "sweep" }], true],
  ] as const)("[%s] a run that read the steps of %s has a step account row for each job, and a Total row only for more than one", (_clm, _jobs, jobs, hasTotal) => {
    const report = markdownReportOf(
      runWith({
        runVerdict: { verdict: "balanced" },
        provenance: PROVENANCE,
        stepAccount: { jobs: jobs.map((job) => ({ ...job, ...counts })), total: counts },
      }),
    );
    const stepAccount = report.slice(report.indexOf("## Step account"));

    expect(stepAccount.split("\n").some((line) => line.startsWith("| Total |"))).toBe(hasTotal);
  });
});

describe("the step account shows each job's counts, and the Total row their sums", () => {
  const step = (workflow: string, job: string, command: string) => ({ workflow, job, plumbing: false, writesStepRecord: false, command, identity: command });

  it.each([
    ["CLM-RPT-165", "row for build", "build", ["2", "1", "0", "0", "0", "1"]],
    ["CLM-RPT-166", "Total row", "", ["3", "1", "0", "0", "1", "1"]],
  ] as const)("[%s] steps read in job build of ci.yml, 1 a test runner, and in job sweep of nightly.yml, 1 only setting the job up, show the step account's %s with its counts", (_clm, _row, job, counts) => {
    const stepAccount = stepAccountOf([
      { step: step("ci.yml", "build", "pnpm test"), disposition: "runner" },
      { step: step("ci.yml", "build", "pnpm lint"), disposition: "fitnessFunction" },
      { step: step("nightly.yml", "sweep", "actions/checkout"), disposition: "plumbing" },
    ]);
    const report = markdownReportOf(runWith({ runVerdict: { verdict: "balanced" }, provenance: PROVENANCE, stepAccount }));
    const rows = report.slice(report.indexOf("## Step account")).split("\n").filter((line) => line.startsWith("| ")).map((line) => line.slice(2, -2).split(" | "));

    expect(rows.find((cells) => cells[1] === job)?.slice(2)).toEqual(counts);
  });
});

describe("the provenance shows the tool SHA only when there is one", () => {
  it.each([
    ["CLM-RPT-167", "the tool SHA 9f8e7d6", { toolSha: "9f8e7d6" }, ["9f8e7d6"]],
    ["CLM-RPT-168", "no tool SHA", {}, []],
  ] as const)("[%s] a run whose provenance had %s shows it in the provenance, or no line for it", (_clm, _commit, toolCommit, shown) => {
    const report = markdownReportOf(runWith({ runVerdict: { verdict: "balanced" }, provenance: { ...PROVENANCE, ...toolCommit } }));
    const label = `- ${coreText("provenance-tool-sha")}: `;

    expect(report.split("\n").filter((line) => line.startsWith(label))).toEqual(shown.map((commit) => `${label}\`${commit}\``));
  });
});
