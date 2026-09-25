import { describe, it, expect } from "vitest";
import { diffLineSightings } from "./readHistory.js";

/** `git log -p` output as it reads with the default format: a commit header and message, then its patch. */
const LOG_WITH_MESSAGE = [
  "commit 0123456789abcdef0123456789abcdef01234567",
  "Author: fixture <fixture@example.invalid>",
  "Date:   Thu Sep 25 12:00:00 2026 +0000",
  "",
  "    Retag the scenario",
  "",
  "    See SCN-ONE-900 for why.",
  "",
  "diff --git a/features/one.feature b/features/one.feature",
  "index 1111111..2222222 100644",
  "--- a/features/one.feature",
  "+++ b/features/one.feature",
  "@@ -4 +4 @@ Feature: part ONE",
  "-  @SCN-ONE-001 @unit",
  "+  @SCN-ONE-001 @unit @smoke",
].join("\n");

describe("[SCN-ALC-015] a code that appears only in a commit message is not retired", () => {
  it("sights the added and removed lines of a patch and nothing else", () => {
    const texts = diffLineSightings(LOG_WITH_MESSAGE).map((sighting) => sighting.text);
    expect(texts).toEqual(["-  @SCN-ONE-001 @unit", "+  @SCN-ONE-001 @unit @smoke"]);
  });

  it("never sights a message line, whatever it mentions", () => {
    const texts = diffLineSightings(LOG_WITH_MESSAGE).map((sighting) => sighting.text);
    expect(texts.some((text) => text.includes("SCN-ONE-900"))).toBe(false);
  });

  it("never sights a file header, even one whose path carries a code", () => {
    const log = ["diff --git a/SCN-ONE-800.md b/SCN-ONE-800.md", "--- a/SCN-ONE-800.md", "+++ b/SCN-ONE-800.md", "@@ -0,0 +1 @@", "+prose"].join("\n");
    expect(diffLineSightings(log).map((sighting) => sighting.text)).toEqual(["+prose"]);
  });
});

describe("[SCN-ALC-005] stderr names where the highest code was seen", () => {
  const log = [
    "\u0001abc1234",
    "",
    "diff --git a/features/one.feature b/features/one.feature",
    "index 1111111..2222222 100644",
    "--- a/features/one.feature",
    "+++ b/features/one.feature",
    "@@ -8,3 +7,0 @@ Feature: part ONE",
    "-  @SCN-ONE-005 @unit",
    "-  Scenario: scenario 2",
    "\u0001def5678",
    "",
    "diff --git a/features/one.feature b/features/one.feature",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/features/one.feature",
    "@@ -0,0 +4,2 @@",
    "+  @SCN-ONE-001 @unit",
    "+  Scenario: scenario 1",
  ].join("\n");

  it("places a removed line at its old line, in the commit that removed it", () => {
    expect(diffLineSightings(log)[0]).toEqual({ text: "-  @SCN-ONE-005 @unit", path: "features/one.feature", line: 8, commit: "abc1234" });
  });

  it("counts on within a hunk", () => {
    expect(diffLineSightings(log)[1]).toMatchObject({ line: 9, commit: "abc1234" });
  });

  it("places an added line at its new line, in the commit that added it", () => {
    expect(diffLineSightings(log)[2]).toEqual({ text: "+  @SCN-ONE-001 @unit", path: "features/one.feature", line: 4, commit: "def5678" });
  });
});

describe("[SCN-ALC-005] stderr names where the highest code was seen — a removed line that looks like a header", () => {
  it("reads a removed line whose own text starts with -- as a removed line, not as a file header", () => {
    const log = [
      "\u0001abc1234",
      "diff --git a/doc/a.sql b/doc/a.sql",
      "--- a/doc/a.sql",
      "+++ b/doc/a.sql",
      "@@ -3 +2,0 @@",
      "--- SCN-ONE-005 retired",
    ].join("\n");
    expect(diffLineSightings(log)).toEqual([{ text: "--- SCN-ONE-005 retired", path: "doc/a.sql", line: 3, commit: "abc1234" }]);
  });
});
