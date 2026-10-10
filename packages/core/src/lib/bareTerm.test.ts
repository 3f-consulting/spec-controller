import { describe, it, expect } from "vitest";

import { citationOfCitedRow } from "../parse/fitnessCitations.js";
import { resolveDeferralTags } from "../parse/targetManifest.js";

describe("[SCN-TRM-001] a configured deferral tag names the term the target authored", () => {
  const configured = (tag: string): readonly string[] =>
    resolveDeferralTags({ specController: { deferralTags: [tag] } }, []);

  it.each([
    ["bares a tag padded in front of its sigil", "  @flaky", "flaky"],
    ["bares a tag spelled with a space between the sigil and the term", "@ flaky", "flaky"],
    ["keeps a doubled sigil exactly as the target spelled it", "  @@flaky", "@flaky"],
    ["keeps an @ inside the term exactly as the target spelled it", "flaky@ci", "flaky@ci"],
    ["bares only the leading sigil of a term with an @ inside it", "  @flaky@ci", "flaky@ci"],
  ] as const)("%s", (_title, tag, term) => {
    expect(configured(tag)).toStrictEqual([term]);
  });

  it("drops a tag that is nothing but whitespace and a sigil", () => {
    expect(configured("  @  ")).toStrictEqual([]);
  });
});

describe("[SCN-TRM-001] a check step's id: names the scenario the target authored", () => {
  it.each([
    ["bares a step's id: padded in front of its sigil", "  @SCN-MSD-001"],
    ["bares a step's id: spelled with a space between the sigil and the term", "@ SCN-MSD-001"],
  ] as const)("%s", (_title, id) => {
    expect(citationOfCitedRow(id)).toStrictEqual({
      scnId: "SCN-MSD-001",
    });
  });

  it.each([
    ["cites nothing for a step's id: that is nothing but whitespace and a sigil", "  @  "],
    [
      "keeps a doubled sigil exactly as the step's id: spelled it, citing no un-doubled scenario",
      "  @@SCN-MSD-001",
    ],
  ] as const)("%s", (_title, id) => {
    expect(citationOfCitedRow(id)).toBeNull();
  });
});
