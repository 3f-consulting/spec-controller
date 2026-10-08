import { describe, it, expect } from "vitest";
import { balanceCommand, renderCommandHelp } from "./cli-registry.js";
import { DEFAULT_DEFERRAL_TAGS } from "./deferralTags.js";

describe("[SCN-PND-021] balance --help documents specController.deferralTags and the starter set", () => {
  it("documents the specController.deferralTags config field", () => {
    const out = renderCommandHelp(balanceCommand);
    expect(out).toContain("specController.deferralTags");
  });

  it("lists the recognised starter set, single-sourced from DEFAULT_DEFERRAL_TAGS", () => {
    expect(DEFAULT_DEFERRAL_TAGS.length).toBeGreaterThan(0);
    const out = renderCommandHelp(balanceCommand);
    const missing = DEFAULT_DEFERRAL_TAGS.filter((tag) => !out.includes(tag));
    expect(missing).toEqual([]);
  });
});
