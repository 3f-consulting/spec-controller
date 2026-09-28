import { describe, it, expect } from "vitest";
import { configurationNotRead, resolveDeferralTags, resolveNotChecks, resolveRunners } from "./targetManifest.js";

const base = {
  runners: { unit: "vitest", performance: null },
  notChecks: ["ci.yml:ci:Rule check", "ci.yml:ci:Circular-import check"],
  deferralTags: ["deferred"],
};

const wrongKindsOf = (specController: unknown) =>
  configurationNotRead({ specController } as { specController?: unknown }).wrongKinds;

describe("[SCN-USG-025] a specController entry of a kind its reader does not take is named, with the kind it is and the kind read", () => {
  it.each([
    ["the block", "x", { entry: "specController", is: "a string", reads: "an object" }],
    ["the block", null, { entry: "specController", is: "null", reads: "an object" }],
    ["the block", [base], { entry: "specController", is: "a list", reads: "an object" }],
  ])("names %s given %j", (_, block, named) => {
    expect(wrongKindsOf(block)).toEqual([named]);
  });

  it.each([
    [{ ...base, runners: [1] }, { entry: "specController.runners", is: "a list", reads: "an object" }],
    [{ ...base, runners: true }, { entry: "specController.runners", is: "a boolean", reads: "an object" }],
    [{ ...base, runners: { unit: 5 } }, { entry: "specController.runners.unit", is: "a number", reads: "a string or null" }],
    [{ ...base, runners: { e2e: { a: 1 } } }, { entry: "specController.runners.e2e", is: "an object", reads: "a string or null" }],
    [{ ...base, notChecks: "ci.yml:ci:Rule check" }, { entry: "specController.notChecks", is: "a string", reads: "a list" }],
    [{ ...base, notChecks: ["ok", { a: 1 }] }, { entry: "specController.notChecks[1]", is: "an object", reads: "a string" }],
    [{ ...base, deferralTags: { a: 1 } }, { entry: "specController.deferralTags", is: "an object", reads: "a list" }],
    [{ ...base, deferralTags: [null] }, { entry: "specController.deferralTags[0]", is: "null", reads: "a string" }],
  ])("names the one entry of %j that its reader takes as absent", (block, named) => {
    expect(wrongKindsOf(block)).toEqual([named]);
  });

  it("names every such entry, in the order the manifest wrote them", () => {
    expect(wrongKindsOf({ runners: { unit: 1, e2e: "x" }, notChecks: [2, "ok", 3], deferralTags: "x" })).toEqual([
      { entry: "specController.runners.unit", is: "a number", reads: "a string or null" },
      { entry: "specController.notChecks[0]", is: "a number", reads: "a string" },
      { entry: "specController.notChecks[2]", is: "a number", reads: "a string" },
      { entry: "specController.deferralTags", is: "a string", reads: "a list" },
    ]);
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

  it("names nothing for a manifest with no block", () => {
    expect(configurationNotRead({}).wrongKinds).toEqual([]);
  });
});

describe("[SCN-USG-028] a key the specController block does not read is named, a retired one like any other", () => {
  it("names every key outside the read set, in the order the manifest wrote them", () => {
    expect(
      configurationNotRead({
        specController: { notCheck: ["x"], runners: { unit: "vitest" }, fitnessChecks: [{}], zzz: 1, deferralTags: [] },
      }).unknownKeys,
    ).toEqual(["notCheck", "fitnessChecks", "zzz"]);
  });

  it("names none for a block that holds only the keys it reads", () => {
    expect(configurationNotRead({ specController: base }).unknownKeys).toEqual([]);
  });

  it("names none when there is no block, or the block is not a block", () => {
    expect(configurationNotRead({}).unknownKeys).toEqual([]);
    expect(configurationNotRead({ specController: ["fitnessChecks"] }).unknownKeys).toEqual([]);
  });

  it("an unknown key's value is never named as the wrong kind, whatever it is", () => {
    expect(configurationNotRead({ specController: { fitnessChecks: "x", zzz: null } }).wrongKinds).toEqual([]);
  });
});

describe("[SCN-USG-026] a block whose every entry is a kind its reader takes names nothing as the wrong kind", () => {
  it.each([
    ["a null runner", { runners: { unit: "vitest", e2e: null } }],
    ["an empty notChecks", { notChecks: [] }],
    ["an empty deferralTags", { deferralTags: [] }],
    ["a runners key that is not a tier, given a number", { runners: { lint: 5 } }],
    ["a runners key that is not a tier, given an object", { runners: { lint: { a: 1 } } }],
    ["an empty block", {}],
    ["an empty runners", { runners: {} }],
  ])("names nothing for %s", (_, block) => {
    expect(configurationNotRead({ specController: block }).wrongKinds).toEqual([]);
  });

  it("names nothing for the whole well-formed block", () => {
    expect(configurationNotRead({ specController: base })).toEqual({ wrongKinds: [], unknownKeys: [] });
  });
});
