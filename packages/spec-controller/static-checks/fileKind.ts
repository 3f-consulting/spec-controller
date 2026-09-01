/**
 * What kind of file is this path? — the audit's file-kind decision, stated once (3F-2979).
 *
 * It used to sit module-private inside `vocabAudit.ts`, which is why it is worth saying what it
 * is NOT. It is not part of the audit engine: it reads no content, consults no word set, and
 * reaches no verdict. It answers a question about a PATH, and the engine then chooses how to
 * segment the file that path names. Two responsibilities that happened to share a module.
 *
 * WHY IT MOVED, AND WHY THAT REASON IS ON THE RECORD RATHER THAN IN A COMMIT MESSAGE.
 * `vocabAudit.ts` sat at exactly its recorded `max-lines` ceiling of 508 with zero headroom, so
 * the sibling slice's one-line predicate could not land without redding the complexity ratchet —
 * and the ratchet's rule is *never edit the entry up; an exception buys no headroom*. The two
 * honest routes are line-neutral or bank an improvement. This is the second: the decision that
 * did not belong here leaves, the entry is banked DOWN to the new measurement, and the next
 * change spends headroom that was earned rather than granted. Buying room by editing the
 * exception up would be the gate certifying the growth it exists to catch.
 *
 * The move is behaviour-preserving, and PROVING that needed a better test than the obvious one.
 * "The artefacts are byte-identical across the move" is the check you reach for first, and it is
 * wrong here: the audit scans its own source tree, so moving a function necessarily shifts the
 * moved file's row line-numbers and adds the new file's own rows. Taken at face value it would
 * have failed a correct move — or, worse, been weakened until it went green. What was checked
 * instead: every UNTOUCHED file identical row for row (15 205 rows), `vocabAudit.ts`'s own 63
 * rows identical modulo line number, and the two rows the move adds both the path artefact
 * `controller` that every file under `packages/spec-controller/` already contributes.
 */

/** What the audit takes a path to be — which decides how its content is segmented. */
export type FileKind = "feature" | "steps" | "render-ts" | "ts" | "json" | "yaml" | "docs" | "other";

/**
 * Is this path a MODULE — something the engine should lex as code rather than read as prose?
 * (@SCN-VOC-022, 3F-2434)
 *
 * Stated as a KIND, not as a list of extensions, and that is the whole of the fix. The three
 * tests this replaced each asked `endsWith(".ts")`, which is a question about SPELLING: `.mts`
 * does not end with `.ts`, so every ambient type file this repository ships fell past every
 * code branch — and past every data branch too — to the final `else`, and was judged as English.
 * Ten real source files, five `.d.mts` and the five `.mjs` beside them.
 *
 * It is a watermelon generator, which is the reason worth keeping. The two paths judge
 * differently, so a rule could look PROVEN against `.d.mts` evidence while being unreachable in
 * the file kind it was written for — which is exactly what happened to @SCN-VOC-018's `follows`
 * qualifier, greened for months by thirteen sites that were never read as TypeScript at all.
 *
 * WHAT THIS REACHES AND WHAT THE EVIDENCE EXERCISES ARE NOT THE SAME SET. The pattern covers
 * `.cts`, `.cjs` and `.js` by construction; this tree carries no `.cts` or `.cjs`, so the arms
 * exercise the three that exist rather than manufacturing a fixture whose only purpose is to
 * make the list look complete. A branch asserted over an empty set greens by having nothing to
 * judge. The gap is named here and in the Rule preamble rather than papered over.
 *
 * The `.d.*` forms need no clause of their own: `foo.d.mts` ends with `.mts`, so a suffix test
 * catches every one of them for free.
 */
const MODULE_EXTENSION = /[.][mc]?[tj]s$/;

/**
 * A path's kind, and whether it is fixture material.
 *
 * `fixture` is separate from `kind` on purpose: a fixture `.ts` file is still segmented as
 * TypeScript, it just reports on the fixtures surface. Folding the two would make a fixture a
 * KIND and lose the segmentation that makes its findings comparable to real source.
 */
export function classifyPath(relPath: string): { kind: FileKind; fixture: boolean } {
  const p = relPath.replace(/\\/g, "/");
  const base = p.split("/").pop() ?? p;
  const fixture =
    p.includes("tests/fixtures/") || p.startsWith("runs/") || /golden|snapshot/i.test(p);
  let kind: FileKind = "other";
  if (p.endsWith(".feature")) kind = "feature";
  else if (p.includes("tests/steps/") && MODULE_EXTENSION.test(p)) kind = "steps";
  else if ((p.includes("src/render/") || p.includes("src/output/")) && MODULE_EXTENSION.test(p)) kind = "render-ts";
  else if (MODULE_EXTENSION.test(p)) kind = "ts";
  else if (base === "package.json") kind = "docs";
  else if (p.endsWith(".json")) kind = "json";
  else if (p.endsWith(".yml") || p.endsWith(".yaml")) kind = "yaml";
  else if (p.endsWith(".md") || base === "README.md" || p.startsWith("doc/")) kind = "docs";
  return { kind, fixture };
}
