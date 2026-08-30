/**
 * @unit for the two FITNESS SUB-DISCRIMINATORS (@SCN-CIP-003) — `isMeasuredObservation` and
 * `isStaticCheckObservation`, the pair that tells the `lint` quality-check's two shapes apart
 * since a measurement joined it.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries @SCN-CIP-003, matching
 * features/ci-run-time.feature, so a grep of the id returns both halves.
 *
 * WHY THE PREDICATES ARE ASKED DIRECTLY RATHER THAN THROUGH A READER. They exist so a reader says
 * which of the two shapes it means instead of inheriting an answer from `qualityCheck === "lint"`,
 * and each reader has already narrowed to the fitness union before it asks — so no reader's own arm
 * can pin what the pair answers OFF that union, which is half of what the pair promises. Measured:
 * with that half unexercised, `isMeasuredObservation` reduced to `"measured" in observation` and
 * `isStaticCheckObservation` to `qualityCheck === "lint"` both passed the whole suite.
 *
 * THE TWO OFF-UNION FIXTURES ARE PUBLISHED-SURFACE SHAPES. `RuntimeEvidenceObservation` names no
 * `measured` field at all, so "a runtime credit carrying a number" is not merely awkward to build
 * from inside — it is unnameable, and a fixture written to the interface could not separate the
 * reduced predicate from the real one. It is nameable from OUTSIDE: the `EvidenceObservation` union
 * is on the frozen v1 barrel, TypeScript's width subtyping admits a richer object through a
 * variable binding with no cast, and a JavaScript consumer is bound by nothing — so the quality-
 * check clause is a published-surface guard, and the fixture states that with an intersection
 * annotation rather than a cast (the @SCN-LNT-001 precedent, 3F-2879).
 */

import { describe, it, expect } from "vitest";

import { isMeasuredObservation, isStaticCheckObservation } from "./journal.js";
import type {
  EvidenceObservation,
  RuntimeEvidenceObservation,
} from "./journal.js";

/** A static-check fact — a fitness credit read from the config, carrying no number. */
const staticCheckCredit: EvidenceObservation = {
  qualityCheck: "lint",
  staticCheck: "lint:complexity",
  exists: true,
  enforcedOverRealSource: true,
};

/** A measurement — a fitness credit whose whole content is the number the wrapper timed. */
const measurement: EvidenceObservation = {
  qualityCheck: "lint",
  scnId: "SCN-MSD-001",
  checkTag: "ci-run-time",
  measured: 42.1,
};

/** A runtime test result — the union's third member, off the `lint` quality-check entirely. */
const runtimeCredit: EvidenceObservation = {
  qualityCheck: "unit",
  scnId: "SCN-MSD-001",
  status: "passed",
};

/** The same runtime result, arriving over the published surface with a number on it too. */
const runtimeCreditCarryingANumber: RuntimeEvidenceObservation & { measured: number } = {
  qualityCheck: "unit",
  scnId: "SCN-MSD-001",
  status: "passed",
  measured: 42.1,
};

describe("[SCN-CIP-003] the fitness sub-discriminators tell the two shapes apart and refuse a runtime credit", () => {
  it("answers a MEASUREMENT to `isMeasuredObservation` alone", () => {
    expect(isMeasuredObservation(measurement)).toBe(true);
    // The complement, stated rather than assumed. Without it `isStaticCheckObservation` reduces to
    // its quality-check clause and reads a measurement for an `exists` and an
    // `enforcedOverRealSource` nobody observed — the fabricated evidence the third union member
    // was added to refuse.
    expect(isStaticCheckObservation(measurement)).toBe(false);
  });

  it("answers a STATIC-CHECK fact to `isStaticCheckObservation` alone", () => {
    expect(isStaticCheckObservation(staticCheckCredit)).toBe(true);
    expect(isMeasuredObservation(staticCheckCredit)).toBe(false);
  });

  it("answers NEITHER for a runtime credit — nothing on the other quality-check is a fitness shape", () => {
    expect(isMeasuredObservation(runtimeCredit)).toBe(false);
    expect(isStaticCheckObservation(runtimeCredit)).toBe(false);
  });

  it("still answers neither when that runtime credit carries a number", () => {
    // The quality-check clause alone. Keyed on the `measured` field and nothing else,
    // `isMeasuredObservation` would call this a measurement and hand a reader a `checkTag` the
    // credit has no obligation to carry — the field IS the difference only WITHIN the fitness
    // union, never across it.
    expect(isMeasuredObservation(runtimeCreditCarryingANumber)).toBe(false);
    expect(isStaticCheckObservation(runtimeCreditCarryingANumber)).toBe(false);
  });
});
