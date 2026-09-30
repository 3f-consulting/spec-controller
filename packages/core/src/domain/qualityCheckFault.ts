/**
 * The QUALITY CHECK FAULT vocabulary — what a refused minting carries
 * INSTEAD of a sentence.
 *
 * Stryker mutates every string literal in the domain, so an invariant that states its refusal as
 * an interpolated template puts its prose on the mutated surface: emptying a template chunk
 * survives every test that does not pin wording, and pinning wording turns a copy-edit red. The
 * cure is to move the question rather than answer it — the throw site names a CODE and carries its
 * parameters as fields, and the prose that renders them lives in a catalogue held as data.
 *
 * THE CODE IS A NUMERIC, IMPLICITLY-VALUED ENUM, AND THAT IS THE WHOLE POINT. A string enum would
 * relocate the mutable prose onto the enum's own values — the survivors would move house rather
 * than leave it. Implicit numbering means there is no literal here for a mutator to reach, so what
 * remains on the mutated surface is exactly the logic worth mutating: WHICH fault is raised, and
 * with WHAT parameters.
 */

import type { Outcome, SidePresence } from "./outcome.js";

/**
 * One member per throw site in `makeQualityCheckReconciliation`.
 *
 * Numeric and implicitly valued deliberately (see the module note). The members are named for the
 * divergence they report, so a reader meets the meaning at the identifier rather than in a table.
 */
export enum QualityCheckFaultCode {
  /** The carried evidence obligation (debit) side disagrees with the outcome's canon row. */
  ObligationSideDivergesFromCanon,
  /** The carried evidence observation (credit) side disagrees with the outcome's canon row. */
  ObservationSideDivergesFromCanon,
}

/**
 * What BOTH divergences carry: the outcome whose canon row was consulted, the side-presence that
 * row REQUIRED, and the side-presence the fields ACTUALLY carried.
 *
 * `required` and `actual` are the two halves of the comparison that failed, so a reader — and an
 * assertion — recovers the whole disagreement from the fault without reading a sentence.
 */
interface SideDivergence {
  readonly outcome: Outcome;
  readonly required: SidePresence;
  readonly actual: SidePresence;
}

/** The debit side diverged: the obligation is carried where canon says None, or absent where it says Exists. */
export interface ObligationSideDivergesFromCanonFault extends SideDivergence {
  readonly code: QualityCheckFaultCode.ObligationSideDivergesFromCanon;
}

/** The credit side diverged: the observation is carried where canon says None, or absent where it says Exists. */
export interface ObservationSideDivergesFromCanonFault extends SideDivergence {
  readonly code: QualityCheckFaultCode.ObservationSideDivergesFromCanon;
}

/**
 * The discriminated union over every fault this concept can raise.
 *
 * Discriminated on `code` so the catalogue can be a mapped type over it: the compiler
 * then refuses both a code with no message and a message reaching for a parameter its fault does
 * not carry. Completeness is not asserted; it is unconstructible otherwise.
 */
export type QualityCheckFault =
  | ObligationSideDivergesFromCanonFault
  | ObservationSideDivergesFromCanonFault;
