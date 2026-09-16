/**
 * The `@unit` + `typecheck` guard for @SCN-API-002 — the v1 barrel exposes
 * QualityCheckReconciliation for READING, not for CONSTRUCTION.
 *
 * Bidirectional evidence: the describe/it below carry the SCN-API-002 id,
 * back-linking to features/public-api.feature's @SCN-API-002 scenario.
 *
 * A SECOND GUARD USED TO LIVE HERE, AND THERE IS NOW NO SUCH GUARD ANYWHERE
 * (3F-3449). It held this barrel to a frozen enumeration this file carried, over
 * a runtime reflection and a compiler-API reading of the type surface it also
 * carried; at 3F-2838 all three moved to `spec-controller`'s check tree with a
 * citing test beside them. Both were deleted at 3F-3449 with the rest of the
 * packaging checks this repository wrote for itself, and NOTHING REPLACES THEM —
 * a symbol added to or dropped from the barrel reds nothing until a generated
 * API report is adopted at 1.0. So do not read this file's green as saying
 * anything about the barrel's SHAPE.
 *
 * WHAT STAYS IS WHAT WAS NEVER ABOUT THE SURFACE'S SHAPE. @SCN-API-002 is not a
 * question about which symbols cross the barrel; it is a question about what a
 * consumer can DO with one of them, and its evidence is the type-checker refusing
 * an assignment. That belongs beside the type it is about.
 */

import { describe, expect, it } from "vitest";

// @SCN-API-002 — the barrel exposes the TYPE for READING the reconciliation the
// engine produced; there is no exported route to CONSTRUCT one (the nominal brand).
import type { QualityCheckReconciliation } from "./index.js";

// -----------------------------------------------------------------------------
// @SCN-API-002 — the v1 barrel exposes QualityCheckReconciliation for READING,
// not CONSTRUCTION. The type is exported (a consumer reads the reconciliation the
// engine minted); no constructor is. The module-private nominal brand
// (domain/qualityCheckReconciliation.ts) makes any externally-assembled
// QCR-shaped literal a COMPILE ERROR — the engine is the only mint.
//
// This is a TYPE-LEVEL guard: its evidence is `tsc --noEmit` (the `typecheck` CI
// step), which type-checks this file. The `@ts-expect-error` below asserts the
// assignment is rejected; if the brand ever stopped blocking external
// construction, the assignment would compile, the `@ts-expect-error` would go
// UNUSED, and `tsc` would red on the now-superfluous directive. TEETH proven by
// mutation (removing the directive reds `tsc`) — captured in this scenario's PR.
//
// Bidirectional back-reference: grepping `@SCN-API-002` returns this test AND the
// features/public-api.feature scenario.
// -----------------------------------------------------------------------------

// A plausible, well-formed QCR-shaped object literal — every FIELD of the
// reconciling item, exactly as the engine's own output carries them — but WITHOUT
// the module-private brand (there is no exported route to it).
const externallyAssembledQcr = {
  qualityCheck: "unit" as const,
  outcome: "satisfied" as const,
};

// @SCN-API-002 — the type-level guard. The barrel exports the type, so an external
// consumer can NAME it, but the nominal brand makes assigning a hand-built literal
// to it a compile error. Removing the directive (or supplying the unforgeable
// brand) reds `tsc --noEmit`.
// @ts-expect-error — a QCR-shaped literal is missing the module-private nominal
// brand; only the engine's makeQualityCheckReconciliation (unexported) can mint one.
const _externalMintAttempt: QualityCheckReconciliation = externallyAssembledQcr;

describe("[SCN-API-002] the v1 barrel exposes QualityCheckReconciliation for reading, not construction", () => {
  it("exposes the type for READING — a QCR-shaped literal's fields round-trip through JSON (the phantom brand is omitted)", () => {
    // The runtime companion to the type-level guard: the brand is a phantom (a
    // Symbol key with no runtime presence), so the engine-produced reconciliation
    // a consumer READS is byte-plain over its fields — JSON.stringify omits the
    // brand, exactly as a v1 consumer serialising a Ledger relies on.
    expect(JSON.parse(JSON.stringify(externallyAssembledQcr))).toEqual(externallyAssembledQcr);
    // The type is genuinely on the barrel's surface — the `import type` at the
    // head of this file is what says so, and it is the only thing that does
    // since 3F-3449. Reading is fully supported; only construction is closed.
    void (_externalMintAttempt as unknown);
  });
});
