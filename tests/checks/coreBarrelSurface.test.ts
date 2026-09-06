/**
 * The `@unit` guard for @SCN-API-001 — the core barrel re-exports exactly the frozen v1 surface.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `describe` / `it` strings carry the
 * SCN-API-001 id matching features/public-api.feature, so a grep of that id returns both halves of
 * the pair. `@unit`, as the scenario is tagged — this Vitest run IS the observed evidence and no
 * Cucumber block is owed.
 *
 * WHY THE EVIDENCE MOVED OUT OF `packages/core` AND THE SCENARIO DID NOT. Everything this file
 * asserts, `packages/core/src/index.test.ts` asserted until 3F-2838, over a reflection and a
 * comparison it carried itself. Those are now `publishedSurfaces.ts`'s, shared with @SCN-API-004,
 * @SCN-API-005 and @SCN-API-006 — and `packages/core` cannot import them. Core is the pure library
 * and `spec-controller` depends on it, so a core test reading this module would invert that
 * dependency and close a cycle. Reading core's tree from `tests/checks/` is the direction that
 * already works, and `enginePurity` and `domainPurity` both do it. So the scenario stayed exactly
 * where it was and its evidence came here.
 *
 * THIS FILE HOLDS NO ENUMERATION OF ITS OWN, AND THAT IS WHAT THE LIFT BOUGHT. The written-down
 * surface is the registry's core `.` entry, transcribed from `index.ts`'s own `export` statements.
 * Keeping a second copy here would put two lists in this repository that have to be edited together
 * — the arrangement where one is updated, the other is not, and the surface is held to whichever
 * was remembered.
 *
 * WHAT THE THIRD READING FOUND, BECAUSE IT IS THE ONLY REASON TO TRUST THE ONE THAT SURVIVED. The
 * entry this guard now reconciles against and the enumeration it used to carry were written by two
 * people who had not read each other, and 3F-2838 transcribed the barrel a third time before
 * opening either: 26 values and 36 types, symbol for symbol, all three agreeing. A disagreement
 * would have been a finding about the surface. Agreement is what makes retiring the older list a
 * removal of duplication rather than a loss of a reading.
 *
 * THE PER-SURFACE ARMS OF @SCN-API-004 AND @SCN-API-005 ALREADY COVER THIS BARREL, and the overlap
 * is stated rather than avoided. Those arms hold every published subpath, this one holds the subpath
 * a consumer's v1 contract is; the reconciliation underneath is the same and running it twice costs
 * nothing. What would be lost by leaning on them instead is the bidirectional handle: @SCN-API-001
 * is a scenario on the ledger and it owes evidence spelled with its own id.
 */

import { describe, expect, it } from "vitest";

import * as coreBarrel from "@3f-consulting/spec-controller-core";

import {
  barrelPathOf,
  PUBLISHED_SURFACES,
  reconcileTypeSurface,
  reconcileValueSurface,
  reflectTypeSurface,
  specifierOf,
  type PublishedSurface,
} from "./publishedSurfaces.js";

/** The specifier a consumer of the frozen v1 contract writes. */
const CORE_SPECIFIER = "@3f-consulting/spec-controller-core";

/**
 * The surface written down for core's `.` barrel, raised for rather than looked past.
 *
 * A `find` that answered `undefined` would leave every assertion below with nothing to compare
 * against, and the shapes they are written in would then pass — the check having lost its subject,
 * reading as the check having found no drift.
 */
function coreSurface(): PublishedSurface {
  const surface = PUBLISHED_SURFACES.find((entry) => specifierOf(entry) === CORE_SPECIFIER);
  if (surface === undefined) {
    throw new Error(`no surface is written down for ${CORE_SPECIFIER}`);
  }

  return surface;
}

let readTypeSurface: readonly string[] | undefined;

/**
 * The barrel's compiled type surface, read once for the file.
 *
 * Each reading builds a Program and binds it, which is fast for what it does and not free; four
 * assertions want the same answer and the barrel does not change between them.
 */
function coreTypeSurface(): readonly string[] {
  readTypeSurface ??= reflectTypeSurface(barrelPathOf(coreSurface()));

  return readTypeSurface;
}

describe("[SCN-API-001] the core barrel exports exactly the frozen v1 contract surface", () => {
  it("[SCN-API-001] re-exports exactly the frozen VALUE surface — reds on any value symbol added or dropped", () => {
    const surface = coreSurface();
    const reflected = Object.keys(coreBarrel);

    // Two assertions over one fact, both earning their place for the reason the shared arms give:
    // the first fails with the two lists side by side, which is what a maintainer reconciling a
    // real change wants to read, and the second is the reconciliation whose teeth are planted.
    expect([...reflected].sort()).toEqual([...surface.values].sort());
    expect(reconcileValueSurface(surface, reflected)).toEqual([]);
  });

  it("[SCN-API-001] re-exports exactly the frozen TYPE surface — reds on any type added, dropped, or renamed", () => {
    const surface = coreSurface();
    const reflected = coreTypeSurface();

    // Types are erased, so the arm above cannot see one of these and this one asks the compiler
    // instead. The alternative — spelling each expected type into a typed literal — reds on a type
    // dropped or renamed and stays green on one added, because nothing references what nobody
    // wrote; reading the compiled surface is what closes the add.
    expect(reflected).toEqual([...surface.types].sort());
    expect(reconcileTypeSurface(surface, reflected)).toEqual([]);
  });

  it("[SCN-API-001] holds core's `.` to a surface with something written on both its halves", () => {
    // The anti-vacuity floor under both assertions above. Each compares a reflection against a
    // written list, and an emptied entry would have each of them compare nothing to nothing and
    // pass. These two numbers are read OFF the registry rather than transcribed a fourth time —
    // they are not a further opinion about what the barrel exports, they are what stops a vacuous
    // pass reading like a clean one.
    const surface = coreSurface();

    // 26 → 28 at 3F-2996: the portfolio check-characteristic roster and its membership
    // predicate joined the `.` barrel. They are still on it after 3F-3167 retired the gate that
    // read them here: the words are what a consumer's report rolls up by, and that was always the
    // half a target imports the roster for.
    //
    // 28 → 29 at 3F-3089: `evidenceReconciliationFromSources`, the reconcile composition, joined
    // the `.` barrel — the ONE entry point 3F-2804 sanctions, which is what takes the last
    // `/internal` import off the published path (3F-3086). The types are unchanged: its input is
    // an inline object type, so the surface gains a value and no name.
    expect([surface.values.length, surface.types.length]).toEqual([29, 36]);
  });

  it("[SCN-API-001] retires ScenarioTotals from the actual type surface — the totals are the Scenario Reconciliations'", () => {
    // The manifesto retires "the collection named `scenarios`": the collection is the Scenario
    // Reconciliations, since a scenario is only the real thing. @SCN-RMD-002 made that rename at
    // the top level and 3F-1725 finished it on the summary. This pins the RETIREMENT by name on the
    // actual surface, so the old spelling cannot creep back re-exported.
    expect(coreTypeSurface()).not.toContain("ScenarioTotals");
    expect(coreTypeSurface()).toContain("ScenarioReconciliationTotals");
  });

  it("[SCN-API-001] retires the static-census symbols from the actual surface, keeping StaticCheckTotals", () => {
    // The static evidence-observation census is RETIRED (3F-2119) — its counting folds onto the
    // Ledger, `staticObservationTally`. Its two public symbols are pinned absent BY NAME so neither
    // can creep back re-exported. `StaticCheckTotals` — the materialised headline, now
    // Ledger-fold-sourced — STAYS on the frozen surface, which is why it is named on the other side.
    expect(Object.keys(coreBarrel)).not.toContain("countStaticEvidenceObservationKinds");
    expect(coreTypeSurface()).not.toContain("StaticEvidenceObservationKindCounts");
    expect(coreTypeSurface()).toContain("StaticCheckTotals");
  });

  it("[SCN-API-001] names each frozen symbol exactly once", () => {
    // A name written twice would make the written surface one symbol shorter than it reads, and
    // both comparisons above would go on passing over the shortfall — sets and sorted equality are
    // each blind to it in their own way.
    const surface = coreSurface();

    expect(new Set(surface.values).size).toBe(surface.values.length);
    expect(new Set(surface.types).size).toBe(surface.types.length);
  });
});
