/**
 * The `@unit` guard for @SCN-API-001 — the core barrel re-exports exactly the frozen v1 surface.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the `describe` / `it` strings carry the
 * SCN-API-001 id matching features/public-api.feature, so a grep of that id returns both halves of
 * the pair. `@unit`, as the scenario is tagged — this Vitest run IS the observed evidence and no
 * Cucumber block is owed.
 *
 * ONE ARM, AND ITS SUBJECT IS THE REAL BARREL. It runs the reconciliation over `packages/core`'s
 * own barrel and reports the whole verdict in one comparison — the drift each way on each half, the
 * floor that stops a vacuous read passing for a clean one, and the retirements pinned by name. The
 * planted-surface arm beside it went at 3F-3245: its subject was this check's implementation, and
 * an arm authored from an implementation by that implementation's author proves only that the check
 * does what its author wrote, never what the rule requires.
 *
 * WHY THE EVIDENCE MOVED OUT OF `packages/core` AND THE SCENARIO DID NOT. Everything this file
 * asserts, `packages/core/src/index.test.ts` asserted until 3F-2838, over a reflection and a
 * comparison it carried itself. Those are now `publishedSurfaces.ts`'s, shared with @SCN-API-006
 * (and, until 3F-3229, @SCN-API-004 and @SCN-API-005) — and `packages/core` cannot import them. Core is the pure library
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
 * WHAT ELSE READS THIS BARREL, MEASURED AT 3F-3245 RATHER THAN REASONED ABOUT. @SCN-API-004 and
 * @SCN-API-005 — the per-surface scenarios that used to cover it — retired at 3F-3229, so the
 * obvious reading is that this arm now holds the barrel alone. That reading is WRONG, and the plant
 * says so: an export appended to `packages/core/src/index.ts` reds this arm AND @SCN-API-006's next
 * door, because `publishedSurfaces`' real-tree arm reconciles every published subpath's surface and
 * core's `.` is one of them. Two arms, not one. What this file holds that the other does not is the
 * bidirectional handle: @SCN-API-001 is a scenario on the ledger and owes evidence spelled with its
 * own id, and an arm citing another scenario is that scenario's evidence rather than this one's.
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
