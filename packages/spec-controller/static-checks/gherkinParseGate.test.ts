/**
 * @SCN-GPG-002 (3F-2972) — the @unit arm of the parse gate at the STATIC CHECKS' edge.
 *
 * The sibling scenario (@SCN-GPG-001) proved the shared discovery REFUSES. What is proven here
 * is the one thing that refusal cannot decide for itself: how a check that inherits it BEHAVES
 * at its edge — the status it leaves behind and the sentence it prints. A thrown error would
 * satisfy the discovery's scenario perfectly well and still reach the operator as a stack trace
 * under Node's own exit 1, which is the verdict status. That is the gap this arm closes.
 *
 * A REFUSAL IS NOT A VERDICT (non-negotiable 4). Exit 1 is these checks' finding-bearing verdict;
 * exit 2 is this repository's status for an input the tool cannot read (@SCN-CLI-014/015/016). So
 * the pin is not merely "non-zero": it is 2 AND NOT 1, and the control run below earns the
 * distinction by showing the same check answering 1 over a corpus it can read.
 *
 * THE CORPUS IS RIGGED TO BE ANSWERABLE. Beside the file the parser rejects sits one it accepts
 * that WOULD earn each check a finding of its own — an unregistered feature code for one, a
 * tier-less @SCN for the other. Without it "reports no verdict" would pass over a check that had
 * nothing to say anyway; with it, a check that scanned the readable half says something specific
 * and this arm names that something and refuses it.
 *
 * The parser's words are measured against the parser — `parseErrorsIn` over the same source —
 * never against a string typed in here, so a paraphrase at the edge cannot pass.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { parseErrorsIn } from "../src/ingest/gherkinValidation.js";
import { runFeatureCodesLint } from "./lintFeatureCodesCli.js";
import { runScnTagsLint } from "./lintScnTagsCli.js";

/**
 * A well-formed file BOTH checks would red over: `ZZZ` is in no registry (feature-codes), and
 * its @SCN scenario names no evidence tier and is not parked (scn-tags).
 */
const READABLE = `@ZZZ
Feature: a readable file each check would have something to say about

  @SCN-ZZZ-001
  Scenario: it names an unregistered feature code and no evidence tier
    Given a thing
`;

/** A tag line carrying whitespace inside the tag — cucumber's own parser rejects the file. */
const UNREADABLE = `@ZZZ
Feature: beta

  @unit @SCN-ZZZ-002 x
  Scenario: beta works
    Given another thing
`;

/** The corpus root and the unreadable file's path within it. */
interface Corpus {
  root: string;
  unreadable: string;
}

/**
 * Write a throwaway corpus. `readable` first by `readdirSync().sort()`, so a check that scanned
 * what it could read before it hit trouble would scan exactly the file that earns a finding.
 */
function writeCorpus(files: readonly (readonly [string, string])[]): Corpus {
  const root = mkdtempSync(join(tmpdir(), `scn-gpg-002-${process.pid}-`));
  mkdirSync(join(root, "features"), { recursive: true });
  for (const [name, source] of files) {
    writeFileSync(join(root, "features", name), source);
  }
  return { root, unreadable: join(root, "features", "b-unreadable.feature") };
}

/** A rigged corpus: one file the parser rejects, beside one it accepts. */
function riggedCorpus(): Corpus {
  return writeCorpus([
    ["a-readable.feature", READABLE],
    ["b-unreadable.feature", UNREADABLE],
  ]);
}

/** The control: the readable file alone, which every check can read and must answer over. */
function readableCorpus(): Corpus {
  return writeCorpus([["a-readable.feature", READABLE]]);
}

/** `process.exit` raised as a value the harness can read, since the real one never returns. */
class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

/** What a check left behind: its status, what it said, and anything that ESCAPED it. */
interface Outcome {
  exitCode: number | undefined;
  output: string;
  escaped: unknown;
}

/**
 * Run one check over `root` as its corpus, capturing what it says and the status it leaves.
 *
 * The corpus is steered by the WORKING DIRECTORY, which is how both checks default it and how
 * the @integration arm steers the real processes — not by a flag one of them does not have.
 */
function runOver(root: string, check: () => void): Outcome {
  const said: string[] = [];
  const capture = (...parts: unknown[]): void => void said.push(parts.map(String).join(" "));
  const spies = [
    vi.spyOn(process, "cwd").mockReturnValue(root),
    vi.spyOn(console, "log").mockImplementation(capture),
    vi.spyOn(console, "error").mockImplementation(capture),
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new ExitSignal(code ?? 0);
    }) as never),
  ];

  let exitCode: number | undefined;
  let escaped: unknown;
  try {
    check();
  } catch (err) {
    if (err instanceof ExitSignal) exitCode = err.code;
    else escaped = err;
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
  return { exitCode, output: said.join("\n"), escaped };
}

/** The two checks the Examples table names, each steered by its own corpus the same way. */
const CHECKS = [
  { name: "lint:feature-codes", run: (): void => runFeatureCodesLint() },
  { name: "lint:scn-tags", run: (): void => runScnTagsLint([]) },
] as const;

/** A verdict of either kind: the clean bill, or the finding list. Neither may survive a refusal. */
const VERDICT = /lint: (OK|FAILED)/;

describe("[SCN-GPG-002] a static check over an unparseable corpus refuses, and reports no verdict", () => {
  for (const check of CHECKS) {
    describe(check.name, () => {
      it("refuses the corpus instead of reporting on it", () => {
        const { exitCode } = runOver(riggedCorpus().root, check.run);

        expect(exitCode).toBe(2);
      });

      it("names the unreadable file and carries the parser's own words", () => {
        const corpus = riggedCorpus();
        const { output } = runOver(corpus.root, check.run);

        expect(output).toContain(corpus.unreadable);
        expect(output).toContain(parseErrorsIn(corpus.unreadable, UNREADABLE)[0]!.message);
      });

      it("says so as a sentence, not as a stack trace", () => {
        const { output, escaped } = runOver(riggedCorpus().root, check.run);

        // An error that ESCAPES is the stack trace: Node prints the frames itself and exits 1.
        expect(escaped).toBeUndefined();
        expect(output).not.toMatch(/^\s+at\s/m);
        expect(output).toContain(
          "The feature corpus contains a file that could not be parsed as Gherkin:"
        );
      });

      it("reports no verdict about the corpus it could not read", () => {
        const { exitCode, output } = runOver(riggedCorpus().root, check.run);

        // The refusal is this assertion's PREMISE: a check that crashed would also print no
        // verdict, and this arm would then be reading a silence rather than a withholding.
        expect(exitCode).toBe(2);
        expect(output).not.toMatch(VERDICT);
      });

      it("is told apart from a finding, which the same check answers with over a corpus it can read", () => {
        // The vacuity floor: without this, "no verdict" would pass over a check with nothing
        // to say. The readable file earns a real finding, and the refusal withheld it.
        const control = runOver(readableCorpus().root, check.run);
        const refusal = runOver(riggedCorpus().root, check.run);

        expect(control.output).toMatch(/lint: FAILED/);
        expect(control.exitCode).toBe(1);
        expect(refusal.exitCode).toBe(2);
        expect(refusal.exitCode).not.toBe(control.exitCode);
      });
    });
  }
});
