import { describe, it, expect } from "vitest";

import { citationOfCitedRow } from "../parse/fitnessCitations.js";
import { resolveDeferralTags } from "../parse/targetManifest.js";
import { parseTaggedScenarios } from "../parse/scenarios.js";

describe("[SCN-TRM-001] a configured deferral tag names the term the target authored", () => {
  const configured = (tag: string): readonly string[] =>
    resolveDeferralTags({ specController: { deferralTags: [tag] } }, []);

  it("bares a tag padded in front of its sigil", () => {
    expect(configured("  @flaky")).toStrictEqual(["flaky"]);
  });

  it("bares a tag spelled with a space between the sigil and the term", () => {
    expect(configured("@ flaky")).toStrictEqual(["flaky"]);
  });

  it("drops a tag that is nothing but whitespace and a sigil", () => {
    expect(configured("  @  ")).toStrictEqual([]);
  });

  it("keeps a doubled sigil exactly as the target spelled it", () => {
    expect(configured("  @@flaky")).toStrictEqual(["@flaky"]);
  });

  it("keeps an @ inside the term exactly as the target spelled it", () => {
    expect(configured("flaky@ci")).toStrictEqual(["flaky@ci"]);
  });

  it("bares only the leading sigil of a term with an @ inside it", () => {
    expect(configured("  @flaky@ci")).toStrictEqual(["flaky@ci"]);
  });
});

describe("[SCN-TRM-001] a check step's id: names the scenario the target authored", () => {
  it("bares a step's id: padded in front of its sigil", () => {
    expect(citationOfCitedRow("  @SCN-MSD-001")).toStrictEqual({
      scnId: "SCN-MSD-001",
    });
  });

  it("bares a step's id: spelled with a space between the sigil and the term", () => {
    expect(citationOfCitedRow("@ SCN-MSD-001")).toStrictEqual({
      scnId: "SCN-MSD-001",
    });
  });

  it("cites nothing for a step's id: that is nothing but whitespace and a sigil", () => {
    expect(citationOfCitedRow("  @  ")).toBeNull();
  });

  it("keeps a doubled sigil exactly as the step's id: spelled it, citing no un-doubled scenario", () => {
    expect(citationOfCitedRow("  @@SCN-MSD-001")).toBeNull();
  });
});

describe("[SCN-TRM-001] the corpus read takes the same reading, though no whitespace can reach it", () => {
  it("bares every tag the Gherkin parser hands it", () => {
    const [scenario] = parseTaggedScenarios(
      `@TRM\nFeature: f\n\n  @unit @SCN-TRM-900\n  Scenario: s\n    Given a step\n`
    );
    expect(scenario?.scnId).toBe("SCN-TRM-900");
    expect(scenario?.tags).toContain("unit");
    expect(scenario?.tags).toContain("TRM");
    expect(scenario?.tags.some((tag) => tag.startsWith("@"))).toBe(false);
  });
});
