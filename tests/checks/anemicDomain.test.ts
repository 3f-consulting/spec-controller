/**
 * Unit test for the anemic-domain decision (@SCN-ANM-001, 3F-2417).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * @SCN-ANM-001 id matching features/anemic-domain.feature, so a grep of the id returns both
 * halves of the pair.
 *
 * ONE ARM, ONE CORPUS, ONE ASSERTION (3F-3222, under 3F-3218). The decision is a pure
 * function from paths to violations, so the arm plants paths rather than files: one corpus
 * carrying every violation kind the rule detects — each procedural-layer word, in each of the
 * three spellings it accepts, plus the `.test` strip — beside the near-misses it must NOT red.
 * A separate arm per kind leaves ORDER and COMPLETENESS unasserted: a rule reporting the ten
 * violations plus an eleventh, or reporting them under the wrong word, satisfies every
 * per-kind arm. One expect over the whole returned list closes both.
 *
 * THE CORPUS IS DERIVED FROM THE EXPORTED WORD LIST; THE EXPECTATION IS NOT. A fourth
 * procedural-layer word added to PROCEDURAL_LAYER_WORDS grows the corpus and reds this arm
 * against its hand-written verdict, so the word cannot arrive with no evidence behind it.
 * Deriving both sides would agree with itself and assert nothing.
 *
 * THE REAL TREE IS NOT THIS ARM'S SUBJECT, AND THAT IS RULED, NOT ASSUMED. @SCN-FIT-009 runs
 * `pnpm lint:anemic-domain` over `git ls-files` on every fitness pass — measured, not
 * inferred: a tracked domain module named for a procedural layer exits the CLI 1 and reds the
 * row. features/fitness-reconciliation.feature says the same in canon — "@SCN-ANM-001 holds
 * the check against planted trees and @SCN-FIT-009 holds this repository against the check".
 *
 * Parent: @SCN-ANM-001 (3F-2417) — the anemic-domain static check.
 */

import { describe, it, expect } from "vitest";
import { PROCEDURAL_LAYER_WORDS, findProceduralLayerModules } from "./anemicDomain.js";

/** A domain path for a module named `stem`. */
const domainPath = (stem: string): string => `packages/core/src/domain/${stem}`;

const PLANTED_TREE: readonly string[] = [
  ...PROCEDURAL_LAYER_WORDS.flatMap((word) => [
    domainPath(`ledger-${word}.ts`),
    domainPath(`ledger${word.charAt(0).toUpperCase()}${word.slice(1)}.ts`),
    domainPath(`${word}.ts`),
  ]),
  domainPath("ledgerOperations.test.ts"),

  // Clean beside them. Each is a near-miss the rule must not red, and each is pinned by its
  // ABSENCE from the verdict below rather than by an arm of its own: a module named for its
  // concept; the three words merely CONTAINED in a name rather than ending it; and the same
  // names one directory over, where a *Service at an edge is ordinary and legitimate — the
  // scope is a domain directory, not the word, and this is where that is asserted now the
  // constant's own restatement has gone.
  domainPath("ledger.ts"),
  domainPath("serviceLevel.ts"),
  domainPath("managerialAccounting.ts"),
  domainPath("operationsLog.ts"),
  "packages/core/src/render/renderService.ts",
  "packages/core/src/parse/parse-manager.ts",
  "packages/spec-controller/src/ingest/ingestOperations.ts",
];

describe("[SCN-ANM-001] a procedural-layer module beside the domain concepts reds the build", () => {
  it("[SCN-ANM-001] reports every word in every spelling, in order, under the word that condemned it, and nothing for the near-misses beside them", () => {
    expect(findProceduralLayerModules(PLANTED_TREE)).toEqual([
      { path: domainPath("ledger-operations.ts"), word: "operations" },
      { path: domainPath("ledgerOperations.ts"), word: "operations" },
      { path: domainPath("operations.ts"), word: "operations" },
      { path: domainPath("ledger-service.ts"), word: "service" },
      { path: domainPath("ledgerService.ts"), word: "service" },
      { path: domainPath("service.ts"), word: "service" },
      { path: domainPath("ledger-manager.ts"), word: "manager" },
      { path: domainPath("ledgerManager.ts"), word: "manager" },
      { path: domainPath("manager.ts"), word: "manager" },
      // The `.test` strip: the test of a module that must not exist reds with it. Without it
      // the module reds and its test does not, leaving a reader wondering whether the test
      // was somehow blessed.
      { path: domainPath("ledgerOperations.test.ts"), word: "operations" },
    ]);
  });
});
