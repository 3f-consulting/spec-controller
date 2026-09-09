/**
 * @unit for @SCN-TRM-001 — the term-spelling check, whole: a term names the same pair however its
 * author spaced it around the sigil, and there is exactly ONE reading in this repository of what a
 * term bare IS.
 *
 * ONE ARM, AND ITS SUBJECT IS THIS REPOSITORY'S SOURCE. It scans the whole population for readings
 * of what a term bare is and asserts one verdict over it. The planted-violation arm beside it went
 * at 3F-3245: its subject was this check's own implementation, authored from that implementation by
 * its author, so its green proved the check does what its author wrote rather than what the rule
 * requires — one author keeping both books.
 *
 * WHY THE REAL-TREE ARM IS KEPT (Ruling B, measured not assumed). `package.json`'s
 * `specController.fitnessChecks` carries twelve rows and NONE of them scans this repository's
 * source for readings; no other gate does either. Drop this arm and the check stops running
 * altogether — which is why it is the check rather than a second opinion about one.
 *
 * WHY A SCAN AND NOT A FIXED CORRECTION. 3F-2976's finding was never the inverted ordering. It was
 * that a rule this small — what a term looks like once its sigil and its whitespace are off — had
 * been hand-copied SEVEN times, so one defect was seven defects and one correction had to be made
 * seven times. `dry`'s "a rule stated twice is a rule obeyed in its laxest form", with the laxest
 * form being all of them. The seven were collapsed onto `lib/bareTerm.ts`; without the scan, an
 * eighth is one paste away and nothing in the repository says so.
 *
 * A SCAN, NOT A LIST, AND THAT IS THE DESIGN. This file holds NO enumeration of the files allowed
 * to carry a reading. A hand-written exception list is the instrument 3F-2960's Ruling 2 barred, and
 * it would be the same fault one level up. Excluding `*.test.ts` is the SCOPE, not an exception —
 * the claim is about this repository's source, a test legitimately spells the pattern as a fixture,
 * and this scan is itself a test.
 *
 * NOTHING IN THIS FILE SPELLS THE PATTERN OUT WHOLE, SO IT CANNOT FIND ITSELF. The needle is
 * assembled from `SIGIL` at run time, so the sequence being searched for is never among this file's
 * characters — and `*.test.ts` is outside the population as well, which makes that belt AND braces.
 * The property is asserted by the arm below rather than merely argued for here.
 *
 * IT DETECTS THE CALL, NOT THE CHARACTERS. `lib/bareTerm.ts`'s own doc-comment records the old wrong
 * spelling in prose, to say what the defect was. Comments are stripped before the scan, so a
 * sentence naming a spelling is not a reading of it.
 *
 * THE RESIDUAL, SAID OUT LOUD (and again in the Rule preamble). The population is `.ts`, and 3F-2434
 * already ruled that a module is source whatever extension carries it — so a reading written into
 * one of the `.mjs` data modules beside these checks is out of reach, as is one spelled without a
 * `.replace` call at all. This scan reaches what the seven copies were actually spelled as; it does
 * not reach every conceivable eighth.
 *
 * Bidirectional evidence (Evidence Manifesto §9): the describe carries [SCN-TRM-001], matching
 * features/term-spelling.feature, the @integration arm in tests/steps/termSpelling.steps.ts, and the
 * core-side ports in packages/core/src/lib/bareTerm.test.ts. The core/app split is the package
 * boundary and nothing else — `packages/core` cannot import the app, so a single file could not hold
 * both halves without the dependency cycle the `/internal` seam exists to refuse.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {} from "node:os";
import {} from "node:path";
import { fileURLToPath } from "node:url";

import {} from "@3f-consulting/spec-controller-core/internal";
import {} from "../../packages/spec-controller/src/deferralTags.js";
import {} from "./measurementArtefact.js";
import {
  collectRepositorySource,
  collectSourceFiles,
  MIN_REPOSITORY_SOURCE_FILES_SCANNED,
  repositorySourceRoots,
  REQUIRED_FLOOR_HEADROOM,
  resolveRepositoryRoot,
  type CollectedFile,
} from "./sourceFiles.js";

/**
 * The repository this scan is asked about, resolved ONCE and passed down (3F-3207). The enumerator
 * no longer inherits it from wherever the process is standing, so the subject is stated here rather
 * than at each of the calls below.
 */
const REPOSITORY_ROOT = resolveRepositoryRoot();

/** The ONE home this repository's single reading is expected to live in. */
const THE_ONE_READING = "packages/core/src/lib/bareTerm.ts";

/**
 * The sigil, held apart from every pattern and fixture below — this is what keeps the sequence being
 * searched for out of this file's own characters.
 */
const SIGIL = "@";

/**
 * A reading of what a term bare is: a replace call whose pattern anchors the sigil at the START of
 * the string — the shape all seven copies were spelled in, in either of the two ways a pattern can
 * be written (a regular-expression literal, or one built from a string).
 *
 * ASSEMBLED AT RUN TIME rather than written out whole, for the reason in the header. The escaping is
 * the second half of it: what is written here is escaped, and what is sought is not — different
 * characters, so even a scan that did include its own source would find nothing here.
 *
 * What it deliberately does NOT match: an unanchored strip of every sigil in a value (a different
 * rule, not a reading of bare), and the whitespace-split token readings that ask `startsWith` and
 * `slice` — their input cannot carry whitespace, they were never part of the defect, and they are
 * not replace calls.
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

/** The same reading, spelled as a pattern built from a string. */

/** The resolver as the app edge calls it — the starter set is the application layer's (3F-3087). */

describe("[SCN-TRM-001] the same scan, over THIS repository", () => {
  it("finds one reading of what a term bare is, in the file that owns it, over a population wide enough to mean it", () => {
    // A scan is worth exactly its population: collect the wrong files and the dogfood green is
    // vacuous and says nothing at all. The roots are DERIVED from the packages directory, so the
    // derivation finding more than one is pinned here too — a walk quietly losing a root leaves a
    // whole population unscanned and still green.
    const roots = repositorySourceRoots(REPOSITORY_ROOT);
    const files = collectRepositorySource(REPOSITORY_ROOT);
    const ownSource = readFileSync(fileURLToPath(import.meta.url), "utf8");

    expect({
      rootsAreDerivedAndThereIsMoreThanOne: roots.length > 1,
      everyFileIsSourceAndNotATest: files.every(
        (file) => file.path.endsWith(".ts") && !file.path.endsWith(".test.ts")
      ),
      everyFileIsUnderARootThisScanClaims: files.every(
        (file) => file.path.startsWith("packages/") || file.path.startsWith("tests/checks/")
      ),
      bothKindsOfRootAreReallyInIt: [
        files.some((file) => file.path.startsWith("packages/core/src/")),
        files.some((file) => file.path.startsWith("packages/spec-controller/src/")),
        files.some((file) => file.path.startsWith("tests/checks/")),
      ],
      widerThanAnySingleRoot: files.length > collectSourceFiles(roots[0]!, REPOSITORY_ROOT).length,
      // A floor set a file or two under the real count reds the moment a normal refactor removes a
      // file, and the red then CLAIMS a second reading when the truth is "a file was removed"
      // (3F-2201's finding). Headroom is the property that matters, and it holds at any tree size.
      clearsTheFloorWithRealHeadroom:
        files.length - MIN_REPOSITORY_SOURCE_FILES_SCANNED >= REQUIRED_FLOOR_HEADROOM,
      // The claim itself. It reds by naming every file that carries a reading, so an eighth copy
      // pasted anywhere in the source says where it is on the first run.
      theReadingsThisRepositoryCarries: readingsIn(files),
      // And this scan carries none of its own, though it has to describe the pattern in order to
      // seek one. `*.test.ts` is outside the population already, so this is the second lock rather
      // than the first — but it is the one that fails loudly if somebody later "tidies" the
      // assembly into written-out literals, the edit that turns this scan into one needing an
      // exception naming itself. The raw source is checked as well as the stripped code, so a
      // reading cannot hide behind the comment stripper having eaten it.
      thisScanCarriesNoReadingOfItsOwn: [
        readingsIn([{ path: "this-file", source: ownSource }]),
        new RegExp(READING.source).test(ownSource),
      ],
    }).toEqual({
      rootsAreDerivedAndThereIsMoreThanOne: true,
      everyFileIsSourceAndNotATest: true,
      everyFileIsUnderARootThisScanClaims: true,
      bothKindsOfRootAreReallyInIt: [true, true, true],
      widerThanAnySingleRoot: true,
      clearsTheFloorWithRealHeadroom: true,
      theReadingsThisRepositoryCarries: [THE_ONE_READING],
      thisScanCarriesNoReadingOfItsOwn: [[], false],
    });
  });
});
