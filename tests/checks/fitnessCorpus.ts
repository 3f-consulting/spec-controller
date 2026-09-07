/**
 * THE FITNESS-CORPUS GENERATOR — one `@fitness` scenario per configured row (3F-3164, under
 * 3F-3139).
 *
 * A converted fitness check is three things: an axis tag, an `@SCN`, and a command. Two of the
 * three already live in `specController.fitnessChecks`; the third used to be typed by hand into a
 * feature file beside them, which is two authoring surfaces for one fact and a standing invitation
 * for them to disagree. This module removes the second: the rows are the definition, and the corpus
 * is emitted from them.
 *
 * ═══ THE CODE IS STORED, NEVER POSITIONAL — the one decision the whole mint rests on ═══
 *
 * The `@SCN` is read OFF the row (`scn: "SCN-FIT-001"`) and never derived from where the row sits.
 * A positional code would renumber every citation the moment a row was inserted, which is the
 * opposite of what minting a stable identifier is for — and it would make the migration's own
 * mapping table a fiction after the first edit. Adding a row means choosing the next free `FIT`
 * number; this generator is then a pure function of the configuration.
 *
 * The corpus this emits today shows the rule rather than stating it: `SCN-FIT-002` is the
 * THIRTEENTH scenario in the file, not the second, because its row was authored last — it was
 * minted at 3F-3168 for a check that had carried `SCN-MUT-011` since long before any of the
 * others, and the row kept its place rather than its number moving. A positional generator would
 * have renumbered eleven scenarios to seat it.
 *
 * ═══ CHECKED IN, NOT BUILT AT CI TIME, AND GUARDED RATHER THAN TRUSTED ═══
 *
 * The corpus is the DEFINITION, and a definition that only exists inside a pipeline cannot be read
 * or reviewed. So the emitted file is committed — and a generated file that has drifted from its
 * source is the watermelon in a new costume, so `regenerate && git diff --exit-code` runs on every
 * pass. That guard is ITSELF a `specController.fitnessChecks` row (`SCN-FIT-014`), so the mechanism
 * polices itself through the mechanism rather than through a bespoke gate standing beside it.
 *
 * ═══ IT READS THE PRODUCT'S OWN TWO READERS, AND ADDS NO THIRD ═══
 *
 * The debit side's reader (`fitnessChecksAt` → characteristic + bar) and the command side's
 * (`fitnessCommandsAt` → command + `notExaminedExit`) already answer everything a scenario needs.
 * Reading the manifest a third way here would be a generator free to disagree with the ledger about
 * what a row says — a corpus asserting `complexity` for a row the ledger reads as `vocab` is
 * precisely the drift the guard exists to catch, arriving from inside the guard.
 *
 * WHICH READER DECIDES A SCENARIO EXISTS IS THE DEBIT SIDE'S, deliberately. A row naming a scenario
 * and a characteristic but no command still OWES its check — so it gets a scenario, and the pass
 * reds it at the person with "no row of specController.fitnessChecks names this scenario, so there
 * is no command to run". Emitting from the command side instead would make a half-written row
 * silently absent from the corpus, which is a check nobody is told they lost.
 *
 * WHICH SENTENCE A SCENARIO CARRIES IS THE ROW'S SHAPE, through `carriesBar` — the ONE spelling of
 * "is this check measured" that the obligation rule and the credit reader also ask. A row with a bar
 * gets the measured sentence and a row without gets the static one, so the corpus cannot come to
 * disagree with the ledger about which kind of evidence a check produces.
 *
 * Parent: 3F-3139.
 */

/**
 * WHY IT IS A CHECK RATHER THAN PROTOCOL (3F-3198). It writes a file, which is the shape 3F-3190's
 * discriminator sends to the product — but the file is THIS repository's own corpus, emitted from
 * THIS repository's own manifest, and its output is an authored artefact of the tree rather than a
 * target's evidence. A target generating its corpus this way would be running its own copy of this
 * generator over its own rows, not calling ours.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { carriesBar, type FitnessCheckIndex } from "@3f-consulting/spec-controller-core/internal";

import {
  fitnessChecksAt,
  fitnessCommandsAt,
  type FitnessCommandIndex,
} from "./fitnessCommand.js";

/** Where the generated corpus lives, relative to the tree it is generated for. */
export const FITNESS_CORPUS_PATH = path.join("features", "fitness-checks.feature");

/** The feature code the emitted file's header tag carries — registered in `featureCodes.ts`. */
export const FITNESS_CORPUS_FEATURE_CODE = "FIT";

/**
 * The sentence a STATIC row's scenario carries — @SCN-LNT-023's step, verbatim.
 *
 * IT IS THE SAME SENTENCE IN EVERY TARGET, and that is what holds the step-definition count at two
 * however many rows arrive. A generator that varied the wording per characteristic would need a
 * step definition per characteristic, which is the cost this whole design exists to remove.
 */
const STATIC_SENTENCE = "Then the check this scenario names finds no violations";

/** The sentence a MEASURED row's scenario carries — @SCN-LNT-024's step, verbatim. */
const MEASURED_SENTENCE = "Then the check this scenario names reports its measurement";

/**
 * The emitted file's header — everything above the first scenario.
 *
 * IT SAYS WHERE TO EDIT INSTEAD, WHICH IS THE ONE THING A GENERATED FILE OWES ITS READER. A person
 * who has just found a wrong command in here will otherwise fix it here, and their fix will
 * survive exactly until the next regeneration.
 *
 * NO LINE MAY BEGIN WITH A GHERKIN KEYWORD OR AN `@`. Free text under `Feature:` ends at the first
 * line that opens one — so a wrapped sentence starting `Scenario` would truncate the description
 * and orphan the rest, and a wrapped line starting `@` is a tag line the lexer splits at every `@`
 * it finds.
 */
const HEADER = `@${FITNESS_CORPUS_FEATURE_CODE}
Feature: The fitness checks this repository configures, one scenario per row

  GENERATED FILE — DO NOT EDIT. Every scenario below is emitted from a row of
  \`specController.fitnessChecks\` in package.json. Edit the row, then regenerate with
  \`pnpm fitness:corpus\`; an edit made here is reverted the next time anybody does.

  WHY THE SCENARIOS EXIST AT ALL, given the rows already carry everything. A check reports its
  findings and says nothing when it finds none, so its silence cannot be told from its absence.
  Cucumber reports every scenario it ran, pass or fail — that enumeration is what the fitness axis
  was missing, and these scenarios are how a configured check acquires it. Reading the rows alone
  would put the axis back to single-entry.

  THE CODE IS STORED, NEVER POSITIONAL. Each scenario's \`@SCN\` is read off its row, so inserting a
  row renumbers nothing and every citation elsewhere in the tree stays true. The numbering below is
  not contiguous for that reason, and that is the rule working rather than a gap.

  A ROW MAY ALSO CARRY A CODE MINTED UNDER ANOTHER FEATURE, and that is the same rule. A code, once
  allocated, is stable forever: it survives a feature-file rename and is never reused. A check whose
  code is cited by something outside this repository's corpus — a nightly producer's sweep record,
  say — therefore keeps that code while its scenario moves here, and is re-minted only by the change
  that can move every citing surface with it.

  THE TAG NAMES THE AXIS AND THE ROW NAMES THE SUBJECT. Every scenario here carries \`@fitness\` and
  no characteristic tag: which characteristic a check asserts, and which bar it is held to, are read
  from its row by the ledger. One sentence for a static check and one for a measured one, so the
  step-definition count is two however many rows arrive.

  THE FITNESS PASS RUNS LAST, AND THAT IS LOAD-BEARING RATHER THAN CONVENTIONAL. Reader-shaped rows
  read what an earlier step produced — a mutation sweep's record, the behavioural suite's timing —
  so a pipeline that runs this pass first meets absent artefacts and a wall of unsettled rows while
  doing exactly what it was told.

  THIS FILE IS ITS OWN GUARD. One row below runs the generator and diffs the result, so a corpus
  that has drifted from the rows it came from reds the pass it is part of.
`;

/**
 * One row's scenario title — the two things that vary between two rows, and nothing else.
 *
 * THE COMMAND IS IN THE TITLE BECAUSE IT IS WHAT A READER OF THE REPORT WANTS. The step text is the
 * same sentence for every static row in every target, so a report listing twelve of them tells the
 * reader nothing about which check spoke; the characteristic and the command between them do.
 *
 * WHITESPACE IS COLLAPSED because a title is one line by construction and a command carrying a
 * newline would otherwise emit a corpus the parser cannot read — a generator's own output being the
 * thing that breaks the gate that reads it.
 *
 * A ROW WITH NO COMMAND STILL GETS A TITLE. Its scenario exists (the check is owed), the pass is
 * what says the command is missing, and a title inventing one would put the generator in the
 * business of covering for the manifest.
 */
export function fitnessScenarioTitle(characteristic: string, command: string | undefined): string {
  if (command === undefined) return characteristic;
  return `${characteristic} — \`${command.replace(/\s+/g, " ").trim()}\``;
}

/**
 * The whole corpus, as text, from the two indexes the product already reads its rows through.
 *
 * PURE, AND ITS TWO INPUTS ARE THE PRODUCT'S OWN. Everything that decides what comes out is in the
 * rows: the order (the manifest's), the codes (each row's own), the sentences (each row's shape).
 * So regeneration is deterministic, and the guard's `git diff` means what it says.
 */
export function fitnessCorpusOf(
  checks: FitnessCheckIndex,
  commands: FitnessCommandIndex,
): string {
  const scenarios = [...checks].map(([scnId, check]) => {
    const title = fitnessScenarioTitle(check.characteristic, commands.get(scnId)?.command);
    const sentence = carriesBar(check) ? MEASURED_SENTENCE : STATIC_SENTENCE;
    return `\n  @fitness @${scnId}\n  Scenario: ${title}\n    ${sentence}\n`;
  });
  return HEADER + scenarios.join("");
}

/** The corpus this tree's manifest asks for, read through the same two readers the pass uses. */
export function fitnessCorpusAt(root: string): string {
  return fitnessCorpusOf(fitnessChecksAt(root), fitnessCommandsAt(root));
}

/**
 * Emit the corpus, and say whether the file on disk changed.
 *
 * THE WRITE IS UNCONDITIONAL AND THE ANSWER IS COMPARED SEPARATELY, so the guard's `git diff` is
 * what reports drift rather than this function's opinion. A writer that skipped an identical write
 * would be a second arbiter of the same fact, and the two would eventually disagree about a file
 * something else had touched between the read and the write.
 */
export function writeFitnessCorpus(root: string): boolean {
  const target = path.join(root, FITNESS_CORPUS_PATH);
  const emitted = fitnessCorpusAt(root);
  let existing: string | null = null;
  try {
    existing = readFileSync(target, "utf8");
  } catch {
    existing = null;
  }
  writeFileSync(target, emitted);
  return existing !== emitted;
}

/** The `--root <dir>` this run generates for, or the working directory. */
function rootArg(argv: readonly string[]): string {
  const at = argv.indexOf("--root");
  const named = at === -1 ? undefined : argv[at + 1];
  return named !== undefined && named !== "" && !named.startsWith("--") ? named : ".";
}

/** Generate the corpus for the named tree, saying on stdout what it did. */
export function runFitnessCorpus(argv: readonly string[]): void {
  const root = rootArg(argv);
  const changed = writeFitnessCorpus(root);
  process.stdout.write(
    `fitness corpus: ${changed ? "rewritten" : "unchanged"} — ${path.join(root, FITNESS_CORPUS_PATH)}\n`,
  );
}

// Run only when invoked as the script, so the pure helpers above can be imported without a file
// being written as a side effect of the import (the lintScnSubIssuesCli convention).
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) runFitnessCorpus(process.argv.slice(2));
