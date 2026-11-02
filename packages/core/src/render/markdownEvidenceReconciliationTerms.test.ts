import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../assemble/composers.js";
import { reconcile } from "../domain/evidenceReconciliation.js";
import { sampleReportCtx as ctx } from "./runContext.test-utils.js";
import { __er } from "../evidenceReconciliation.test-utils.js";
import { publishedExitCodeOf } from "./publishedExitCodes.test-utils.js";
import { everyRowKind } from "./everyRowKind.test-utils.js";

const TERMS = [
  "- A Claim Reconciliation is one row of the ledger: one claim, reconciled in its Quality Check Reconciliations. A claim is a scenario, a phantom claim (a code that evidence cites and no scenario carries, which the table below calls an unknown Scenario) or the unnamed claim (the one row for the evidence that no scenario or phantom claim takes).",
  "- A Reconciliation line is one line of a Quality Check Reconciliation, with its own outcome: each Evidence Observation it holds is one line, its Evidence Obligation is one more when no Evidence Observation that ran answers it, and one holding neither is a single line. No line stands in for another: a scenario whose one Evidence Obligation two passing tests answer adds one to the Claim Reconciliation total and two to the Reconciliation line total.",
  "- An Evidence Obligation is a proof a scenario asks for, by the tags it carries, to be met by Evidence Observations. A Pending Item is a proof a scenario defers, by a pending tag such as `@unitpending` or a deferral tag such as `@wip`, tallied apart from balanced and out-of-balance.",
  "- An Evidence Observation is one reported result of a test or a fitness function, attributed by the codes it cites: to the one scenario that carries its one code, to a phantom claim when no scenario carries its one code, and otherwise to the unnamed claim, because no one scenario can take it. One that never reached its assertions is broken: it was reported, but did not run to a result.",
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
    const large = everyRowKind();
    const rows = large.ledger.claimReconciliations;

    const linesAsDefined = rows
      .flatMap((r) => r.qualityCheckReconciliations)
      .reduce((total, q) => {
        const held = q.evidenceObservations ?? [];
        const unanswered = q.evidenceObligation !== undefined && !held.some((o) => o.broken !== true);
        const neither = q.evidenceObligation === undefined && held.length === 0;
        return total + held.length + (unanswered || neither ? 1 : 0);
      }, 0);

    const smallLines = linesBeforeTable(renderMarkdown(__er(small), ctx, publishedExitCodeOf));
    const largeLines = linesBeforeTable(renderMarkdown(large, ctx, publishedExitCodeOf));

    expect(smallLines).toEqual(["", ...TERMS, ""]);
    expect(largeLines).toEqual(smallLines);
    expect(totalOf(renderMarkdown(large, ctx, publishedExitCodeOf), "Reconciliation line")).toBe(linesAsDefined);
    for (const line of largeLines) {
      expect(line).not.toMatch(/[0-9]/);
      expect(line).not.toContain("**");
    }
  });

  it("holds each claim its definitions make about which rows they cover over a ledger holding every kind of row", () => {
    const { ledger, summary } = everyRowKind();
    const rows = ledger.claimReconciliations;
    const scenarioCodes = rows.filter((r) => r.kind === "scenario").map((r) => r.claim);
    const carriers = (code: string | null) => scenarioCodes.filter((claim) => claim === code).length;
    const held = (r: (typeof rows)[number]) => r.qualityCheckReconciliations.flatMap((q) => q.evidenceObservations ?? []);
    const severalCodes = (o: ReturnType<typeof held>[number]) => (o.notes ?? []).some((note) => note.kind === "several-scn-codes");

    expect(new Set(rows.map((r) => r.kind))).toEqual(new Set(["scenario", "phantom-claim", "unnamed-claim"]));
    expect(rows.filter((r) => r.kind === "unnamed-claim")).toHaveLength(1);
    for (const r of rows) {
      for (const o of held(r)) {
        if (r.kind === "scenario") expect([o.scnId, carriers(o.scnId ?? null)]).toEqual([r.claim, 1]);
        if (r.kind === "phantom-claim") expect([o.scnId, carriers(o.scnId ?? null)]).toEqual([r.claim, 0]);
        if (r.kind === "unnamed-claim") expect(o.scnId === undefined || o.scnId === null || carriers(o.scnId) > 1).toBe(true);
        if (severalCodes(o)) expect(r.kind).toBe("unnamed-claim");
      }
    }
    expect(rows.flatMap(held).filter(severalCodes)).toHaveLength(1);

    const pendingItems = rows.flatMap((r) => r.pendingItems).length;
    const { claimReconciliations, pending } = summary.evidenceReconciliation;
    expect(pending).toBe(pendingItems);
    expect(claimReconciliations.balanced + claimReconciliations.outOfBalance).toBe(rows.length);
    expect(rows.some((r) => r.pendingItems.length > 0 && r.verdict === "out-of-balance")).toBe(true);
    expect(renderMarkdown(everyRowKind(), ctx, publishedExitCodeOf)).toContain(
      `${pendingItems} Pending Item(s) — deferred, tallied apart from balanced and out-of-balance.`,
    );
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
