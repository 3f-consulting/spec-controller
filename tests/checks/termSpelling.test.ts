/**
 * @unit for @SCN-TRM-001 — the term-spelling check, whole: a term names the same pair however its
 * author spaced it around the sigil, and there is exactly ONE reading in this repository of what a
 * term bare IS.
 *
 * ONE CHECK, ONE PLANTED-VIOLATION ARM, ONE REAL-TREE RUN (3F-3218). The two arms below are the
 * whole obligation. The first plants one instance of every violation kind this check detects —
 * every spelling a hand-authored term can carry at each app-side port, and a second reading of bare
 * in either spelling a pattern can take — and asserts ONE verdict over all of them. The second runs
 * the same scan over THIS repository. Sixteen arms across two files became these two, and
 * `@SCN-TRM-002` — the scenario the second file's nine arms were the only evidence for — retired
 * with them (3F-3226).
 *
 * WHY ONE VERDICT AND NOT SIXTEEN ASSERTIONS. Sixteen arms each asserting one property leave the
 * CROSS-PRODUCTS unasserted: a port that bared the padded spelling correctly while ALSO eating an
 * interior @ satisfied both of the two arms that used to cover it, separately. One `expect` over the
 * whole verdict pins the must-move and the must-not-move readings against each other in the same
 * comparison, and pins the order and completeness of what the scan returns as well.
 *
 * WHY THE REAL-TREE ARM IS KEPT (Ruling B, measured not assumed). `package.json`'s
 * `specController.fitnessChecks` carries thirteen rows and NONE of them scans this repository's
 * source for readings; no other gate does either. Drop the second arm and this check never touches
 * the repository again — it would run forever over invented fixtures and report green about a world
 * it had stopped looking at.
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
 * NOTHING IN THIS FILE SPELLS THE PATTERN OUT WHOLE, SO IT CANNOT FIND ITSELF. Both the needle and
 * every planted fixture are assembled from `SIGIL` at run time, so the sequence being searched for
 * is never among this file's characters — and `*.test.ts` is outside the population as well, which
 * makes that belt AND braces. The property is asserted in the second arm rather than merely argued
 * for here.
 *
 * IT DETECTS THE CALL, NOT THE CHARACTERS. `lib/bareTerm.ts`'s own doc-comment records the old wrong
 * spelling in prose, to say what the defect was. Comments are stripped before the scan, so a
 * sentence naming a spelling is not a reading of it, and a column of the first arm says so.
 *
 * THE RESIDUAL, SAID OUT LOUD (and again in the Rule preamble). The population is `.ts`, and 3F-2434
 * already ruled that a module is source whatever extension carries it — so a reading written into
 * one of the `.mjs` data modules beside these checks is out of reach, as is one spelled without a
 * `.replace` call at all. This scan reaches what the seven copies were actually spelled as; it does
 * not reach every conceivable eighth.
 *
 * Bidirectional evidence (Evidence Manifesto §9): both describes carry [SCN-TRM-001], matching
 * features/term-spelling.feature, the @integration arm in tests/steps/termSpelling.steps.ts, and the
 * core-side ports in packages/core/src/lib/bareTerm.test.ts. The core/app split is the package
 * boundary and nothing else — `packages/core` cannot import the app, so a single file could not hold
 * both halves without the dependency cycle the `/internal` seam exists to refuse.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveDeferralTags } from "@3f-consulting/spec-controller-core/internal";
import { DEFAULT_DEFERRAL_TAGS } from "../../packages/spec-controller/src/deferralTags.js";
import { measurementArtefactWith } from "./measurementArtefact.js";
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
const literalReading = `const bare = (v: string) => v.replace(/^${SIGIL}/, "").trim();`;

/** The same reading, spelled as a pattern built from a string. */
const constructedReading = `const bare = (v: string) => v.replace(new RegExp("^${SIGIL}"), "").trim();`;

/** The resolver as the app edge calls it — the starter set is the application layer's (3F-3087). */
const resolveConfigured = (deferralTags: readonly unknown[]): readonly string[] =>
  resolveDeferralTags({ specController: { deferralTags } }, DEFAULT_DEFERRAL_TAGS);

describe("[SCN-TRM-001] every mis-spelling of a hand-authored term, and every second reading of what bare is, planted at once", () => {
  it("names each one, and leaves the spellings that are a different term alone", () => {
    // A REAL empty directory rather than a hand-seeded [] the collector never produces
    // (evidence-manifesto.md §11A) — it exercises the walk, not a fixture. This is the floor's
    // reason, planted at the moment it is easiest to loosen into meaninglessness later.
    const emptyDir = mkdtempSync(join(tmpdir(), "trm-empty-walk-"));
    let emptyWalk: readonly CollectedFile[];
    try {
      emptyWalk = collectSourceFiles(emptyDir, REPOSITORY_ROOT);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }

    expect({
      // THE DEFERRAL PORT WAS THE WORST OF THEM. It stripped with no trim at all, so a tag padded
      // AFTER its term failed as well as one padded in front — and a target whose deferral tag
      // defers nothing gets a scenario raising its full obligations, out of balance for a reason
      // nobody wrote down. Every spelling goes through ONE call, so the must-move readings and the
      // must-not-move ones are compared against each other rather than one at a time.
      deferralTagsTheTargetAuthored: resolveConfigured([
        "  @spike",
        `${SIGIL}manual  `,
        "@ regression",
        "  @  ",
        "  @@spike",
        "  para@llel  ",
      ]).filter((tag) => !DEFAULT_DEFERRAL_TAGS.includes(tag)),

      // THE ARTEFACT PORT IS THE ONE WHOSE MISS POSTS TWICE. A row this reader rejects as different
      // and `parseMeasuredEvidenceObservations` accepts as the same reaches the ledger as two
      // credits for one debit. A step that runs twice owes its bar ONE measurement.
      rowsAfterAPaddedRepost: measurementArtefactWith(
        { scnId: "SCN-MSD-001", checkTag: "ci-run-time", measured: 40 },
        JSON.stringify({
          measurements: [{ scnId: "  @SCN-MSD-001", checkTag: "  @ci-run-time", measured: 96.4 }],
        })
      ).measurements.map((row) => row.measured),
      // The must-not-move side of the same reading: `cucumber@e2e` is not `cucumber`, so the two
      // rows are two rows and the earlier one survives.
      rowsAfterAnInteriorAtRepost: measurementArtefactWith(
        { scnId: "SCN-MSD-001", checkTag: "cucumber", measured: 40 },
        JSON.stringify({
          measurements: [{ scnId: "  @SCN-MSD-001", checkTag: "cucumber@e2e", measured: 96.4 }],
        })
      ).measurements.map((row) => row.measured),

      // The teeth of the scan, over planted sources. A scan that found nothing at all would pass
      // the real-tree arm below trivially — it is green today — so what makes that green mean
      // anything is this: a planted reading is found, and the failure names the file carrying it.
      plantedReadingsNamed: readingsIn([
        { path: "packages/core/src/domain/thresholds.ts", source: literalReading },
        { path: "tests/checks/timeStepCli.ts", source: constructedReading },
      ]),
      // A count of FILES would let a second reading hide behind the first wherever the first was
      // legitimate — which is exactly the one file this scan expects to find a reading in.
      twoPlantedInOneFile: readingsIn([
        { path: THE_ONE_READING, source: `${literalReading}\n${constructedReading}` },
      ]),
      // The false positive that would have bought an exception list, in BOTH comment forms: a
      // stripper handling only block comments passes the first and reds on the first `//` note
      // somebody writes about the defect.
      proseNamingTheOldSpelling: readingsIn([
        {
          path: THE_ONE_READING,
          source: `/**\n * Every port spelled it the same wrong way — ${literalReading} — and the\n * anchor is defeated by a leading space.\n */\nexport const bareTerm = (v: string) => v.trim();`,
        },
        {
          path: "packages/core/src/domain/checkRegistry.ts",
          source: `// this used to be ${constructedReading}, which is 3F-2976\nexport const tag = (v: string) => v.trim();`,
        },
      ]),
      // The must-not-move boundary of the scan. An unanchored strip of every sigil in a value is a
      // DIFFERENT rule, and the `startsWith`/`slice` token readings take a whitespace-split token
      // that cannot carry whitespace — never part of the defect, and a scan sweeping them in would
      // be renaming its own claim.
      aDifferentRuleAndTheTokenReadings: readingsIn([
        {
          path: "packages/core/src/parse/scenarios.ts",
          source: `const flattened = (v: string) => v.replace(/${SIGIL}/g, "-");`,
        },
        {
          path: "tests/checks/scnSubIssueGate.ts",
          source: `const bare = (t: string) => (t.startsWith("${SIGIL}") ? t.slice(1) : t);`,
        },
      ]),
      // Nothing scanned is not a scan: the walk really returns nothing, the scan really finds
      // nothing in it, and the floor really refuses it.
      anEmptyWalk: {
        scanned: [...emptyWalk],
        readings: readingsIn(emptyWalk),
        clearsTheFloor: emptyWalk.length > MIN_REPOSITORY_SOURCE_FILES_SCANNED,
      },
    }).toEqual({
      // Padded in front, padded after the term, spaced inside the sigil — all three name the term
      // the target plainly authored. Whitespace-and-a-sigil names no pair at all and is dropped as
      // an empty entry is. A doubled sigil and an interior @ are kept exactly as spelled: only a
      // LEADING sigil is a sigil, and only whitespace AROUND a term is not part of it.
      deferralTagsTheTargetAuthored: ["spike", "manual", "regression", "@spike", "para@llel"],
      rowsAfterAPaddedRepost: [40],
      rowsAfterAnInteriorAtRepost: [96.4, 40],
      plantedReadingsNamed: [
        "packages/core/src/domain/thresholds.ts",
        "tests/checks/timeStepCli.ts",
      ],
      twoPlantedInOneFile: [THE_ONE_READING, THE_ONE_READING],
      proseNamingTheOldSpelling: [],
      aDifferentRuleAndTheTokenReadings: [],
      anEmptyWalk: { scanned: [], readings: [], clearsTheFloor: false },
    });
  });
});

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
