/**
 * The `@unit` guard for @SCN-API-001 — the core barrel re-exports exactly the frozen v1 surface.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `describe` / `it` strings carry the
 * SCN-API-001 id matching features/public-api.feature, so a grep of that id returns both halves of
 * the pair. `@unit`, as the scenario is tagged — this Vitest run IS the observed evidence and no
 * Cucumber block is owed.
 *
 * TWO ARMS, AND WHICH ONE ANSWERS WHICH QUESTION. The first drives a planted surface that has
 * parted company with its barrel in both directions on both halves, and is where this check's teeth
 * are: neuter the reconciliation and it reds while the real barrel is still clean. The second runs
 * that same reconciliation over the real barrel and reports the whole verdict in one comparison —
 * the drift each way on each half, the floor that stops a vacuous read passing for a clean one, and
 * the retirements pinned by name.
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
 * is stated rather than avoided — it was MEASURED at 3F-3227 rather than reasoned about. An export
 * planted on `packages/core/src/index.ts` reds this file's real-tree arm and @SCN-API-004's
 * per-surface arm, and a planted type reds this one and @SCN-API-005's; two arms each time, never
 * one. So the real barrel is not held by this file alone. What would be lost by leaning on those
 * arms instead is the bidirectional handle: @SCN-API-001 is a scenario on the ledger and it owes
 * evidence spelled with its own id, and an arm citing another scenario is that scenario's evidence,
 * not this one's. Those arms hold every published subpath, this one holds the subpath a consumer's
 * v1 contract is; the reconciliation underneath is the same and running it twice costs nothing.
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

/** The specifier the planted surface is written for — no package publishes it, which is the point. */
const PLANTED_SPECIFIER = "@3f-consulting/planted-barrel";

/**
 * The surface written down for core's `.` barrel, raised for rather than looked past.
 *
 * A `find` that answered `undefined` would leave the real-tree arm with nothing to compare against,
 * and the shape it is written in would then pass — the check having lost its subject, reading as
 * the check having found no drift.
 */
function coreSurface(): PublishedSurface {
  const surface = PUBLISHED_SURFACES.find((entry) => specifierOf(entry) === CORE_SPECIFIER);
  if (surface === undefined) {
    throw new Error(`no surface is written down for ${CORE_SPECIFIER}`);
  }

  return surface;
}

describe("[SCN-API-001] the core barrel exports exactly the frozen v1 contract surface", () => {
  it("[SCN-API-001] reports a planted surface parted from its barrel each way on both halves at once", () => {
    // The teeth. Nothing here reads the repository: `reconcile*Surface` take the reflected names as
    // data, so a surface that exists nowhere can carry an instance of every drift this check
    // detects — a symbol exported and not written down, and a symbol written down and not exported,
    // once over the values and once over the types. Neuter the reconciliation and this arm reds
    // while the real barrel is still clean, which is the failure the arm below cannot see.
    const planted: PublishedSurface = {
      package: PLANTED_SPECIFIER,
      subpath: ".",
      barrel: "packages/planted/src/index.ts",
      values: ["writtenValue", "agreedValue"],
      types: ["WrittenType", "AgreedType"],
    };

    expect({
      values: reconcileValueSurface(planted, ["agreedValue", "unwrittenValue"]),
      types: reconcileTypeSurface(planted, ["AgreedType", "UnwrittenType"]),
    }).toEqual({
      values: [
        { specifier: PLANTED_SPECIFIER, kind: "unwritten-export", symbol: "unwrittenValue" },
        { specifier: PLANTED_SPECIFIER, kind: "missing-export", symbol: "writtenValue" },
      ],
      types: [
        { specifier: PLANTED_SPECIFIER, kind: "unwritten-export", symbol: "UnwrittenType" },
        { specifier: PLANTED_SPECIFIER, kind: "missing-export", symbol: "WrittenType" },
      ],
    });
  });

  it("[SCN-API-001] holds the real core barrel to the frozen surface — both halves, both directions", () => {
    const surface = coreSurface();
    const values = Object.keys(coreBarrel);
    // Types are erased, so the runtime namespace cannot see one of these and the compiler is asked
    // instead. Spelling each expected type into a typed literal would red on a type dropped or
    // renamed and stay green on one added, because nothing references what nobody wrote; reading
    // the compiled surface is what closes the add.
    const types = reflectTypeSurface(barrelPathOf(surface));

    expect({
      valueDrift: reconcileValueSurface(surface, values),
      typeDrift: reconcileTypeSurface(surface, types),
      // The anti-vacuity floor. Both reconciliations compare a reflection against a written list,
      // and an emptied entry would have each of them compare nothing to nothing and pass. The two
      // numbers are read OFF the registry rather than transcribed a fourth time — they are not a
      // further opinion about what the barrel exports, they are what stops a vacuous pass reading
      // like a clean one.
      //
      // 26 → 28 at 3F-2996: the portfolio check-characteristic roster and its membership predicate
      // joined the `.` barrel. They are still on it after 3F-3167 retired the gate that read them
      // here: the words are what a consumer's report rolls up by, and that was always the half a
      // target imports the roster for.
      //
      // 28 → 29 at 3F-3089: `evidenceReconciliationFromSources`, the reconcile composition, joined
      // the `.` barrel — the ONE entry point 3F-2804 sanctions, which is what takes the last
      // `/internal` import off the published path (3F-3086). The types are unchanged: its input is
      // an inline object type, so the surface gains a value and no name.
      written: [surface.values.length, surface.types.length],
      // A name written twice would make the written surface one symbol shorter than it reads, and
      // the reconciliations above would go on passing over the shortfall.
      writtenOnce: [new Set(surface.values).size, new Set(surface.types).size],
      // Retirements pinned BY NAME on the actual surface, because an empty drift only says the
      // barrel and the registry agree — it says nothing about a retired spelling creeping back onto
      // both at once. The manifesto retires "the collection named `scenarios`" (@SCN-RMD-002,
      // 3F-1725), and the static evidence-observation census is retired with its counting folded
      // onto the Ledger (3F-2119). `StaticCheckTotals` — the materialised headline, now
      // Ledger-fold-sourced — STAYS, which is why it is named on the other side.
      retired: [
        values.includes("countStaticEvidenceObservationKinds"),
        types.includes("ScenarioTotals"),
        types.includes("StaticEvidenceObservationKindCounts"),
      ],
      kept: [types.includes("ScenarioReconciliationTotals"), types.includes("StaticCheckTotals")],
    }).toEqual({
      valueDrift: [],
      typeDrift: [],
      written: [29, 36],
      writtenOnce: [29, 36],
      retired: [false, false, false],
      kept: [true, true],
    });
  });
});
