/**
 * Unit test for the anemic-domain decision (@SCN-ANM-001, 3F-2417).
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe/it strings carry the
 * @SCN-ANM-001 id matching features/anemic-domain.feature, so a grep of the id returns both
 * halves of the pair.
 *
 * The decision is a pure function from paths to violations, so this arm plants paths rather
 * than files. What it pins is the two ways the rule could have been wrong — scoping by word
 * instead of by directory, and catching one casing but not the other — plus the boundary
 * cases a reader would otherwise have to guess at.
 *
 * Parent: @SCN-ANM-001 (3F-2417) — the anemic-domain static check.
 */

import { describe, it, expect } from "vitest";
import {
  DOMAIN_SEGMENT,
  PROCEDURAL_LAYER_WORDS,
  findProceduralLayerModules,
} from "./anemicDomain.js";

/** A domain path for a module named `stem`. */
const domainPath = (stem: string): string => `packages/core/src/domain/${stem}`;

describe("[SCN-ANM-001] a procedural-layer module beside the domain concepts reds the build", () => {
  it("[SCN-ANM-001] every procedural-layer word reds, in kebab, camel and bare spellings", () => {
    // Driven off the exported word list rather than a hand-typed one, so adding a word to
    // the rule cannot leave a spelling untested — the way a check quietly starts teaching
    // whoever hits it which spelling to use.
    for (const word of PROCEDURAL_LAYER_WORDS) {
      const capitalised = word.charAt(0).toUpperCase() + word.slice(1);
      for (const stem of [`ledger-${word}.ts`, `ledger${capitalised}.ts`, `${word}.ts`]) {
        const found = findProceduralLayerModules([domainPath(stem)]);
        expect(found, `${stem} must red`).toEqual([{ path: domainPath(stem), word }]);
      }
    }
  });

  it("[SCN-ANM-001] the same name outside a domain directory is not a violation", () => {
    // The load-bearing negative. A renderService at the edge is ordinary and legitimate;
    // a check that redded the word wherever it appeared would be a spell-checker, and the
    // first legitimate *Service outside the domain would get it switched off.
    expect(
      findProceduralLayerModules([
        "packages/core/src/render/renderService.ts",
        "packages/core/src/parse/parse-manager.ts",
        "packages/spec-controller/src/ingest/ingestOperations.ts",
      ]),
    ).toEqual([]);
  });

  it("[SCN-ANM-001] a module named for its concept is not a violation", () => {
    expect(
      findProceduralLayerModules([
        domainPath("ledger.ts"),
        domainPath("posting.ts"),
        domainPath("journal.ts"),
        domainPath("scenarioReconciliation.ts"),
      ]),
    ).toEqual([]);
  });

  it("[SCN-ANM-001] a test file for a procedural-layer module reds with it", () => {
    // The `.test` strip. Without it the module reds and its test does not, which leaves a
    // reader wondering whether the test was somehow blessed.
    expect(findProceduralLayerModules([domainPath("ledgerOperations.test.ts")])).toEqual([
      { path: domainPath("ledgerOperations.test.ts"), word: "operations" },
    ]);
  });

  it("[SCN-ANM-001] a word merely CONTAINED in a name is not a violation", () => {
    // The rule is about what a module is named FOR, which is its ending. `serviceable` and
    // `managerial` are not procedural layers, and a substring match would red them —
    // false positives are how a check earns the reputation that gets it switched off.
    expect(
      findProceduralLayerModules([
        domainPath("serviceLevel.ts"),
        domainPath("managerialAccounting.ts"),
        domainPath("operationsLog.ts"),
      ]),
    ).toEqual([]);
  });

  it("[SCN-ANM-001] the domain segment is the scope, and it is stated once", () => {
    // The scope lives in one exported constant that the decision and both arms read. A
    // second statement of it would agree by coincidence and drift the first time the
    // domain moved.
    expect(DOMAIN_SEGMENT).toBe("/src/domain/");
    expect(domainPath("ledger.ts")).toContain(DOMAIN_SEGMENT);
  });

  it("[SCN-ANM-001] an empty tree yields no violations rather than throwing", () => {
    expect(findProceduralLayerModules([])).toEqual([]);
  });
});
