import { describe, it, expect } from "vitest";

import { fallbackLayerOf, layersPostedAt } from "./journal.js";

describe("[SCN-LDG-012] an observation of a scenario tagged @integration is posted at integration", () => {
  it.each([
    ["the tag's quality check, not the source's fallback", ["integration", "SCN-LDG-012"], "e2e"],
    ["integration once, when the tag is inherited beside the scenario's own", ["integration", "integration", "SCN-LDG-012"], "e2e"],
    ["integration alone, beside @unit", ["unit", "integration", "SCN-LDG-012"], "unit"],
  ] as const)("is posted at %s", (_title, tagNames, fallback) => {
    expect(layersPostedAt(tagNames, fallback)).toEqual(["integration"]);
  });
});

describe("[SCN-LDG-011] an observation of a scenario tagged @e2e is posted at e2e, whatever its source's fallback", () => {
  it.each(["integration", "unit", "e2e", "performance"] as const)("is posted at e2e when its source's fallback is %s", (fallback) => {
    expect(layersPostedAt(["e2e", "SCN-LDG-011"], fallback)).toEqual(["e2e"]);
  });

  it("is posted at e2e alone, beside @unit", () => {
    expect(layersPostedAt(["unit", "e2e", "SCN-LDG-011"], "integration")).toEqual(["e2e"]);
  });
});

describe("[SCN-LDG-014] an observation of a scenario tagged @integration and @e2e is posted at both", () => {
  it.each([
    ["integration then e2e, in tag order", ["integration", "e2e", "SCN-LDG-014"], ["integration", "e2e"]],
    ["e2e then integration, in tag order", ["e2e", "integration", "SCN-LDG-014"], ["e2e", "integration"]],
    ["each once, when a tag is repeated", ["integration", "e2e", "integration", "e2e", "SCN-LDG-014"], ["integration", "e2e"]],
    ["both alone, beside @unit", ["unit", "integration", "e2e", "SCN-LDG-014"], ["integration", "e2e"]],
  ] as const)("is posted at %s", (_title, tagNames, expected) => {
    expect(layersPostedAt(tagNames, "unit")).toEqual(expected);
  });
});

describe("[SCN-LDG-015] an observation of a scenario carrying no tier tag beyond @unit is posted at its source's fallback", () => {
  it.each(["integration", "e2e", "performance", "unit"] as const)("is posted at its source's fallback, %s, when the scenario is tagged @unit alone", (fallback) => {
    expect(layersPostedAt(["unit", "SCN-LDG-015"], fallback)).toEqual([fallback]);
  });

  it.each([
    ["no tag but its own code", ["SCN-LDG-015"]],
    ["@unit repeated", ["unit", "unit", "SCN-LDG-015"]],
  ] as const)("is posted at its source's fallback alone when it carries %s", (_title, tagNames) => {
    expect(layersPostedAt(tagNames, "integration")).toEqual(["integration"]);
  });
});

describe("[SCN-LDG-045] a report of test results falls back to unit, and a report of scenario runs to integration", () => {
  it.each([
    ["test-results", "unit"],
    ["scenario-runs", "integration"],
  ] as const)("a report of %s falls back to %s", (kind, fallback) => {
    expect(fallbackLayerOf(kind)).toBe(fallback);
  });

  it("gives the two kinds of report different fallbacks", () => {
    expect(fallbackLayerOf("test-results")).not.toBe(fallbackLayerOf("scenario-runs"));
  });
});
