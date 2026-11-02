import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";

const TERMS = [
  "- A Claim Reconciliation is one row of the ledger: the evidence for one claim, reconciled kind by kind of quality check in its Quality Check Reconciliations. A claim is a scenario, a phantom claim (a code that evidence cites and no scenario carries, which the table below calls an unknown Scenario) or the unnamed claim (the one row for evidence that names no one scenario).",
  "- A Reconciliation line is one line of a Quality Check Reconciliation, with its own outcome: each Evidence Observation it holds is one line, its Evidence Obligation is one more when no Evidence Observation that ran answers it, and one holding neither is a single line. No line stands in for another: a scenario whose one Evidence Obligation two passing tests answer adds one to the Claim Reconciliation total and two to the Reconciliation line total.",
  "- An Evidence Obligation is a proof a scenario asks for, by the tags it carries, to be met by Evidence Observations. A Pending Item is a proof a scenario defers, by a pending tag such as `@unitpending` or a deferral tag such as `@wip`: it raises no Evidence Obligation, is tallied apart, and never puts its claim out of balance.",
  "- An Evidence Observation is one reported result of a test or a fitness function, attributed by the code it cites: to the one scenario that carries the code, to a phantom claim when no scenario carries it, and to the unnamed claim when it cites no code or a code more than one scenario carries, because no one scenario can take it. One that never reached its assertions is broken: it was reported, but did not run to a result.",
];

function linesBeforeTable(md: string): string[] {
  const lines = md.split("\n");
  const heading = lines.indexOf("### Evidence reconciliation");
  const header = lines.findIndex((line, i) => i > heading && line.startsWith("| Subject |"));
  return lines.slice(heading + 1, header);
}

function totalOf(md: string, subject: string): number {
  const row = md.split("\n").find((line) => line.startsWith(`| ${subject} |`));
  return Number(row?.split("|")[2]?.trim());
}

describe("[SCN-RPT-071] the evidence reconciliation section says what a Claim Reconciliation, a Reconciliation line, an Evidence Obligation and an Evidence Observation are before its table", () => {
  it("prints the four definitions as a list between the heading and the table, the same on a one-scenario ledger and on one holding every kind of row, with no count and nothing bold", () => {
    const small = reconcile(
      [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [{ qualityCheckKind: "unit", scnId: "SCN-A", status: "passed" }],
    );
    const large = reconcile(
      [
        { scnId: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-B", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }] },
        { scnId: "SCN-C", evidenceObligations: [] },
        { scnId: "SCN-D", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-S", evidenceObligations: [{ qualityCheckKind: "unit" }] },
        { scnId: "SCN-S", evidenceObligations: [{ qualityCheckKind: "unit" }, { qualityCheckKind: "integration", pending: true }] },
      ],
      [
        { qualityCheckKind: "unit", scnId: "SCN-A", status: "passed" },
        { qualityCheckKind: "unit", scnId: "SCN-B", status: "passed" },
        { qualityCheckKind: "unit", scnId: "SCN-Z", status: "failed" },
        { qualityCheckKind: "unit", scnId: null, status: "passed" },
        { qualityCheckKind: "unit", scnId: "SCN-S", status: "passed" },
        { qualityCheckKind: "unit", scnId: "SCN-D", status: "failed", broken: true },
      ],
      ["fixture.feature : a scenario with no code"],
    );

    const rows = large.claimReconciliations;
    const row = (claim: string) => rows.find((r) => r.claim === claim);
    const outcomes = (claim: string) => (row(claim)?.qualityCheckReconciliations ?? []).map((q) => q.outcome);
    const sharers = rows.filter((r) => r.claim === "SCN-S");
    const unnamed = rows.find((r) => r.kind === "unnamed-claim");
    const unnamedObservations = (unnamed?.qualityCheckReconciliations ?? []).flatMap((q) => q.evidenceObservations ?? []);

    expect(row("SCN-A")?.verdict).toBe("balanced");
    expect(row("SCN-B")?.pendingItems).toEqual([{ qualityCheckKind: "integration" }]);
    expect(outcomes("SCN-C")).toEqual(["both-missing"]);
    expect(outcomes("SCN-D")).toEqual(["missing"]);
    expect(row("SCN-Z")?.kind).toBe("phantom-claim");
    expect(unnamedObservations.map((o) => o.scnId)).toEqual([null, "SCN-S"]);
    expect(unnamedObservations[1]?.notes).toEqual([{ kind: "shared-scn-code", code: "SCN-S" }]);
    expect(sharers.map((r) => r.qualityCheckReconciliations.map((q) => [q.qualityCheckKind, q.outcome]))).toEqual([
      [["unit", "duplicate-scn-code"]],
      [["unit", "duplicate-scn-code"], ["integration", "duplicate-scn-code"]],
    ]);
    expect(sharers.map((r) => r.pendingItems)).toEqual([[], []]);
    expect(outcomes("fixture.feature : a scenario with no code")).toEqual(["no-scn-code"]);
    expect(row("SCN-B")?.qualityCheckReconciliations.map((q) => q.qualityCheckKind)).toEqual(["unit"]);

    const linesAsDefined = rows
      .flatMap((r) => r.qualityCheckReconciliations)
      .reduce((total, q) => {
        const held = q.evidenceObservations ?? [];
        const unanswered = q.evidenceObligation !== undefined && !held.some((o) => o.broken !== true);
        const neither = q.evidenceObligation === undefined && held.length === 0;
        return total + held.length + (unanswered || neither ? 1 : 0);
      }, 0);

    const smallLines = linesBeforeTable(renderMarkdown(__er(small), ctx, publishedExitCodeOf));
    const largeLines = linesBeforeTable(renderMarkdown(__er(large), ctx, publishedExitCodeOf));

    expect(smallLines).toEqual(["", ...TERMS, ""]);
    expect(largeLines).toEqual(smallLines);
    expect(totalOf(renderMarkdown(__er(large), ctx, publishedExitCodeOf), "Reconciliation line")).toBe(linesAsDefined);
    for (const line of largeLines) {
      expect(line).not.toMatch(/[0-9]/);
      expect(line).not.toContain("**");
    }
  });

  it("prints, for the worked example its Reconciliation line definition states, one Claim Reconciliation and two Reconciliation lines", () => {
    const ledger = reconcile(
      [{ scnId: "SCN-A", evidenceObligations: [{ qualityCheckKind: "unit" }] }],
      [
        { qualityCheckKind: "unit", scnId: "SCN-A", status: "passed" },
        { qualityCheckKind: "unit", scnId: "SCN-A", status: "passed" },
      ],
    );
    const md = renderMarkdown(__er(ledger), ctx, publishedExitCodeOf);

    expect(totalOf(md, "Claim Reconciliation")).toBe(1);
    expect(totalOf(md, "Reconciliation line")).toBe(2);
  });
});
