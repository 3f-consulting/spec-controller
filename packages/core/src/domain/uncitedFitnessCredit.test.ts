/**
 * THE UNCITED FITNESS CREDIT, PLANTED — and the standing proof that no route answers an
 * Evidence Obligation BY NAME (3F-2625).
 *
 * IN ITS OWN FILE, not appended to `lintReconciliation.test.ts`: that file sits against the
 * `max-lines` ceiling, which is a real gate here rather than a style preference (@SCN-CPX-004).
 *
 * WHY A PLANT AND NOT A GREP. `3F-2590` retired the by-name posting route and its commit never
 * touched `qualityCheckReconciliation.ts`, so the by-handle half survived there. The miss was not
 * carelessness: clause 1 was checked by grepping three SYMBOL names, all of which genuinely
 * returned zero, while the residue was an inline `find` inside a private helper — a shape no
 * symbol grep can see. Only reconciling a credit and reading where it landed can. So the retirement
 * is pinned by CONSTRUCTION here rather than by the absence of a word somewhere.
 *
 * THE COLLISION THE FALLBACK NEEDED, and it is spec-controller's OWN configuration. The by-handle
 * arm compared an uncited observation's `staticCheck` — the RUNNABLE handle — against the
 * obligation's `staticCheck`, which is the BARE check tag its stepless scenario carries. For
 * eleven of this repository's twelve checks those two spellings differ (`lint:feature-codes` vs
 * `feature-codes`) and the arm could never fire. `typecheck` carries no prefix, so its handle and
 * its bare tag are the SAME WORD — the one check on which the retired route was still live.
 *
 * ONE FIXTURE FACT MAKES THE CREDIT UNCITED: the registry maps `lint:typecheck` where the script
 * is really called `typecheck`, so the running handle is UNREGISTERED and hop 1 of the citation
 * seam returns null (`domain/checkRegistry` — "a running check the registry cannot name reaches no
 * @SCN, so its observation cites nothing and lands in suspense"). The tag itself is registered, so
 * the corpus still raises the obligation. Everything else — the CI config, the package.json, the
 * configured static-check set — is this repository's real, checked-out tree.
 *
 * WHAT IT LOOKED LIKE BEFORE. The credit posted to SUSPENSE and, on the very same run, answered
 * SCN-FIT-001's obligation by handle — so the row read `balanced` on evidence that cited nothing
 * and the one observation was the credit side of two items on two rows. A green carrying a false
 * explanation, which is the class this repository exists to catch.
 *
 * Parent: @SCN-USG-001 — canon sends the citing-nothing destination here by name
 * (features/fitness-reconciliation.feature, "a fitness credit matching no Evidence Obligation
 * lands in suspense or on a phantom row": "A credit citing NOTHING never looked, and lands in
 * suspense — the tool's own uncited-check axis (@SCN-USG-001)").
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { reconcile } from "./evidenceReconciliation.js";
import { checkRegistryOf, registeredCheckTags } from "./checkRegistry.js";
import { citationOfScript, fitnessCitations } from "../parse/fitnessCitations.js";
import { parseScenarios, parseTaggedScenarios } from "../parse/scenarios.js";
import { runningStaticChecks } from "../parse/runningStaticChecks.js";
import type { PackageJsonScripts } from "../parse/checkScriptsRunInCI.js";

/** The real, prefix-less script this repository configures as a static check. */
const UNREGISTERED_HANDLE = "typecheck";

/**
 * The handle the fixture registry maps instead — a misspelling of the real one, which is what
 * leaves the running script unregistered while its bare tag stays known to the corpus.
 */
const MISSPELT_HANDLE = "lint:typecheck";

describe("[SCN-USG-001] an uncited fitness credit lands in suspense and never answers an Evidence Obligation by name", () => {
  it("posts the citing-nothing credit to suspense, leaves the scenario naming that check missing, and answers no obligation anywhere with it", () => {
    const root = process.cwd();
    const ciSource = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as
      PackageJsonScripts & { specController?: { staticChecks?: string[] } };
    // READ FROM THE REAL CONFIG, never retyped. If this repository ever stops configuring
    // `typecheck` as a static check the observer produces nothing and every assertion below would
    // pass over an empty ledger — a probe that never fired, reading as a probe that passed.
    const configuredStaticChecks = packageJson.specController?.staticChecks ?? [];
    expect(configuredStaticChecks).toContain(UNREGISTERED_HANDLE);

    // The registry knows the TAG and misses the HANDLE — the one planted fact.
    const registry = checkRegistryOf({ [MISSPELT_HANDLE]: UNREGISTERED_HANDLE });
    const checkTags = registeredCheckTags(registry);
    const corpus = [
      "@LNT",
      "Feature: fixture",
      "  Rule: a fixture rule",
      `    @${UNREGISTERED_HANDLE} @SCN-FIT-001`,
      "    Scenario: the tree compiles under the configured type settings",
    ].join("\n");
    const scenarios = parseScenarios(corpus, [], checkTags);
    // The obligation IS raised, and it names the BARE tag — which is the same word as the handle.
    // Without this the plant would prove only that an unnamed check reaches suspense, which is
    // @SCN-USG-001's plain case and was never what the by-handle arm keyed on.
    expect(scenarios.map((s) => [s.scnId, s.evidenceObligations])).toEqual([
      ["SCN-FIT-001", [{ qualityCheck: "lint", staticCheck: UNREGISTERED_HANDLE }]],
    ]);
    const citations = fitnessCitations(parseTaggedScenarios(corpus), checkTags);

    const evidenceObservations = runningStaticChecks(
      [ciSource],
      packageJson,
      ["lint:"],
      configuredStaticChecks,
      (script) => citationOfScript(script, registry, citations)
    );
    const observation = evidenceObservations.find((o) => o.staticCheck === UNREGISTERED_HANDLE);
    // WHOLE-OBJECT, so the absence of `scnId` is pinned by its absence: an observer that
    // recovered the citation from the handle's shape carries the key and reds here.
    expect(observation).toEqual({
      qualityCheck: "lint",
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
        qualityCheck: "lint",
        staticCheck: UNREGISTERED_HANDLE,
        outcome: "cites-no-scenario",
        evidenceObservation: observation,
      },
    ]);

    // AND THE SCENARIO NAMING THAT CHECK READS MISSING — the honest pair. Nothing credited its
    // obligation, so it carries the obligation and NO observation (@SCN-LDG-028), and the row is
    // out of balance. Under the by-handle arm this row read `balanced` / `satisfied` instead.
    const fitness = balance.scenarioReconciliations.find((s) => s.scnId === "SCN-FIT-001");
    expect(fitness?.verdict).toBe("out-of-balance");
    const missingItem = {
      qualityCheck: "lint",
      staticCheck: UNREGISTERED_HANDLE,
      outcome: "missing",
      evidenceObligation: { qualityCheck: "lint", staticCheck: UNREGISTERED_HANDLE },
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
    // called, and wherever in the module it lives. The by-handle `find` puts SCN-FIT-001 here.
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
