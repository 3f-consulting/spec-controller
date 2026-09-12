/**
 * @unit for @SCN-LDG-021 — the UNTAGGED SCENARIO'S ROW, on its two remaining collections.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-LDG-021, matching
 * features/ledger.feature, so a grep of the id returns both halves.
 *
 * WHY A SEPARATE FILE. `evidenceReconciliation.test.ts` — where @SCN-LDG-021's other arms live —
 * is frozen at exactly 964 code lines by the complexity-exceptions ratchet, which reds EITHER way:
 * one line added reds the complexity check, and raising the recorded value would widen the very debt
 * the ratchet exists to hold down. The house pattern for that is a focused sibling file
 * (`journal.test.ts`, `absorbedFitnessCredit.test.ts`, `uncitedFitnessCredit.test.ts`), and an
 * @SCN carrying arms in more than one file is already routine (@SCN-CIP-003 has four).
 *
 * WHY @SCN-LDG-021 AND NOT @SCN-LDG-023 (3F-2883, correcting its own ticket). The two surviving
 * mutants sit on the untagged row's `evidenceObservations` (337) and `pendingItems` (343) — read
 * off their COLUMN RANGES, not off the line. The `(@SCN-LDG-023)` comment three lines below 337
 * annotates `evidenceObligations` (341), a THIRD array whose mutant is already dead: the
 * @SCN-LDG-029 arm asserts `row.evidenceObligations` is empty. So the ticket paired these two
 * survivors with a comment that belongs to a neighbour.
 *
 * It matters because @SCN-LDG-023's Gherkin is exclusively about evidence OBLIGATIONS posting to
 * their account keyed by quality-check. A row's credits and its Pending Items are neither, so an
 * arm asserting them under that id would assert more than its scenario says — the fault 3F-2841
 * named, where a @unit arm quietly held a manifest assertion its scenario's text never mentioned. @SCN-LDG-021 IS the row: *"the untagged scenario has its own out-of-balance
 * row, reconciling no-scn-code"*. Both claims below say that row is EXACTLY that and nothing more.
 *
 * WHAT THE TWO CLAIMS REST ON. An untagged scenario reaches the ledger by NAME and carries no
 * @SCN code, so (a) no citation can name its account — every credit posts to the @SCN it cites, to
 * a phantom, or to suspense, and none of those is a name-keyed row; and (b) it raises no evidence
 * obligation at all, so there is nothing to defer and no Pending Item can partition off. The
 * synthesised scenario-scope obligation @SCN-LDG-029 pins lives on the reconciling ITEM, never on
 * the row — which is why both of these are the row's own collections, asked directly.
 *
 * THE FIXTURE HAS BOTH THINGS TO LOSE. A run with no credit and no pending obligation anywhere
 * would satisfy these assertions vacuously. This one posts a real credit to `SCN-AAA-001` and a
 * real Pending Item to `SCN-AAA-002`, and asserts each landed there — so the untagged row's two
 * empty arrays are a statement about ROUTING rather than about an empty run.
 */

import { describe, it, expect } from "vitest";

import { reconcile } from "./evidenceReconciliation.js";
import type { Scenario, EvidenceObservation } from "../model.js";

const UNTAGGED = "beta must never lose the money";

const namedScenarios: Scenario[] = [
  { scnId: "SCN-AAA-001", evidenceObligations: [{ qualityCheck: "unit" }] },
  { scnId: "SCN-AAA-002", evidenceObligations: [{ qualityCheck: "integration", pending: true }] },
];

const observed: EvidenceObservation[] = [
  { scnId: "SCN-AAA-001", qualityCheck: "unit", status: "passed" },
];

describe("[SCN-LDG-021] the untagged scenario's row carries no credit and no Pending Item", () => {
  const ledger = () => reconcile(namedScenarios, observed, [UNTAGGED]);
  const rowFor = (scnId: string) =>
    ledger().scenarioReconciliations.find((r) => r.scnId === scnId);

  it("routes the run's one credit to the account its citation names, not to the untagged row", () => {
    expect(rowFor("SCN-AAA-001")?.evidenceObservations).toStrictEqual([observed[0]]);
    // The row reached by NAME has no @SCN, so no citation can reach it. `[]` here is the posting
    // rule's own consequence, not an absence of credits in the run.
    expect(rowFor(UNTAGGED)?.evidenceObservations).toStrictEqual([]);
  });

  it("partitions the run's one pending obligation onto its own account, not onto the untagged row", () => {
    // The Pending Item is the obligation with its `pending` marker spent: partitioning IS the
    // deferral, so the flag has nothing left to say once the item is on the row.
    expect(rowFor("SCN-AAA-002")?.pendingItems).toStrictEqual([{ qualityCheck: "integration" }]);
    // An untagged scenario raises no evidence obligation, so it has nothing to defer.
    expect(rowFor(UNTAGGED)?.pendingItems).toStrictEqual([]);
  });
});
