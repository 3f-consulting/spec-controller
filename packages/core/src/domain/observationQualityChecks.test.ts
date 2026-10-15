import { describe, it, expect } from "vitest";

import { qualityChecksPostedAt } from "./journal.js";

describe("[SCN-LDG-012] an observation of a scenario tagged @integration is posted at integration", () => {
  it.each([
    ["the tag's quality check, not the source's fallback", ["@integration", "@SCN-LDG-012"], "e2e"],
    ["integration once, when the tag is inherited beside the scenario's own", ["@integration", "@integration", "@SCN-LDG-012"], "e2e"],
    ["integration alone, beside @unit", ["@unit", "@integration", "@SCN-LDG-012"], "unit"],
    ["integration, from a tag name given without its @", ["integration", "SCN-LDG-012"], "unit"],
  ] as const)("is posted at %s", (_title, tagNames, fallback) => {
    expect(qualityChecksPostedAt(tagNames, fallback)).toEqual(["integration"]);
  });
});

describe("[SCN-LDG-011] an observation of a scenario tagged @e2e is posted at e2e, whatever its source's fallback", () => {
  it.each(["integration", "unit", "e2e", "performance"] as const)("is posted at e2e when its source's fallback is %s", (fallback) => {
    expect(qualityChecksPostedAt(["@e2e", "@SCN-LDG-011"], fallback)).toEqual(["e2e"]);
  });

  it("is posted at e2e alone, beside @unit", () => {
    expect(qualityChecksPostedAt(["@unit", "@e2e", "@SCN-LDG-011"], "integration")).toEqual(["e2e"]);
  });
});

describe("[SCN-LDG-014] an observation of a scenario tagged @integration and @e2e is posted at both", () => {
  it.each([
    ["integration then e2e, in tag order", ["@integration", "@e2e", "@SCN-LDG-014"], ["integration", "e2e"]],
    ["e2e then integration, in tag order", ["@e2e", "@integration", "@SCN-LDG-014"], ["e2e", "integration"]],
    ["each once, when a tag is repeated", ["@integration", "@e2e", "@integration", "@e2e", "@SCN-LDG-014"], ["integration", "e2e"]],
    ["both alone, beside @unit", ["@unit", "@integration", "@e2e", "@SCN-LDG-014"], ["integration", "e2e"]],
  ] as const)("is posted at %s", (_title, tagNames, expected) => {
    expect(qualityChecksPostedAt(tagNames, "unit")).toEqual(expected);
  });
});

describe("[SCN-LDG-015] an observation of a scenario carrying no tier tag beyond @unit is posted at its source's fallback", () => {
  it.each(["integration", "e2e", "performance", "unit"] as const)("is posted at its source's fallback, %s, when the scenario is tagged @unit alone", (fallback) => {
    expect(qualityChecksPostedAt(["@unit", "@SCN-LDG-015"], fallback)).toEqual([fallback]);
  });

  it.each([
    ["no tag but its own code", ["@SCN-LDG-015"]],
    ["@unit given without its @", ["unit", "SCN-LDG-015"]],
    ["@unit repeated", ["@unit", "@unit", "@SCN-LDG-015"]],
  ] as const)("is posted at its source's fallback alone when it carries %s", (_title, tagNames) => {
    expect(qualityChecksPostedAt(tagNames, "integration")).toEqual(["integration"]);
  });
});
