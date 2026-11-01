import { describe, expect, it } from "vitest";

import type { QualityCheckReconciliation } from "./index.js";

const externallyAssembledQcr = {
  qualityCheckKind: "unit" as const,
  outcome: "satisfied" as const,
};

// @ts-expect-error — a QCR-shaped literal is missing the module-private nominal brand
const _externalMintAttempt: QualityCheckReconciliation = externallyAssembledQcr;

describe("[SCN-API-002] the v1 barrel exposes QualityCheckReconciliation for reading, not construction", () => {
  it("exposes the type for READING — a QCR-shaped literal's fields round-trip through JSON (the phantom brand is omitted)", () => {
    expect(JSON.parse(JSON.stringify(externallyAssembledQcr))).toEqual(externallyAssembledQcr);
    void (_externalMintAttempt as unknown);
  });
});
