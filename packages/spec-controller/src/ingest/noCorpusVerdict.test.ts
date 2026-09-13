/**
 * @unit for @SCN-CLI-018 — the three shapes "no corpus" comes in reach ONE verdict, by ONE
 * sentence, and that sentence names the corpus directory it examined.
 *
 * WHAT IS ACTUALLY VARIED HERE IS THE DIRECTORY ON DISK, and nothing else. Three real target roots
 * go through the SAME reader (`runReconcile`) and the SAME renderer, with a run context that
 * supplies no `--features` in any of them — a consumer's first invocation. So the one thing that
 * can move the verdict line is the corpus the reader found, which is the claim.
 *
 * IT COMPARES THE RUNS AGAINST EACH OTHER, NEVER AGAINST A SENTENCE WRITTEN HERE. An expected
 * verdict transcribed into this file is a second copy of the renderer's wording — it drifts the day
 * someone rewords the gloss, and it greens while all three are wrong in the same way. Sameness on
 * its own, though, is satisfied by three identical SILENCES, so exactly one arm below adds the
 * positive pin: the shared sentence names the corpus directory. The literal that pin uses is
 * `CORPUS_DIR`, which is what BUILDS the fixtures — a fact about the targets, not a transcription.
 *
 * THE @e2e HALF IS THE ONE THAT REACHES SHAPE 1 AS A CONSUMER MEETS IT (tests/steps/cliBalance.steps.ts):
 * the absence there is on the DEFAULT corpus path, so it needs a process standing in a directory
 * with no `features/`, which a Vitest worker cannot produce (`process.chdir` throws). This arm
 * reaches the same three shapes by handing the reader the path directly, which is the same fact one
 * layer in — and it is the layer where the RENDERED SENTENCE can be read off three runs at once.
 *
 * IT IS ITS OWN FILE for absentFeatureCorpus.test.ts's reason, one door along: this is the
 * composition — reader plus renderer — rather than the reader's own translation, and
 * ingestQualityChecks.test.ts is at 650 lines against a 400-line ceiling exception.
 *
 * Bidirectional evidence: the describe carries the SCN-CLI-018 id matching
 * features/cli-balance.feature.
 */

import { describe, it, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderMarkdown, type RunContext } from "@3f-consulting/spec-controller-core";

import { runReconcile } from "./ingestQualityChecks.js";

/** The corpus directory every target uses — the DEFAULT, unsupplied, which is why all three name
 * the same one. It builds the fixtures AND is the literal the naming pin asserts, so that pin is
 * derived from the targets rather than transcribed from the renderer. */
const CORPUS_DIR = "features";

/** One of the three shapes a target with nothing declared comes in, as a real directory on disk. */
interface Shape {
  shape: string;
  build: (root: string) => void;
}

/** The modal `new-client`: the corpus directory was never created. */
const NO_CORPUS_DIRECTORY: Shape = { shape: "no corpus directory", build: () => {} };

/** A corpus directory that exists and holds nothing. */
const EMPTY_CORPUS: Shape = {
  shape: "an empty corpus",
  build: (root) => mkdirSync(join(root, CORPUS_DIR)),
};

/** A corpus directory holding a feature file that declares no scenario. NOT an untagged scenario,
 * which is a different fact about the target — something WAS declared there, and it is owed an
 * @SCN. This file declares nothing for anything to be owed. */
const CORPUS_DECLARING_NOTHING: Shape = {
  shape: "a corpus declaring no scenario",
  build: (root) => {
    mkdirSync(join(root, CORPUS_DIR));
    writeFileSync(
      join(root, CORPUS_DIR, "target.feature"),
      "Feature: a corpus that declares nothing\n\n  Prose only. No scenario is declared in this file.\n"
    );
  },
};

/** Build one shape's target root — a GUARDLESS manifest and no evidence report in every one, so the
 * CORPUS is the only thing that differs. A running static check would post an uncited credit and
 * give the run a suspense row, which is @SCN-CLI-020's shape rather than this one's. */
function targetFor({ build }: Shape): string {
  const root = mkdtempSync(join(tmpdir(), `scn-cli-018-${process.pid}-`));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "new-client-target", scripts: {} })
  );
  build(root);
  return root;
}

/** Reconcile and render one shape exactly as `balance` does, and return the run-verdict headline
 * line — the ONE line this scenario compares, as a reader meets it. */
function verdictFor(target: Shape): string {
  const root = targetFor(target);
  const balance = runReconcile({
    features: join(root, CORPUS_DIR),
    packageJson: join(root, "package.json"),
    // `--ci` POINTED AT THE TARGET'S OWN ROOT, which holds no workflow. The flag defaults to
    // `.github/workflows`, so a reconcile that omits it reads THIS repository's pipeline; since
    // @SCN-USG-004 made every step of it a candidate, that default would put this repository's
    // checks on a synthetic target's ledger and give three empty corpora a suspense row apiece.
    // The omission used to be isolated by accident — a prefix rule found nothing in those
    // workflows for a manifest with no scripts — and an accident is not isolation.
    ci: root,
  });
  // NOTHING SUPPLIED — `inputs` is empty, so the corpus is the DEFAULT and the renderer has to say
  // so from the provenance it already carries. Each shape keeps its OWN root as the target, which
  // is honest and is also the discriminator: a naming built from the resolved absolute path would
  // hand the three runs three different sentences.
  const ctx: RunContext = {
    target: root,
    inputs: {},
    runStart: new Date("2026-09-12T09:00:00.000Z"),
    sourceSha: null,
  };
  const line = renderMarkdown(balance, ctx).match(/^\*\*.+\*\* — .*\(exit \d+\)$/m)?.[0];
  expect(line, `expected a run-verdict headline for the target with ${target.shape}`).toBeTypeOf(
    "string"
  );
  return line ?? "";
}

describe("[SCN-CLI-018] absent, empty and scenario-less corpora are one answer, told by one sentence", () => {
  // Recomputed per arm rather than hoisted into the describe body, so a shape that stops producing
  // a verdict at all reds the arm that asked for it and names it — hoisted, one throw takes the
  // file down as a collection error and the population it broke is left to be inferred.
  const absent = () => verdictFor(NO_CORPUS_DIRECTORY);

  it("has genuinely built the absent shape rather than an empty one", () => {
    // The fixture invariant as its own arm: a target whose corpus directory EXISTS is a different
    // shape, and a builder that quietly created it would sit green through the fault this file is
    // named for. `targetFor` is the only creator, so proving it once proves the population.
    expect(existsSync(join(targetFor(NO_CORPUS_DIRECTORY), CORPUS_DIR))).toBe(false);
  });

  it("tells a target whose corpus is empty exactly what it tells one with no corpus directory", () => {
    // COMPARED AGAINST THE OTHER RUN, never against a sentence written here. "Absent and empty are
    // the same answer, not two" is a claim about the runs agreeing, and that is what is read.
    expect(verdictFor(EMPTY_CORPUS)).toBe(absent());
  });

  it("tells a target whose corpus declares no scenario the same thing again", () => {
    expect(verdictFor(CORPUS_DECLARING_NOTHING)).toBe(absent());
  });

  it("names the corpus directory it examined", () => {
    // THE POSITIVE PIN, once, on the sentence the arms above establish is shared. Three identical
    // silences satisfy sameness; only this says the report told the reader WHERE it looked — the
    // rule this repository already applies to the mutation record (3F-2947) reaching the corpus:
    // "I found no record" and "I found no regression" must never wear one word.
    expect(absent()).toContain(CORPUS_DIR);
  });
});
