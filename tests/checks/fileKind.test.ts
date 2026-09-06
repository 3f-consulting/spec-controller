/**
 * The @unit arm of @SCN-VOC-022 (features/vocabulary-audit.feature) — a module is read as
 * source whatever extension carries it.
 *
 * The arm exercises `scanFile` rather than `classifyPath` on purpose. The kind is an internal
 * step; what the Rule promises is that the SEGMENTS come out the same, and asserting the kind
 * would green a predicate that answered correctly while the engine went on segmenting prose.
 */

import { describe, it, expect } from "vitest";
import { scanFile, type Segment } from "./vocabAudit.js";

/**
 * One text carrying all three region shapes a code file has — an identifier, a comment, and a
 * string. `supply` is the retired evidence word, so each region yields a flagged row and the
 * comparison has something to compare; an all-approved text would let two empty segment lists
 * match and prove nothing.
 */
const SOURCE = [
  "// the comment mentions supply",
  "export function buildSupply(): string {",
  '  return "supply";',
  "}",
  "",
].join("\n");

/**
 * The extensions THIS TREE CARRIES. `.cts`, `.cjs` and `.js` are reached by the same predicate
 * — it is stated by kind, not as a list — but the tree holds no `.cts` or `.cjs`, and the
 * operator ruling for this slice was to exercise what exists rather than manufacture a fixture
 * whose only purpose is to make the list look complete. The Rule preamble names the gap.
 */
const MODULE_PATHS = ["src/buildSupply.ts", "src/buildSupply.d.mts", "src/buildSupply.mjs"];

/**
 * The comparable part of a segment: everything except which file it came from.
 *
 * The filename segment is dropped, not normalised. `buildSupply.d.mts` and `buildSupply.ts`
 * genuinely ARE different filenames, so their filename segments genuinely differ — folding
 * that away would be hiding a real difference rather than measuring the one under test.
 */
const judged = (segs: Segment[]) =>
  segs
    .filter((s) => s.surface !== "filenames")
    .map((s) => ({ surface: s.surface, line: s.line, mode: s.mode, text: s.text }));

describe("[SCN-VOC-022] a module is read as source whatever extension carries it", () => {
  it("judges the same source identically under every module extension the tree carries", () => {
    const [first, ...rest] = MODULE_PATHS.map((p) => judged(scanFile(p, SOURCE)));
    for (const other of rest) expect(other).toEqual(first);
  });

  it("judges a module as code — identifiers segmented, comments and strings on their own surfaces", () => {
    for (const path of MODULE_PATHS) {
      const segs = judged(scanFile(path, SOURCE));
      expect(segs.some((s) => s.surface === "code-identifiers" && s.mode === "name" && s.text === "buildSupply")).toBe(true);
      expect(segs.some((s) => s.surface === "comments")).toBe(true);
      expect(segs.some((s) => s.surface === "code-strings")).toBe(true);
      // The half that fails today: a module must contribute NOTHING to the docs surface.
      expect(segs.filter((s) => s.surface === "docs")).toEqual([]);
    }
  });

  it("still reads a prose file as prose, one segment per non-blank line", () => {
    // The other direction. Without it a predicate answering "source" for every path would
    // satisfy the assertions above — the mirror of the defect, and no better.
    const segs = judged(scanFile("doc/notes.md", SOURCE));
    expect(segs.every((s) => s.surface === "docs" && s.mode === "prose")).toBe(true);
    expect(segs).toHaveLength(SOURCE.split("\n").filter((l) => l.trim() !== "").length);
  });
});
