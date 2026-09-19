/**
 * THE UNCITED FITNESS CREDIT, PLANTED — and the standing proof that no route answers an
 * Evidence Obligation BY NAME (3F-2625).
 *
 * IN ITS OWN FILE, not appended to `fitnessReconciliation.test.ts`: that file sits against the
 * `max-lines` ceiling, which is a real gate here rather than a style preference (@SCN-FIT-001).
 *
 * WHY A PLANT AND NOT A GREP. `3F-2590` retired the by-name posting route and its commit never
 * touched `qualityCheckReconciliation.ts`, so the by-handle half survived there. The miss was not
 * carelessness: clause 1 was checked by grepping three SYMBOL names, all of which genuinely
 * returned zero, while the residue was an inline `find` inside a private helper — a shape no
 * symbol grep can see. Only reconciling a credit and reading where it landed can. So the retirement
 * is pinned by CONSTRUCTION here rather than by the absence of a word somewhere.
 *
 * THE COLLISION THE FALLBACK NEEDED, RESHAPED (3F-3161, @SCN-LNT-017). Until the registry route
 * retired, this collision was a MISSPELT HANDLE — a script whose bare tag WAS registered but whose
 * runnable handle was not, so hop 1 (`domain/checkRegistry`) missed it while the corpus still
 * raised the obligation. That specific fault shape no longer exists: there is no handle-keyed
 * lookup left to miss. The collision the surviving `id:` route can still produce is simpler and
 * covers the same ground — a check CI runs whose step states no code (or one no configured row
 * answers) cites nothing, exactly as an unregistered handle once did, and the corpus still raises
 * the obligation because nothing about ITS reading changed. `tests/fixtures/usg/ci.yml` (3F-3377)
 * already carries this exact shape at the cucumber layer; this is its unit-level twin.
 *
 * PLANTED WHOLE, AND IT USED TO BE THIS REPOSITORY'S OWN TREE (3F-3166). `typecheck` was the
 * collision: a prefix-less script that `specController.staticChecks` put on the books, so the CI
 * config, the manifest and the configured set could all be read from the checked-out source. That
 * conversion has happened — `typecheck` is @SCN-FIT-011 now, a `specController.fitnessChecks` row
 * observed through the `id:` on its own CI step, so it is no longer a DISCOVERED check and
 * `specController.staticChecks` has
 * left this manifest. Under 3F-3139's migration NO check of this tree is discovered by handle at
 * all, which is 3F-3165's finding one step further on: the durable subject is a planted tree.
 * What the real read bought was a genuine workflow under the OBSERVER; what this arm asserts is
 * what the RECONCILER does with a citation once resolved — the seam's inputs were fixtures here
 * already, and are now injected directly (see below). So the plant wires exactly the handle the
 * citation misses, and states its own premise instead of borrowing one from files other work edits.
 *
 * TWO FIXTURE FACTS, AND THE SECOND IS THE ONE THAT MAKES THE CREDIT UNCITED: the planted tree runs
 * a prefix-less `typecheck` script and configures it as a static check, so the observer produces a
 * credit; and the injected citation names nothing for it, so hop 1 of the citation seam returns
 * null. The tag itself is still raised by the corpus, so the corpus still raises the obligation.
 *
 * WHAT IT LOOKED LIKE BEFORE. The credit posted to SUSPENSE and, on the very same run, answered
 * SCN-AAA-001's obligation by handle — so the row read `balanced` on evidence that cited nothing
 * and the one observation was the credit side of two items on two rows. A green carrying a false
 * explanation, which is the class this repository exists to catch.
 *
 * Parent: @SCN-USG-001 — canon sends the citing-nothing destination here by name
 * (features/fitness-reconciliation.feature, "a fitness credit matching no Evidence Obligation
 * lands in suspense or on a phantom row": "A credit citing NOTHING never looked, and lands in
 * suspense — the tool's own uncited-check axis (@SCN-USG-001)").
 */

import { describe, it, expect } from "vitest";
import { reconcile } from "./evidenceReconciliation.js";
import type { ScriptCitation } from "../parse/fitnessCitations.js";
import { parseScenarios } from "../parse/scenarios.js";
import { fitnessChecksOf } from "./fitnessChecks.js";
import { runningStaticChecks } from "../parse/runningStaticChecks.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";

// A target that has named no behavioural runners — the membership argument the observed prefix
// set used to occupy (@SCN-USG-004, 3F-3343). These fixtures' pipelines run no suite, so there is
// nothing for a runner block to take out and naming one would be configuration about a step that
// is not there.
const NO_RUNNERS: Readonly<Record<string, string | null>> = {};


/** The prefix-less script the planted tree configures as a static check. */
const UNREGISTERED_HANDLE = "typecheck";

/**
 * The planted workflow and manifest — a tree that RUNS the prefix-less script, which is the whole
 * of what the observer needs to produce the credit this arm is about.
 *
 * STATED HERE RATHER THAN READ, and the two halves have to agree or the observer finds nothing: a
 * `run:` step naming the script, and a `scripts` entry defining it.
 */
const PLANTED_CI = [
  `jobs:\n  ci:\n    steps:\n      - run: pnpm ${UNREGISTERED_HANDLE}\n`,
];
const PLANTED_PACKAGE_JSON: PackageJsonScripts = {
  scripts: { [UNREGISTERED_HANDLE]: "tsc --noEmit" },
};

/** The seam's answer, injected — the step's own code names no configured row, so the run cites
 *  nothing however discovery found it. See the file header for why this is injected rather than
 *  derived through the seam. */
const citedScn = (): ScriptCitation | null => null;

describe("[SCN-USG-001] an uncited fitness credit lands in suspense and never answers an Evidence Obligation by name", () => {
  it("posts the citing-nothing credit to suspense, leaves the scenario naming that check missing, and answers no obligation anywhere with it", () => {
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      "    @fitness @SCN-AAA-001",
      "    Scenario: the tree compiles under the configured type settings",
    ].join("\n");
    const scenarios = parseScenarios(
      corpus, [], fitnessChecksOf([{ scn: "SCN-AAA-001" }])
    );
    // The obligation IS raised, and it names the row's word — which is the same word as the handle.
    // Without this the plant would prove only that an unnamed check reaches suspense, which is
    // @SCN-USG-001's plain case and was never what the by-handle arm keyed on.
    expect(scenarios.map((s) => [s.scnId, s.evidenceObligations])).toEqual([
      ["SCN-AAA-001", [{ qualityCheck: "fitness" }]],
    ]);

    const evidenceObservations = runningStaticChecks(
      PLANTED_CI,
      PLANTED_PACKAGE_JSON,
      NO_RUNNERS,
      citedScn
    );
    // THE PROBE FIRED, ASSERTED BEFORE ANYTHING IS READ OFF IT. An observer that produced nothing
    // would let every assertion below pass over an empty ledger — a probe that never fired, reading
    // as a probe that passed. It used to be the real manifest's `staticChecks` entry that was
    // checked for exactly this; the planted tree owes the same guard, taken one step later where it
    // covers the whole of the wiring rather than one input to it.
    expect(evidenceObservations).toHaveLength(1);
    const observation = evidenceObservations.find((o) => o.staticCheck === UNREGISTERED_HANDLE);
    // WHOLE-OBJECT, so the absence of `scnId` is pinned by its absence: an observer that
    // recovered the citation from the handle's shape carries the key and reds here.
    expect(observation).toEqual({
      qualityCheck: "fitness",
      staticCheck: UNREGISTERED_HANDLE,
      exists: true,
      enforcedOverRealSource: true,
    });

    const balance = reconcile(scenarios, [observation!]);

    // THE CREDIT LANDS IN SUSPENSE, naming the check that ran — @SCN-USG-001's own outcome.
    const suspense = balance.scenarioReconciliations.find((s) => s.kind === "suspense-scenario");
    expect(suspense?.scnId).toBe("(no scenario)");
    expect(suspense?.verdict).toBe("out-of-balance");
    expect(suspense?.qualityCheckReconciliations).toEqual([
      {
        qualityCheck: "fitness",
        staticCheck: UNREGISTERED_HANDLE,
        outcome: "cites-no-scenario",
        evidenceObservation: observation,
      },
    ]);

    // AND THE SCENARIO NAMING THAT CHECK READS MISSING — the honest pair. Nothing credited its
    // obligation, so it carries the obligation and NO observation (@SCN-LDG-028), and the row is
    // out of balance. Under the by-handle arm this row read `balanced` / `satisfied` instead.
    const fitness = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-AAA-001");
    expect(fitness?.verdict).toBe("out-of-balance");
    const missingItem = {
      qualityCheck: "fitness",
      outcome: "missing",
      evidenceObligation: { qualityCheck: "fitness" },
    };
    expect(fitness?.qualityCheckReconciliations).toEqual([missingItem]);
    expect(fitness?.reconcilingItems).toEqual([missingItem]);

    // EXACTLY ONE ROW HOLDS THE CREDIT, counted by IDENTITY across the whole ledger.
    expect(
      balance.scenarioReconciliations
        .filter((row) => row.evidenceObservations.includes(observation!))
        .map((row) => row.scnId)
    ).toEqual(["(no scenario)"]);

    // THE TEETH, and the assertion the symbol grep could not make: NO Evidence Obligation
    // ANYWHERE is answered by this credit. An item carrying BOTH an obligation and this
    // observation is a name-match by definition — whatever route produced it, whatever it is
    // called, and wherever in the module it lives. The by-handle `find` puts SCN-AAA-001 here.
    expect(
      balance.scenarioReconciliations
        .flatMap((row) =>
          row.qualityCheckReconciliations.map((item) => ({ row: row.scnId, item }))
        )
        .filter(
          ({ item }) =>
            item.evidenceObservation === observation && item.evidenceObligation !== undefined
        )
        .map(({ row }) => row)
    ).toEqual([]);
  });
});
