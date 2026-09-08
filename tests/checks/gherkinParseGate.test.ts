/**
 * @SCN-GPG-002 (3F-2972) — the ONE planted-violation arm of the parse gate at the STATIC
 * CHECKS' edge (3F-3225 / 3F-3218): one rigged corpus carrying every violation kind this gate
 * detects, and ONE expect over the whole verdict both checks leave behind.
 *
 * The sibling scenario (@SCN-GPG-001) proved the shared discovery REFUSES. What is proven here
 * is the one thing that refusal cannot decide for itself: how a check that inherits it BEHAVES
 * at its edge — the status it leaves behind and the sentence it prints. A thrown error would
 * satisfy the discovery's scenario perfectly well and still reach the operator as a stack trace
 * under Node's own exit 1, which is the verdict status. That is the gap this arm closes.
 *
 * A REFUSAL IS NOT A VERDICT (non-negotiable 4). Exit 1 is these checks' finding-bearing verdict;
 * exit 2 is this repository's status for an input the tool cannot read (@SCN-CLI-014/015/016). So
 * the pin is not merely "non-zero": it is 2 AND NOT 1, and the CONTROL columns earn the
 * distinction by showing the same check answering 1 over a corpus it can read.
 *
 * THE CONTROL IS INSIDE THE ONE ASSERTION, not beside it as a second arm. `refusalVerdict: null`
 * standing next to `controlVerdict: "lint: FAILED"` is what makes "reports no verdict" a
 * WITHHOLDING rather than a check that had nothing to say — and it is also what proves the
 * VERDICT reader fires at all, so the null is a measured absence rather than a silent instrument.
 *
 * The parser's words are measured against the parser — `parseErrorsIn` over the same source —
 * never against a string typed in here, so a paraphrase at the edge cannot pass.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { parseErrorsIn } from "../../packages/spec-controller/src/ingest/gherkinValidation.js";
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

/**
 * Write a throwaway corpus and return its root. `a-readable.feature` sorts first under
 * `readdirSync().sort()`, so a check that scanned what it could read before it hit trouble
 * would scan exactly the file that earns a finding.
 */
function writeCorpus(files: readonly (readonly [string, string])[]): string {
  const root = mkdtempSync(join(tmpdir(), `scn-gpg-002-${process.pid}-`));
  mkdirSync(join(root, "features"), { recursive: true });
  for (const [name, source] of files) {
    writeFileSync(join(root, "features", name), source);
  }
  return root;
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

/** The refusal's opening sentence, as `UnreadableFeatureCorpusError` renders it. */
const REFUSAL_SENTENCE = "The feature corpus contains a file that could not be parsed as Gherkin:";

/**
 * Everything one check leaves behind over BOTH corpora, as one value.
 *
 * The verdict is reported as the matched STRING or null rather than as a boolean, so an absent
 * verdict and an unread one are told apart at the reader's return value — a `false` from a
 * regex nobody could see fire would be the same shape as a genuine withholding.
 */
function verdictOf(check: () => void): Record<string, unknown> {
  const riggedRoot = writeCorpus([
    ["a-readable.feature", READABLE],
    ["b-unreadable.feature", UNREADABLE],
  ]);
  const unreadable = join(riggedRoot, "features", "b-unreadable.feature");
  const refusal = runOver(riggedRoot, check);
  const control = runOver(writeCorpus([["a-readable.feature", READABLE]]), check);

  return {
    refusalExit: refusal.exitCode,
    refusalEscaped: refusal.escaped,
    refusalNamesTheUnreadableFile: refusal.output.includes(unreadable),
    refusalCarriesTheParsersOwnWords: refusal.output.includes(
      parseErrorsIn(unreadable, UNREADABLE)[0]!.message
    ),
    refusalOpensWithTheRefusalSentence: refusal.output.includes(REFUSAL_SENTENCE),
    refusalPrintsStackFrames: /^\s+at\s/m.test(refusal.output),
    refusalVerdict: VERDICT.exec(refusal.output)?.[0] ?? null,
    controlExit: control.exitCode,
    controlVerdict: VERDICT.exec(control.output)?.[0] ?? null,
  };
}

/** What a check that refuses an unreadable corpus, and answers a readable one, leaves behind. */
const REFUSES_AND_ANSWERS = {
  refusalExit: 2,
  refusalEscaped: undefined,
  refusalNamesTheUnreadableFile: true,
  refusalCarriesTheParsersOwnWords: true,
  refusalOpensWithTheRefusalSentence: true,
  refusalPrintsStackFrames: false,
  refusalVerdict: null,
  controlExit: 1,
  controlVerdict: "lint: FAILED",
};

describe("[SCN-GPG-002] a static check over an unparseable corpus refuses, and reports no verdict", () => {
  it("[SCN-GPG-002] refuses with the unreadable-input status, names the file in the parser's own words as a sentence, and withholds the verdict the readable file beside it earns", () => {
    const verdict = Object.fromEntries(CHECKS.map((c) => [c.name, verdictOf(c.run)]));

    expect(verdict).toEqual({
      "lint:feature-codes": REFUSES_AND_ANSWERS,
      "lint:scn-tags": REFUSES_AND_ANSWERS,
    });
  });
});
