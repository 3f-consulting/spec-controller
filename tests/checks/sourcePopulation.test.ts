/**
 * Unit tests for the source enumerator's SUBJECT and its POPULATION — the standing regression
 * guards for 3F-3207, across the two Rules of features/source-population.feature.
 *
 * THREE ARMS, ONE PER SCENARIO. @SCN-SRC-001 (the subject: a check scans the tree it was asked
 * about, not the instrumented copy beside it) and @SCN-SRC-002 (the ladder that resolves
 * the subject when nobody stated it) sit under the first Rule; @SCN-SRC-003 (which files the walk
 * admits) sits under the second. They share this file because they share a fixture vocabulary —
 * a real temporary tree named as a subject — not because they are one claim.
 *
 * Bidirectional evidence (Evidence Manifesto §9 / the discipline): each describe string carries
 * its own @SCN id matching features/source-population.feature, so a grep of any of the three ids
 * returns both halves of that pair. `@unit`-only — Cucumber skips them; these Vitest tests ARE the
 * observed evidence.
 *
 * WHAT IT REPRODUCES. Stryker copies the tree into an instrumented sandbox and runs the suite from
 * inside it, prepending its own preamble to every file it mutates. That preamble names the
 * `process` global, which is exactly what the engine-purity guard forbids under
 * `packages/core/src` — so a guard that inherited its population from the working directory
 * scanned the copy and reported the runner's scaffolding as engine code. Eleven io-global
 * violations, and the mutation run died in its dry run before a single mutant was tested. The
 * fault is here as a unit arm, so no Stryker run is needed to keep it closed.
 *
 * THE TREE IS REAL, NOT HAND-SEEDED (evidence-manifesto.md §11A). A `CollectedFile[]` typed out by
 * hand would prove something about `checkEnginePurity` and nothing at all about the walk — and the
 * walk is the whole subject. So the engine's source is COPIED to a temporary directory, the
 * preamble is written into files on disk, and the collector is asked to find them.
 *
 * BOTH DIRECTIONS, OR THE ARM IS VACUOUS. Asked about the repository it must report the engine
 * clean; asked about the COPY, at the same moment and by the same collector, it must report the
 * injected references. A checker that always answered `[]` would satisfy the first alone, so the
 * second is what makes the first mean anything — and an enumerator that ignored its argument would
 * answer about the repository twice and fail the second, which is the arm's teeth, proven by plant.
 *
 * NOTHING HERE DETECTS A SANDBOX, AND THAT IS THE DESIGN RATHER THAN AN OMISSION (3F-3207,
 * non-negotiable 1). The `__stryker__` token below is FIXTURE TEXT — a string this test writes into
 * a temporary file so the collector has something to find. No code in this repository reads it,
 * probes for it, or branches on it, and `enginePurity.ts` is untouched: the checker was never
 * confused about `process`, it was handed the wrong tree.
 *
 * Parents: 3F-3215 (@SCN-SRC-001), 3F-3216 (@SCN-SRC-002) and 3F-3217 (@SCN-SRC-003), all under
 * 3F-3207. The paragraphs above describe the first arm; the second and third carry their own.
 */

import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { checkEnginePurity } from "./enginePurity.js";
import { collectSourceFiles, coreSrcRoot, resolveRepositoryRoot } from "./sourceFiles.js";

/**
 * The repository this arm is about, resolved ONCE and passed down (3F-3207) — the same shape, and
 * now through the same resolver, as the four guard tests beside it.
 *
 * IT TOOK `process.cwd()` UNTIL 3F-3216 FINISHED ITS SWEEP, AND THAT WAS THE FAULT THIS FILE EXISTS
 * TO CLOSE, INHERITED. The four consumer arms were swapped to `resolveRepositoryRoot()` while this
 * one was left on the working directory because the design listed four consumers and this file did
 * not yet exist when that list was written — a stale-list reason, not a keeper reason. Measured
 * inside a real instrumented sandbox with `SPEC_CONTROLLER_SOURCE_ROOT` set exactly as the
 * `mutation` script sets it: this arm resolved to the SANDBOX and `checkEnginePurity` returned
 * ELEVEN io-global violations against the assertion below, while the four guards, reading the
 * variable, resolved to the real repository and returned none. The same eleven, from a different
 * file — 3F-3207's acceptance item 5 would have been unmet with the slice reporting itself done.
 *
 * On an ordinary run — where no variable is set — it names the repository the process is standing
 * in, exactly as it did before.
 */
const REPOSITORY_ROOT = resolveRepositoryRoot();

/**
 * The preamble a mutation runner injects into every file it instruments, copied from a real
 * Stryker sandbox (3F-3207).
 *
 * FIXTURE TEXT, WRITTEN AND NEVER READ. It exists to be found by a walk over a temporary tree —
 * `g.process.env` is what the engine-purity guard's io-global arm refuses, and it is the whole
 * reason a check standing in a sandbox reported the engine impure. It is deliberately NOT parsed,
 * matched or stripped anywhere in this repository (non-negotiable 2): recognising the instrument
 * would be coping with the wrong tree instead of naming the right one.
 */
const MUTATION_RUNNER_PREAMBLE = [
  "var ns = g.__stryker__ || (g.__stryker__ = {});",
  "if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {",
  "}",
].join("\n");

/** How many copied files carry the preamble — enough to be a set, few enough to leave clean ones beside them. */
const INSTRUMENTED_FILE_COUNT = 3;

/**
 * NOTHING IN THIS FILE CHANGES THE WORKING DIRECTORY, AND THAT IS A REQUIREMENT RATHER THAN A
 * PREFERENCE (3F-3207).
 *
 * The first draft of these arms staged the standing position with `process.chdir` — the fault
 * dramatised. It cost the slice its own acceptance. `process.chdir()` THROWS in a worker thread,
 * and a mutation runner runs the suite in worker threads, so all three arms died with
 * `process.chdir() is not supported in workers` the moment `tests/checks/**` entered the run —
 * the same dry-run death this slice exists to remove, from a different cause, in the file written
 * to prove it fixed.
 *
 * It bought nothing, which is why removing it costs nothing. Measured by plant: with the walk
 * reverted to read the working directory, the arm below reds on its COPY branch with no `chdir`
 * anywhere. That branch is the teeth — an enumerator ignoring its argument answers about the
 * repository twice and reports no violations where the injected ones were expected. Staging a
 * standing position could only ever have added drama to a subject that is now stated outright.
 */
const temporaryRoots: string[] = [];

afterEach(() => {
  // A temporary tree left behind is a tree the next reader has to wonder about.
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * A copy of the engine's source at `<copy>/packages/core/src`, with the mutation runner's preamble
 * prepended to the first few files the collector finds — the sandbox reproduced, minus the runner.
 *
 * The copy is laid out as a REPOSITORY rather than as a bare directory, because that is what the
 * enumerator takes: `coreSrcRoot(root)` derives the engine's source root from a repository root,
 * and a fixture shaped any other way would be answering an easier question than the real one.
 */
function instrumentedCopyOfTheEngine(): { root: string; instrumented: string[] } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-sandbox-")));
  temporaryRoots.push(root);
  cpSync(coreSrcRoot(REPOSITORY_ROOT), coreSrcRoot(root), { recursive: true });

  const instrumented = collectSourceFiles(coreSrcRoot(root), root)
    .slice(0, INSTRUMENTED_FILE_COUNT)
    .map((file) => file.path);
  for (const path of instrumented) {
    const absolute = join(root, path);
    writeFileSync(absolute, `${MUTATION_RUNNER_PREAMBLE}\n${readFileSync(absolute, "utf8")}`);
  }
  return { root, instrumented };
}

describe("[SCN-SRC-001] a check scans the tree it was asked about, not the instrumented copy beside it", () => {
  it("reports the engine clean about the REPOSITORY, and the injected references about the COPY", () => {
    const { root: copyRoot, instrumented } = instrumentedCopyOfTheEngine();
    expect(instrumented).toHaveLength(INSTRUMENTED_FILE_COUNT);

    // Asked about the REPOSITORY: the copy is not what it was asked about, so the engine is clean.
    const aboutTheRepository = collectSourceFiles(coreSrcRoot(REPOSITORY_ROOT), REPOSITORY_ROOT);
    expect(checkEnginePurity(aboutTheRepository)).toEqual([]);

    // Asked about the COPY, from the same standing position and by the same collector: the
    // injected references, one per instrumented file and none from the files beside them. Without
    // this half a checker that always answered `[]` would satisfy the assertion above.
    const aboutTheCopy = collectSourceFiles(coreSrcRoot(copyRoot), copyRoot);
    expect(aboutTheCopy).toHaveLength(aboutTheRepository.length);
    expect(checkEnginePurity(aboutTheCopy)).toEqual(
      instrumented.map((path) => ({ path, kind: "io-global", detail: "process" })),
    );
  });
});

/**
 * The one named place ambience is resolved (@SCN-SRC-002) — 3F-3216, under 3F-3207.
 *
 * MODELLED ON `resolveEvidenceRoot` IN `measurementArtefact.ts`, BY CITATION RATHER THAN BY
 * REINVENTION. 3F-3099 settled this ladder for the evidence path — an argument the caller passed
 * beats the environment it happens to be standing in, and an empty variable is an absent one — and
 * it settled it from a measurement, not a preference. A second structurally-identical resolver
 * reasoned out independently here would agree with that one by COINCIDENCE, which is the shape
 * this repository keeps removing. The assertions below are the same ladder asked about the SOURCE
 * path.
 *
 * WHY THE "NEITHER" CASE IS ASKED ABOUT SOMEWHERE ELSE. Asserting the working-directory rung with
 * the repository's own root would be satisfied just as well by a resolver that returned that root
 * from a constant, so the arm asks about a temporary directory instead. The rung has to be observed
 * MOVING to be observed at all.
 *
 * IT IS INJECTED, NOT WALKED INTO, AND THAT IS 3F-3207'S OWN ACCEPTANCE TALKING. `process.chdir`
 * throws in a worker thread; a mutation runner uses worker threads; so an arm that moved the
 * process could not run under the runner this slice exists to unblock. Measured — all three arms
 * here died with `process.chdir() is not supported in workers`. The working directory is therefore
 * a parameter with an ambient default, exactly as `env` already was, and the arm pins that default
 * to the live `process.cwd()` so the injection is testing the rung production takes.
 *
 * WHY EMPTY-IS-ABSENT IS ASSERTED AT EVERY RUNG AND NOT ONLY AT ONE. `??` would pass a variable
 * that resolved to nothing straight on, and an empty root is not an obvious failure: it joins into
 * `packages/core/src`, a RELATIVE path, which readdir resolves back against the working directory —
 * so a check handed nothing would quietly scan the tree it was standing in and report about it
 * confidently. That is the defect this whole slice closes, arriving through the door meant to fix it.
 */
describe("[SCN-SRC-002] a named root beats the environment, and the environment beats the working directory", () => {
  it("resolves named over environment over working directory, and treats an empty variable as absent at every rung", () => {
    const named = join(REPOSITORY_ROOT, "named-by-the-caller");
    const fromEnvironment = join(REPOSITORY_ROOT, "named-by-the-environment");

    // Rung 1 — the caller stated the subject, so the environment does not get a say.
    expect(resolveRepositoryRoot(named, { SPEC_CONTROLLER_SOURCE_ROOT: fromEnvironment })).toBe(named);

    // Rung 2 — no caller named one, so the environment's answer is taken.
    expect(resolveRepositoryRoot(undefined, { SPEC_CONTROLLER_SOURCE_ROOT: fromEnvironment })).toBe(
      fromEnvironment,
    );

    // Rung 3 — neither, so the ordinary case: wherever the process is standing. The directory is
    // INJECTED rather than moved to: `process.chdir` throws in a worker thread, so an arm that
    // moved the process could not run under a mutation runner at all. It is a real directory the
    // repository demonstrably is not, so the rung is observed MOVING — asked with the repository's
    // own root it would also be satisfied by a resolver that never looked.
    const elsewhere = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-elsewhere-")));
    temporaryRoots.push(elsewhere);
    expect(elsewhere).not.toBe(REPOSITORY_ROOT);
    expect(resolveRepositoryRoot(undefined, {}, elsewhere)).toBe(elsewhere);

    // And the DEFAULT of that parameter is the live working directory, so the injection above is
    // testing the same rung production takes rather than a seam beside it.
    expect(resolveRepositoryRoot(undefined, {})).toBe(process.cwd());

    // Empty is absent, at every rung — a variable that resolved to nothing arrives as "", and
    // taken literally it would win as an empty path and every root below it would come out
    // relative to the working tree.
    expect(resolveRepositoryRoot("", { SPEC_CONTROLLER_SOURCE_ROOT: fromEnvironment })).toBe(
      fromEnvironment,
    );
    expect(resolveRepositoryRoot(undefined, { SPEC_CONTROLLER_SOURCE_ROOT: "" }, elsewhere)).toBe(
      elsewhere,
    );
    expect(resolveRepositoryRoot("", { SPEC_CONTROLLER_SOURCE_ROOT: "" }, elsewhere)).toBe(elsewhere);
  });
});

/**
 * Which files the walk admits (@SCN-SRC-003) — 3F-3217, under 3F-3207, closing 3F-3205.
 *
 * A DIFFERENT CLAIM FROM THE TWO ABOVE, WHICH IS WHY IT SITS UNDER A SECOND RULE. Those say which
 * TREE the population is; this says which FILES in it. Both halves have now been wrong in
 * production: the tree was the sandbox (3F-3207), and the files included a build artefact
 * (3F-3205) — a failed build left a stray `checkTree.d.ts` under `tests/checks/` and the population
 * read 111 where the tree held 110. A declaration carries no implementation, so a check that
 * examined it found nothing wrong and reported a clean file it had no business reading.
 *
 * THE TREE IS REAL, NOT HAND-SEEDED (evidence-manifesto.md §11A), for the same reason the arm above
 * copies the engine rather than typing out a `CollectedFile[]`: the WALK is the subject, and a
 * hand-built list is the one thing that proves nothing about it. Two files are written to disk and
 * the collector is asked to find them.
 *
 * `.d.ts` IS THE WHOLE OF THE KNOWN SURFACE, AND THE ARM ASSERTS THE ONE FORM RATHER THAN A LIST.
 * `.d.mts` never entered the population in the first place, because `"x.d.mts".endsWith(".ts")` is
 * false — four tracked `.d.mts` declaration files sit under `tests/checks/` today and none of them
 * is among the 96. Widening the filter past `.d.ts` would be guessing at a surface nothing has
 * measured.
 *
 * WHAT THIS DOES NOT CLOSE. 3F-3205 also asked that a build artefact under a scanned root not be
 * able to move a number silently. Half of that holds: core-src and domain are pinned exactly, so
 * inflation there reds. The whole-repository population keeps a floor and no exact pin, so a stray
 * file of some OTHER kind still moves a number nothing reads back. This closes the `.d.ts` route
 * into that population and states the rest rather than engineering it away.
 */
describe("[SCN-SRC-003] a declaration file is not production source", () => {
  it("collects the implementation file and refuses the .d.ts declaration beside it", () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "spec-controller-declarations-")));
    temporaryRoots.push(root);
    writeFileSync(join(root, "a.ts"), "export const a = 1;\n");
    writeFileSync(join(root, "a.d.ts"), "export declare const a: number;\n");

    expect(collectSourceFiles(root, root).map((file) => file.path)).toEqual(["a.ts"]);
  });
});
