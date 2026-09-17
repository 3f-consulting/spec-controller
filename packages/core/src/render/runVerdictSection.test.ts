/**
 * @unit for @SCN-CLI-019 — the run-verdict HEADLINE on an empty ledger: the render half of the
 * scenario whose exit-code half lives in packages/spec-controller/src/cli-balance/cli.test.ts
 * and whose @e2e half spawns the real binary in tests/steps/cliBalance.steps.ts.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries the SCN-CLI-019 id, so a
 * grep of it returns the scenario, this arm, the predicate arm and the ladder arm.
 *
 * IT IS ITS OWN FILE RATHER THAN THREE MORE ARMS IN markdown.test.ts, for the reason
 * provenanceSection.test.ts already records: that file is far over the 400-code-line ceiling, so
 * under @SCN-CPX-001 a change touching it reds until it comes back under the standard. The run
 * verdict is a self-contained emitter and its arms travel with it.
 *
 * THE HEADLINE WORD IS A RENDER WORD, NEVER THE PREDICATE'S NAME — the `hasBrokenEvidence` →
 * "UNSOUND", `isBalanced` → "balanced" precedent. What is pinned here is the sentence a consumer
 * reads, not the function that produced it.
 *
 * THE POSITION, MEASURED RATHER THAN ARGUED (3F-3344). `runVerdictSection` asks the predicates in
 * the CLI ladder's own order and this branch is FIRST in both, which is what stops the headline
 * drifting from the exit code it names (@SCN-CLI-013's invariant). But its position among the
 * other three is FREE: an empty ledger fires none of them, and the plant that moved it below
 * `isBalanced` in the ladder stayed GREEN. What reds — and what the second arm below pins — is the
 * arm going away, because "**BALANCED**" is where this chain ENDS UP rather than a case it tests
 * for, so a fifth verdict displaces that default instead of following it.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import type { Ledger } from "../model.js";
import { reconcile, summaryOf } from "../domain/evidenceReconciliation.js";
import type { EvidenceReconciliation } from "../domain/evidenceReconciliation.js";
import type { RunContext } from "../provenance/provenance.js";

/** The reconciliation around a Ledger fixture — `summaryOf` is the concept's own tally. */
const er = (ledger: Ledger): EvidenceReconciliation => ({ summary: summaryOf(ledger, false, false), ledger });

const ctx: RunContext = {
  target: "nothing-to-reconcile-target",
  inputs: { features: "features" },
  runStart: new Date("2026-09-12T09:00:00.000Z"),
  sourceSha: "905a987c0ffeeba110000000000000000deadbeef",
  toolSha: "13ee47f271ace511efdb2511276284b4cb50c247",
  toolVersion: "0.1.0",
};

describe("[SCN-CLI-019] the run verdict on a ledger with no accounts reads NOTHING TO RECONCILE, never BALANCED", () => {
  // RECONCILER-TRUE (evidence-manifesto §11A): produced by reconcile() over an empty corpus and
  // empty evidence — the ledger the pipeline genuinely emits for a target that declared nothing
  // and produced nothing, not a hand-built `{ scenarioReconciliations: [] }`.
  const empty: Ledger = reconcile([], []);

  it("names the run's own state and the exit code it maps to", () => {
    const md = renderMarkdown(er(empty), ctx);
    expect(md).toContain("**NOTHING TO RECONCILE**");
    expect(md).toMatch(/\*\*NOTHING TO RECONCILE\*\* — .*\(exit 5\)/);
  });

  it("never reads as balanced — the vacuous green is the fault, not a missing sentence", () => {
    // THE TEETH. The old output was not silence, it was the WRONG sentence: `**BALANCED** —
    // every Scenario Reconciliation balances … (exit 0)` over zero rows. Both halves are
    // barred, so a branch that renders the new headline while ALSO leaving the old one
    // reachable cannot pass.
    const md = renderMarkdown(er(empty), ctx);
    expect(md).not.toContain("**BALANCED**");
    expect(md).not.toContain("(exit 0)");
  });

  it("does not fire for a run that HAS accounts, whatever their verdict", () => {
    // The boundary that keeps this honest: the branch is first in the chain, so a mis-keyed
    // predicate would swallow every other verdict. A balanced run still reads BALANCED.
    const balanced: Ledger = reconcile(
      [{ scnId: "SCN-NTR-002", evidenceObligations: [{ qualityCheck: "unit" }] }],
      [{ qualityCheck: "unit", scnId: "SCN-NTR-002", status: "passed" }]
    );
    const md = renderMarkdown(er(balanced), ctx);
    expect(md).toContain("**BALANCED**");
    expect(md).not.toContain("**NOTHING TO RECONCILE**");
  });
});
