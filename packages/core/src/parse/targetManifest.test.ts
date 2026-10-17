import { describe, it, expect } from "vitest";
import { configurationNotRead, resolveDeferralTags, resolveNotChecks, resolveRunners } from "./targetManifest.js";

const base = {
  runners: { unit: "vitest", performance: null },
  notChecks: ["ci.yml:ci:Rule check", "ci.yml:ci:Circular-import check"],
  deferralTags: ["deferred"],
};

const wrongKindsOf = (specController: unknown) =>
  configurationNotRead({ specController } as { specController?: unknown }).wrongKinds;

describe("[SCN-CFG-004] a specController entry of a kind its reader does not take is named, with the kind it is and the kind read", () => {
  it.each([
    ["the block", "x", { entry: "specController", is: "string", reads: "object" }],
    ["the block", null, { entry: "specController", is: "null", reads: "object" }],
    ["the block", [base], { entry: "specController", is: "list", reads: "object" }],
  ])("names %s given %j", (_, block, named) => {
    expect(wrongKindsOf(block)).toEqual([named]);
  });

  it("names exactly what the resolvers read as absent, and they still read the rest", () => {
    const block = { runners: { unit: 5, e2e: "playwright" }, notChecks: ["a", 7], deferralTags: ["x", false] };
    const pkg = { specController: block };
    expect(resolveRunners(pkg).tiers).toEqual({ e2e: "playwright" });
    expect(resolveNotChecks(pkg)).toEqual(["a"]);
    expect(resolveDeferralTags(pkg, [])).toEqual(["x"]);
    expect(wrongKindsOf(block).map(({ entry }) => entry)).toEqual([
      "specController.runners.unit",
      "specController.notChecks[1]",
      "specController.deferralTags[1]",
    ]);
  });

  it("reads a deferralTags entry that is not a list as no configured tags, so the deferral set is exactly the built-in one", () => {
    expect(resolveDeferralTags({ specController: { deferralTags: "x" } }, ["wip"])).toEqual(["wip"]);
  });
});
