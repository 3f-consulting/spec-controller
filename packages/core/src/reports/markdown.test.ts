import { describe, expect, it } from "vitest";
import type { StepCounts } from "../domain/evidenceReconciliation.js";
import { markdownReportOf } from "./markdown.js";

describe("each run verdict, and each reason a run is not reconciled, has an opening of its own", () => {
  it.each([["CLM-RPT-111", "balanced", "Every claim has the evidence it asks for, so the run is balanced and nothing needs your attention."]] as const)(
    "[%s] a run that was %s opens with its sentence",
    (_clm, verdict, opening) => {
      expect(markdownReportOf({ runVerdict: { verdict } }).split("\n")[0]).toBe(opening);
    },
  );
});

describe("the step account totals its jobs only when it has more than one", () => {
  const counts: StepCounts = { stepsRead: 2, runners: 0, reconcilerSteps: 1, nonChecks: 0, plumbing: 0, candidates: 1 };

  it.each([
    ["CLM-RPT-112", "one job", [{ workflow: "ci.yml", job: "build" }], ["ci.yml"]],
    ["CLM-RPT-113", "two jobs, in two workflows", [{ workflow: "ci.yml", job: "build" }, { workflow: "nightly.yml", job: "sweep" }], ["ci.yml", "nightly.yml", "Total"]],
  ] as const)("[%s] a run that read the steps of %s has a step account row for each job, and a Total row only for more than one", (_clm, _jobs, jobs, rows) => {
    const report = markdownReportOf({
      runVerdict: { verdict: "balanced" },
      stepAccount: { jobs: jobs.map((job) => ({ ...job, ...counts })), total: { ...counts, accountedFor: 2 } },
    });
    const stepAccount = report.slice(report.indexOf("## Step account"));

    expect(stepAccount.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| Workflow") && !line.startsWith("| ---")).map((line) => line.split(" | ")[0]!.slice(2))).toEqual(rows);
  });
});
