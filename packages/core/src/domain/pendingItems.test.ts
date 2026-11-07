import { describe, it, expect } from "vitest";
import { BUILT_IN_DEFERRAL_TAGS, deferralTagsExtendedBy } from "./pendingItems.js";

describe("[CLM-PND-021] a configured deferral tag extends the built-in deferral set", () => {
  it("unions a project-configured tag with the built-in set — the configured tag is recognised", () => {
    const resolved = deferralTagsExtendedBy(BUILT_IN_DEFERRAL_TAGS, ["deferred"]);
    expect(resolved).toContain("deferred");
    for (const builtin of BUILT_IN_DEFERRAL_TAGS) {
      expect(resolved).toContain(builtin);
    }
  });

  it("is exactly the built-in set when no tag is configured", () => {
    expect(new Set(deferralTagsExtendedBy(BUILT_IN_DEFERRAL_TAGS, []))).toEqual(new Set(BUILT_IN_DEFERRAL_TAGS));
  });
});
