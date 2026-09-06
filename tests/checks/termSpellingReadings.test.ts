/**
 * @unit for @SCN-TRM-002 — there is ONE reading of what a term bare is in this repository's own
 * source, and a second cannot be added without redding.
 *
 * Bidirectional evidence (Evidence Manifesto §9): every describe/it below carries [SCN-TRM-002],
 * matching features/term-spelling.feature. `@unit` alone, as the scenario is tagged: the
 * observation IS a scan over this repository's files, and Vitest proves that whole path — a
 * Cucumber arm would read the same files through a second harness and prove the harness
 * (@SCN-GPG-001's ruling for the same shape).
 *
 * WHY A SCAN AND NOT A FIXED CORRECTION. 3F-2976's finding was never the inverted ordering. It was
 * that a rule this small — what a term looks like once its sigil and its whitespace are off — had
 * been hand-copied SEVEN times, so one defect was seven defects and one correction had to be made
 * seven times. `dry`'s "a rule stated twice is a rule obeyed in its laxest form", with the laxest
 * form being all of them. @SCN-TRM-001 collapsed the seven onto `lib/bareTerm.ts`; without this, an
 * eighth is one paste away and nothing in the repository says so.
 *
 * A SCAN, NOT A LIST, AND THAT IS THE DESIGN. This file holds NO enumeration of the files allowed
 * to carry a reading. A hand-written exception list is the instrument 3F-2960's Ruling 2 barred,
 * and it would be the same fault one level up — a one-mechanism claim resting on a second
 * hand-maintained list. It is why @SCN-TRM-001 repointed the seventh reading (`parse/scenarios.ts`,
 * a copy no whitespace can reach, so never a defect): an exception-free scan is worth more than a
 * copy left alone. Excluding `*.test.ts` is the SCOPE, not an exception — the claim is about this
 * repository's source, a test legitimately spells the pattern as a fixture, and this scan is itself
 * a test.
 *
 * NOTHING IN THIS FILE SPELLS THE PATTERN OUT WHOLE, SO IT CANNOT FIND ITSELF. A scan looking for a
 * spelling has to describe it, and a scan that finds itself is a scan whose only repair is the
 * exception list just barred. Both the needle and every planted fixture are assembled from `SIGIL`
 * at run time, so the sequence being searched for is never among this file's characters — and
 * `*.test.ts` is outside the population as well, which makes that belt AND braces. The property is
 * asserted below rather than merely argued for here.
 *
 * IT DETECTS THE CALL, NOT THE CHARACTERS, which is the other way this could have needed an
 * exception. `lib/bareTerm.ts`'s own doc-comment records the old wrong spelling in prose, to say
 * what the defect was. Comments are stripped before the scan, so a sentence naming a spelling is
 * not a reading of it, and one of the arms below is what says so.
 *
 * THE RESIDUAL, SAID OUT LOUD (and again in the Rule preamble). The population is `.ts`, and
 * @SCN-VOC-022 (3F-2434) has already ruled that a module is source whatever extension carries it —
 * so a reading written into one of the `.mjs` data modules beside these checks is out of reach, as
 * is one spelled without a `.replace(` call at all. This scan reaches what the seven copies were
 * actually spelled as; it does not reach every conceivable eighth.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectRepositorySource,
  collectSourceFiles,
  MIN_REPOSITORY_SOURCE_FILES_SCANNED,
  repositorySourceRoots,
  REQUIRED_FLOOR_HEADROOM,
  type CollectedFile,
} from "./sourceFiles.js";

/** The ONE home this repository's single reading is expected to live in. */
const THE_ONE_READING = "packages/core/src/lib/bareTerm.ts";

/**
 * The sigil, held apart from every pattern and fixture below — this is what keeps the sequence
 * being searched for out of this file's own characters.
 */
const SIGIL = "@";

/**
 * A reading of what a term bare is: a `.replace(` call whose pattern anchors the sigil at the START
 * of the string — the shape all seven copies were spelled in, in either of the two ways a pattern
 * can be written (a regular-expression literal, or one built from a string).
 *
 * ASSEMBLED AT RUN TIME rather than written out whole, for the reason in the header. The escaping
 * is the second half of it: what is written here is `\.replace\(`, and what is sought is
 * `.replace(` — different characters, so even a scan that did include its own source would find
 * nothing here.
 *
 * What it deliberately does NOT match: an unanchored strip of every sigil in a value (a different
 * rule, not a reading of bare), and the whitespace-split token readings that ask `startsWith` and
 * `slice` — their input cannot carry whitespace, they were never part of the defect, and they are
 * not `.replace(` calls.
 */
const READING = new RegExp(
  String.raw`\.replace\(\s*(?:/|new RegExp\(\s*["'\u0060])\^` + SIGIL,
  "g"
);

/**
 * The file's code, with its comments removed — so prose NAMING the old spelling is not counted as a
 * reading of it. `lib/bareTerm.ts`'s doc-comment records it verbatim to say what the defect was, and
 * a character-level scan would be unable to tell that sentence from the code it describes.
 */
function codeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Every reading found, as the path of the file carrying it, one entry per reading — so two readings
 * in one file report that file twice and the count is a count of READINGS, not of files.
 *
 * The paths are the answer, not a by-product: an assertion over this list reds by naming every file
 * that carries a reading, which is what a person seeing it fail needs to know first.
 */
function readingsIn(files: readonly CollectedFile[]): string[] {
  return files.flatMap((file) => [...codeOf(file.source).matchAll(READING)].map(() => file.path));
}

/** A reading, spelled as a regular-expression literal — the spelling all seven copies used. */
const literalReading = `const bare = (v: string) => v.replace(/^${SIGIL}/, "").trim();`;

/** The same reading, spelled as a pattern built from a string. */
const constructedReading = `const bare = (v: string) => v.replace(new RegExp("^${SIGIL}"), "").trim();`;

describe("[SCN-TRM-002] a second reading of what a term bare is cannot be added without redding", () => {
  it("names every file carrying a planted reading, in either spelling a pattern can take", () => {
    // The teeth, over planted sources. A scan that found nothing at all would pass the dogfood arm
    // below trivially — it is green today — so what makes that green mean anything is this: a
    // planted reading is found, and the failure names the file carrying it.
    const planted: CollectedFile[] = [
      { path: "packages/core/src/domain/thresholds.ts", source: literalReading },
      { path: "tests/checks/timeStepCli.ts", source: constructedReading },
    ];
    expect(readingsIn(planted)).toEqual([
      "packages/core/src/domain/thresholds.ts",
      "tests/checks/timeStepCli.ts",
    ]);
  });

  it("counts two readings planted in ONE file as two, so a file is not a unit of amnesty", () => {
    // A count of FILES would let a second reading hide behind the first wherever the first was
    // legitimate — which is exactly the one file this scan expects to find a reading in.
    const planted: CollectedFile[] = [
      { path: THE_ONE_READING, source: `${literalReading}\n${constructedReading}` },
    ];
    expect(readingsIn(planted)).toEqual([THE_ONE_READING, THE_ONE_READING]);
  });

  it("does not mistake PROSE naming the old spelling for a reading of it", () => {
    // The false positive that would have bought an exception list. `lib/bareTerm.ts`'s doc-comment
    // records the wrong spelling to say what the defect WAS. That is a sentence about a reading, not
    // a reading — and a character-level scan cannot tell the two apart, which is why comments go
    // first.
    const prose: CollectedFile[] = [
      {
        path: THE_ONE_READING,
        source: `/**\n * Every port spelled it the same wrong way — value.replace(/^${SIGIL}/, "").trim() — and the\n * anchor is defeated by a leading space.\n */\nexport const bareTerm = (v: string) => v.trim();`,
      },
      {
        // The line-comment form too: a stripper handling only block comments would pass the arm above
        // and still red on the first `//` note somebody writes about the defect.
        path: "packages/core/src/domain/checkRegistry.ts",
        source: `// this used to be value.replace(/^${SIGIL}/, "").trim(), which is 3F-2976\nexport const tag = (v: string) => v.trim();`,
      },
    ];
    expect(readingsIn(prose)).toEqual([]);
  });

  it("does not flag a strip that is a DIFFERENT rule, nor the token readings never in scope", () => {
    // The must-not-move boundary. An unanchored strip of every sigil in a value is not a reading of
    // what a term bare is, and the `startsWith`/`slice` token readings in scnSubIssueGate, scnTags
    // and vocabTagGrammar take a whitespace-split token that cannot carry whitespace — never part of
    // the defect, and a scan sweeping them in would be renaming its own claim.
    const different: CollectedFile[] = [
      {
        path: "packages/core/src/parse/scenarios.ts",
        source: `const flattened = (v: string) => v.replace(/${SIGIL}/g, "-");`,
      },
      {
        path: "tests/checks/vocabTagGrammar.ts",
        source: `const bare = (t: string) => (t.startsWith("${SIGIL}") ? t.slice(1) : t);`,
      },
    ];
    expect(readingsIn(different)).toEqual([]);
  });

  it("carries no reading of its own, though it has to describe the pattern in order to seek one", () => {
    // The property the needle and the fixtures are assembled for. `*.test.ts` is outside the
    // population already, so this is the second lock rather than the first — but it is the one that
    // fails loudly if somebody later "tidies" the assembly into written-out literals, which is the
    // edit that turns this scan into one needing an exception naming itself.
    const ownSource = readFileSync(fileURLToPath(import.meta.url), "utf8");
    expect(readingsIn([{ path: "this-file", source: ownSource }])).toEqual([]);
    // And not because the strip ate it: the raw source carries no reading either.
    expect(new RegExp(READING.source).test(ownSource)).toBe(false);
  });

  it("walks this repository's production source under every package root, tests aside", () => {
    // The pin every assertion below rests on. A scan is worth exactly its population: collect the
    // wrong files and the dogfood green is vacuous and says nothing about it. The roots are DERIVED
    // from the packages directory, so this also pins that the derivation found more than one.
    const roots = repositorySourceRoots();
    expect(roots.length).toBeGreaterThan(1);

    const files = collectRepositorySource();
    expect(files.every((f) => f.path.endsWith(".ts") && !f.path.endsWith(".test.ts"))).toBe(true);
    expect(
      files.every((f) => f.path.startsWith("packages/") || f.path.startsWith("tests/checks/")),
    ).toBe(true);
    // Both kinds of root are really in it — a `src` tree and the `tests/checks` tree beside it —
    // because a walk quietly losing one leaves a whole population unscanned and still green.
    expect(files.some((f) => f.path.startsWith("packages/core/src/"))).toBe(true);
    expect(files.some((f) => f.path.startsWith("packages/spec-controller/src/"))).toBe(true);
    expect(files.some((f) => f.path.startsWith("tests/checks/"))).toBe(true);
    // And it is strictly wider than any single root, so a collector ignoring its argument would fail.
    expect(files.length).toBeGreaterThan(collectSourceFiles(roots[0]!).length);
  });

  it("finds exactly ONE reading in this repository's source, and it is lib/bareTerm.ts", () => {
    // The dogfood green — the claim itself. It reds by naming every file that carries a reading, so
    // an eighth copy pasted anywhere in the source says where it is on the first run.
    const files = collectRepositorySource();
    expect(files.length).toBeGreaterThan(MIN_REPOSITORY_SOURCE_FILES_SCANNED);
    expect(readingsIn(files)).toEqual([THE_ONE_READING]);
  });

  it("keeps real headroom below the tree, so ordinary deletion cannot red this scan", () => {
    // A floor set a file or two under the real count reds the moment a normal refactor removes a
    // file, and the red then CLAIMS a second reading when the truth is "a file was removed"
    // (3F-2201's finding, over the core-src floor). Headroom is the property that matters, and it
    // holds at any tree size.
    expect(
      collectRepositorySource().length - MIN_REPOSITORY_SOURCE_FILES_SCANNED
    ).toBeGreaterThanOrEqual(REQUIRED_FLOOR_HEADROOM);
  });

  it("still rejects an empty walk, because nothing scanned is not a scan", () => {
    // Driven over a REAL empty directory rather than a hand-seeded [] the collector never produces
    // (evidence-manifesto.md §11A) — it exercises the walk, not a fixture. The floor's reason,
    // pinned at the moment it is easiest to loosen into meaninglessness later.
    const emptyDir = mkdtempSync(join(tmpdir(), "trm-empty-walk-"));
    try {
      const scanned = collectSourceFiles(emptyDir);
      expect(scanned).toEqual([]);
      expect(readingsIn(scanned)).toEqual([]);
      expect(scanned.length > MIN_REPOSITORY_SOURCE_FILES_SCANNED).toBe(false);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
